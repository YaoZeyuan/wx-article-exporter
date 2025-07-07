import axios from 'axios';
import * as cheerio from 'cheerio';
import { EpubGenerator } from './library/epub/index';

interface WxAlbumInfo {
    title: string;
    author: string;
    articleCount: number;
    readCount: number;
    coverUrl?: string;
}

interface WxArticleInfo {
    title: string;
    url: string;
    createTime: number;
}

interface ExportProgress {
    total: number;
    current: number;
    errors: Array<{
        type: 'article' | 'image';
        url: string;
        error: string;
    }>;
}

export class WxArticleExporter {
    private albumUrl: string;
    private albumInfo?: WxAlbumInfo;
    private articles: WxArticleInfo[] = [];
    private progress: ExportProgress = {
        total: 0,
        current: 0,
        errors: []
    };

    constructor(albumUrl: string) {
        this.albumUrl = albumUrl;
    }

    /**
     * 获取当前进度
     */
    public getProgress(): ExportProgress {
        return { ...this.progress };
    }

    /**
     * 获取专辑信息
     */
    private async fetchAlbumInfo(): Promise<WxAlbumInfo> {
        const response = await this.fetchWithRetry(this.albumUrl);
        const html = response.data;
        const $ = cheerio.load(html);

        // 解析window.cgiData中的数据
        const scriptContent = $('script')
            // @ts-ignore
            .filter((_, elem) => $(elem).html()?.includes('window.cgiData'))
            .first()
            .html();

        if (!scriptContent) {
            throw new Error('无法获取专辑信息');
        }

        // 提取cgiData对象，匹配到window.isPaySubscribe之前

        let rawContent = scriptContent.split("window.cgiData = ")[1]


        const match = scriptContent.match(/window\.cgiData\s*=\s*({[\s\S]*?(?:continue_flag:[^,}]+,[\s\S]*?recomm_tag_page_url:[^,}]+)\s*});\s*window\.isPaySubscribe/);
        if (!match) {
            throw new Error('无法解析专辑信息');
        }

        // 清理多余的空白字符和注释
        const cgiDataStr = match[1].replace(/\s+/g, ' ').trim();
        const cgiData = JSON.parse(cgiDataStr);
        return {
            title: cgiData.title,
            author: cgiData.nick_name,
            articleCount: parseInt(cgiData.article_count),
            readCount: parseInt(cgiData.read_count),
            coverUrl: cgiData.hd_head_img
        };
    }

    /**
     * 获取文章列表
     */
    private async fetchArticleList(): Promise<WxArticleInfo[]> {
        const articles: WxArticleInfo[] = [];
        const biz = this.getBizFromUrl(this.albumUrl);
        const albumId = this.getAlbumIdFromUrl(this.albumUrl);

        let beginMsgId = '';
        let beginItemIdx = '';
        let hasMore = true;

        while (hasMore) {
            const url = `https://mp.weixin.qq.com/mp/appmsgalbum?action=getalbum&__biz=${biz}&album_id=${albumId}&count=10&begin_msgid=${beginMsgId}&begin_itemidx=${beginItemIdx}&f=json`;

            const response = await this.fetchWithRetry(url, 3, 2000);
            const data = response.data;

            if (data.base_resp.ret !== 0) {
                throw new Error(`获取文章列表失败: ${data.base_resp.ret}`);
            }

            const articleList = data.getalbum_resp.article_list;
            for (const article of articleList) {
                articles.push({
                    title: article.title,
                    url: article.url,
                    createTime: parseInt(article.create_time)
                });
            }

            hasMore = data.getalbum_resp.continue_flag === '1';
            if (hasMore && articleList.length > 0) {
                const lastArticle = articleList[articleList.length - 1];
                beginMsgId = lastArticle.msgid;
                beginItemIdx = lastArticle.itemidx;
            }
        }

        return articles;
    }

    /**
     * 从URL中提取biz参数
     */
    private getBizFromUrl(url: string): string {
        const match = url.match(/__biz=([^&]+)/);
        if (!match) {
            throw new Error('无法从URL中提取biz参数');
        }
        return match[1];
    }

    /**
     * 从URL中提取album_id参数
     */
    private getAlbumIdFromUrl(url: string): string {
        const match = url.match(/album_id=([^&]+)/);
        if (!match) {
            throw new Error('无法从URL中提取album_id参数');
        }
        return match[1];
    }

    /**
     * 获取文章内容
     */
    /**
   * 带重试机制的HTTP请求
   */
    private async fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<any> {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios.get(url);
                return response;
            } catch (error) {
                if (i === retries - 1) throw error;
                console.warn(`请求失败，${retries - i - 1}次重试机会: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    private async fetchArticleContent(url: string): Promise<{ html: string; images: Array<{ path: string; data: Buffer }> }> {
        const response = await this.fetchWithRetry(url);
        const $ = cheerio.load(response.data);
        const images: Array<{ path: string; data: Buffer }> = [];

        // 处理图片
        const imgPromises = $('img').map(async (_, elem) => {
            const src = $(elem).attr('src') || $(elem).attr('data-src');
            if (!src) return;

            try {
                const imgResponse = await this.fetchWithRetry(src, 3, 2000);
                const imgData = Buffer.from(imgResponse.data);
                const imgPath = `img_${images.length + 1}${this.getImageExtension(src)}`;
                images.push({ path: imgPath, data: imgData });
                $(elem).attr('src', imgPath);
            } catch (error) {
                console.warn(`下载图片失败: ${src}`, error);
                this.progress.errors.push({
                    type: 'image',
                    url: src,
                    error: error.message
                });
            }
        }).get();

        await Promise.all(imgPromises);

        // 清理不需要的元素和属性
        $('script').remove();
        $('*').removeAttr('class').removeAttr('style').removeAttr('id');

        return {
            html: $.html(),
            images
        };
    }

    /**
     * 获取图片扩展名
     */
    private getImageExtension(url: string): string {
        const match = url.match(/\.(jpg|jpeg|png|gif)($|\?)/);
        return match ? `.${match[1]}` : '.jpg';
    }

    /**
     * 导出为EPUB
     */
    public async exportToEpub(outputPath: string): Promise<void> {
        // 获取专辑信息
        this.albumInfo = await this.fetchAlbumInfo();
        console.log(`开始导出专辑: ${this.albumInfo.title}`);

        // 获取文章列表
        this.articles = await this.fetchArticleList();
        console.log(`共找到 ${this.articles.length} 篇文章`);

        // 创建EPUB生成器
        const generator = new EpubGenerator({
            title: this.albumInfo.title,
            author: this.albumInfo.author,
            language: 'zh-CN',
            description: `共 ${this.articles.length} 篇文章，总阅读数 ${this.albumInfo.readCount}`,
            publisher: '微信公众号',
            date: new Date().toISOString()
        });

        // 初始化进度
        this.progress = {
            total: this.articles.length,
            current: 0,
            errors: []
        };

        // 处理每篇文章
        for (let i = 0; i < this.articles.length; i++) {
            const article = this.articles[i];
            console.log(`处理文章 ${i + 1}/${this.articles.length}: ${article.title}`);

            try {
                const { html, images } = await this.fetchArticleContent(article.url);
                generator.addContent(html, images);
                this.progress.current++;
            } catch (error) {
                console.error(`处理文章失败: ${article.title}`, error);
                this.progress.errors.push({
                    type: 'article',
                    url: article.url,
                    error: error.message
                });
            }
        }

        // 生成EPUB文件
        await generator.generate(outputPath);
        console.log(`EPUB文件已生成: ${outputPath}`);
    }
}