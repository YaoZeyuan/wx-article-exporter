import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

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

interface FetchProgress {
    total: number;
    current: number;
    errors: Array<{
        type: 'article' | 'image' | 'resource';
        url: string;
        error: string;
    }>;
}

export class WxArticleFetcher {
    private albumUrl: string;
    private albumInfo?: WxAlbumInfo;
    private articles: WxArticleInfo[] = [];
    private progress: FetchProgress = {
        total: 0,
        current: 0,
        errors: []
    };
    private baseDir: string;

    constructor(albumUrl: string, baseDir: string = 'resource') {
        this.albumUrl = albumUrl;
        this.baseDir = baseDir;
    }

    /**
     * 获取当前进度
     */
    public getProgress(): FetchProgress {
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

        // 提取cgiData对象
        let rawContent = scriptContent.split("window.cgiData = ")[1];
        rawContent = rawContent.split('isPaySubscribe')[0];
        rawContent = rawContent.split('};')[0] + '}';

        // 清理多余的空白字符和注释
        const cgiData = Function('"use strict";return (' + rawContent + ')')();
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
                const rawTitle = article.title
                // 移除所有不能作为文件名的字符
                const title = rawTitle.replace(/[\\/:*?"<>|]/g, '')
                articles.push({
                    title: title,
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
     * 带重试机制的HTTP请求
     */
    private async fetchWithRetry(url: string, retries = 3, delay = 1000, isText = true): Promise<any> {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios.get(url, {
                    headers: {
                        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'cache-control': 'no-cache',
                        'dnt': '1',
                        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
                    },
                    // 如果URL以图片扩展名结尾，则设置responseType为arraybuffer
                    responseType: isText ? undefined : 'arraybuffer'
                });
                return response;
            } catch (error) {
                if (i === retries - 1) throw error;
                console.warn(`请求失败，${retries - i - 1}次重试机会: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * 下载文章内容和资源
     */
    private async fetchArticleContent(article: WxArticleInfo, articleDir: string): Promise<void> {
        const response = await this.fetchWithRetry(article.url);
        const $ = cheerio.load(response.data);

        // 创建文章目录
        fs.mkdirSync(path.join(articleDir, 'images'), { recursive: true });

        // 处理图片
        const imgPromises = $('img').map(async (_, elem) => {
            const src = $(elem).attr('data-src');
            if (!src) return;

            try {
                const imgResponse = await this.fetchWithRetry(src, 3, 2000, false);
                console.log("src => ", src)
                const imgData = Buffer.from(imgResponse.data);

                const imgName = `img_${Date.now()}${this.getImageExtension(src)}`;
                console.log("imgName => ", imgName)
                const imgPath = path.join(articleDir, 'images', imgName);
                fs.writeFileSync(imgPath, imgData);
                $(elem).attr('src', `images/${imgName}`);
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

        // 保存HTML文件
        fs.writeFileSync(path.join(articleDir, 'index.html'), $.html());
    }

    /**
     * 获取图片扩展名
     */
    private getImageExtension(url: string): string {
        const match = url.match(/(jpg|jpeg|png|gif)/);
        return match ? `.${match[1]}` : '.jpg';
    }

    /**
     * 下载所有文章内容和资源
     */
    public async fetchAll(): Promise<string> {
        // 获取专辑信息
        this.albumInfo = await this.fetchAlbumInfo();
        console.log(`开始下载专辑: ${this.albumInfo.title}`);

        // 获取文章列表
        this.articles = await this.fetchArticleList();
        console.log(`共找到 ${this.articles.length} 篇文章`);

        // 创建专辑目录
        const draftDir = path.join(this.baseDir, 'draft');
        const albumDir = path.join(draftDir, this.albumInfo.title);
        fs.mkdirSync(albumDir, { recursive: true });

        // 初始化进度
        this.progress = {
            total: this.articles.length,
            current: 0,
            errors: []
        };


        // 睡眠指定秒数
        const asyncSleep = async (second: number) => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(true);
                }, 1000 * second);
            });
        }


        // 下载每篇文章
        for (let i = 0; i < this.articles.length; i++) {
            const article = this.articles[i];
            console.log(`下载文章 ${i + 1}/${this.articles.length}: ${article.title}`);
            await asyncSleep(3)
            try {
                const articleDir = path.join(albumDir, `${i + 1}_${article.title}`);
                await this.fetchArticleContent(article, articleDir);
                this.progress.current++;
            } catch (error) {
                console.error(`下载文章失败: ${article.title}`, error);
                this.progress.errors.push({
                    type: 'article',
                    url: article.url,
                    error: error.message
                });
            }
        }

        // 保存专辑信息
        fs.writeFileSync(
            path.join(albumDir, 'album.json'),
            JSON.stringify(this.albumInfo, null, 2)
        );

        return albumDir;
    }
}