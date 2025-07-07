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

export class WxArticleExporter {
  private albumUrl: string;
  private albumInfo?: WxAlbumInfo;
  private articles: WxArticleInfo[] = [];

  constructor(albumUrl: string) {
    this.albumUrl = albumUrl;
  }

  /**
   * 获取专辑信息
   */
  private async fetchAlbumInfo(): Promise<WxAlbumInfo> {
    const response = await axios.get(this.albumUrl);
    const html = response.data;
    const $ = cheerio.load(html);
    
    // 解析window.cgiData中的数据
    const scriptContent = $('script')
      .filter((_, elem) => $(elem).html()?.includes('window.cgiData'))
      .first()
      .html();

    if (!scriptContent) {
      throw new Error('无法获取专辑信息');
    }

    // 提取cgiData对象
    const match = scriptContent.match(/window\.cgiData\s*=\s*({[\s\S]*?});/);
    if (!match) {
      throw new Error('无法解析专辑信息');
    }

    const cgiData = JSON.parse(match[1]);
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
      
      const response = await axios.get(url);
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
  private async fetchArticleContent(url: string): Promise<{ html: string; images: Array<{ path: string; data: Buffer }> }> {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const images: Array<{ path: string; data: Buffer }> = [];

    // 处理图片
    const imgPromises = $('img').map(async (_, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src');
      if (!src) return;

      try {
        const imgResponse = await axios.get(src, { responseType: 'arraybuffer' });
        const imgData = Buffer.from(imgResponse.data);
        const imgPath = `img_${images.length + 1}${this.getImageExtension(src)}`;
        images.push({ path: imgPath, data: imgData });
        $(elem).attr('src', imgPath);
      } catch (error) {
        console.warn(`下载图片失败: ${src}`, error);
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

    // 处理每篇文章
    for (let i = 0; i < this.articles.length; i++) {
      const article = this.articles[i];
      console.log(`处理文章 ${i + 1}/${this.articles.length}: ${article.title}`);

      try {
        const { html, images } = await this.fetchArticleContent(article.url);
        generator.addContent(html, images);
      } catch (error) {
        console.error(`处理文章失败: ${article.title}`, error);
      }
    }

    // 生成EPUB文件
    await generator.generate(outputPath);
    console.log(`EPUB文件已生成: ${outputPath}`);
  }
}