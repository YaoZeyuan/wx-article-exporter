// 导出EPUB库
export { EpubGenerator } from './library/epub/index';

// 导出微信文章处理类
export { WxArticleFetcher } from './WxArticleFetcher';
export { WxArticleConverter } from './WxArticleConverter';

// 导出旧版本类（已废弃）
/** @deprecated 请使用 WxArticleFetcher 和 WxArticleConverter 替代 */
export { WxArticleExporter } from './WxArticleExporter';