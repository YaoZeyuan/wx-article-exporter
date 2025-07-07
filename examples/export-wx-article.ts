import { WxArticleExporter } from '../src/WxArticleExporter';
import * as path from 'path';

async function main() {
  // 微信公众号文章合集链接
  const albumUrl = 'https://mp.weixin.qq.com/mp/appmsgalbum?__biz=Mzg2MzcyODQ5MQ==&action=getalbum&album_id=3845871143212695552&subscene=21&scenenote=https://mp.weixin.qq.com/s%253F__biz=Mzg2MzcyODQ5MQ==&mid=2247492968&idx=1&sn=038c14a5aa0176688ea59fc70200e528&scene=21&subscene=10000&sessionid=1751742350&clicktime=1751742417&enterid=1751742417&ascene=56&fasttmpl_type=0&fasttmpl_fullversion=7805417-zh_CN-zip&fasttmpl_flag=0&realreporttime=1751742417256&devicetype=android-35&version=28003d34&nettype=WIFI&abtest_cookie=AAACAA==&lang=zh_CN&countrycode=CN&exportkey=n_ChQIAhIQBz+57KV+3jGgWc7F6F5MzBLbAQIE97dBBAEAAAAAAOJQNwpmY60AAAAOpnltbLcz9gKNyK89dVj0VQwm6FwUE3z6HhAHh50BKVI2sTm7H+Jm7UDxZgNoOrvVpbcOxM/EXNT/N0/SNzXEWltUTC24kpr7Gia9PgOTDYGgS7GVEbEDsjXtYe5j7LvffAZj0r9kWCijCUNccfjPKQJm7BstaTMFOV9ogvQR+GOK2VYy/7HZ3nCnUh/W1OLrjE9F+P8G6ov2SyGSMzDkH30YIiLtgNKV83HhfK4GQJqf2v2uhX/4fHvK7c2ZLlJtHWb8IQ==&pass_ticket=xrXM965wzcoonUQR5x4FujV3sv5S1tVrUBepmNXPDpqUtEUUl8m4njyEEYQfgRhN&wx_header=3&nolastread=1';

  try {
    const exporter = new WxArticleExporter(albumUrl);
    const outputPath = path.join(__dirname, 'output', 'wx-article.epub');
    await exporter.exportToEpub(outputPath);
  } catch (error) {
    console.error('导出失败:', error);
  }
}

main();