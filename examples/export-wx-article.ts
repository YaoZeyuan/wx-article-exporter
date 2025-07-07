import { WxArticleExporter } from '../src/WxArticleExporter';
import * as path from 'path';

async function main() {
  // 微信公众号文章合集链接
  const albumUrl = 'https://mp.weixin.qq.com/mp/appmsgalbum?__biz=Mzg2MzcyODQ5MQ==&action=getalbum&album_id=3845871143212695552&subscene=21&scenenote=https://mp.weixin.qq.com/s%253F__biz=Mzg2MzcyODQ5MQ==&mid=2247492968&idx=1&sn=038c14a5aa0176688ea59fc70200e528&scene=21&subscene=10000&sessionid=1751742350&clicktime=1751742417&enterid=1751742417&ascene=56&fasttmpl_type=0&fasttmpl_fullversion=7805417-zh_CN-zip&fasttmpl_flag=0&realreporttime=1751742417256&devicetype=android-35&version=28003d34&nettype=WIFI&abtest_cookie=AAACAA==&lang=zh_CN&countrycode=CN&exportkey=n_ChQIAhIQBz+57KV+3jGgWc7F6F5MzBLbAQIE97dBBAEAAAAAAOJQNwpmY60AAAAOpnltbLcz9gKNyK89dVj0VQwm6FwUE3z6HhAHh50BKVI2sTm7H+Jm7UDxZgNoOrvVpbcOxM/EXNT/N0/SNzXEWltUTC24kpr7Gia9PgOTDYGgS7GVEbEDsjXtYe5j7LvffAZj0r9kWCijCUNccfjPKQJm7BstaTMFOV9ogvQR+GOK2VYy/7HZ3nCnUh/W1OLrjE9F+P8G6ov2SyGSMzDkH30YIiLtgNKV83HhfK4GQJqf2v2uhX/4fHvK7c2ZLlJtHWb8IQ==&pass_ticket=xrXM965wzcoonUQR5x4FujV3sv5S1tVrUBepmNXPDpqUtEUUl8m4njyEEYQfgRhN&wx_header=3&nolastread=1';

  try {
    const exporter = new WxArticleExporter(albumUrl);
    const outputPath = path.join(__dirname, 'output', 'wx-article.epub');

    // 创建进度报告定时器
    const progressTimer = setInterval(() => {
      const progress = exporter.getProgress();
      if (progress.total > 0) {
        const percentage = Math.round((progress.current / progress.total) * 100);
        console.log(`导出进度: ${percentage}% (${progress.current}/${progress.total})`);
        
        if (progress.errors.length > 0) {
          console.log('当前错误统计:');
          const articleErrors = progress.errors.filter(e => e.type === 'article').length;
          const imageErrors = progress.errors.filter(e => e.type === 'image').length;
          console.log(`- 文章错误: ${articleErrors}`);
          console.log(`- 图片错误: ${imageErrors}`);
        }
      }
    }, 1000);

    // 执行导出
    await exporter.exportToEpub(outputPath);

    // 清理定时器
    clearInterval(progressTimer);

    // 输出最终统计
    const finalProgress = exporter.getProgress();
    console.log('\n导出完成!');
    console.log(`总文章数: ${finalProgress.total}`);
    console.log(`成功处理: ${finalProgress.current}`);
    console.log(`失败数量: ${finalProgress.errors.length}`);

    if (finalProgress.errors.length > 0) {
      console.log('\n错误详情:');
      finalProgress.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.type === 'article' ? '文章' : '图片'}: ${error.url}`);
        console.log(`   错误: ${error.error}`);
      });
    }
  } catch (error) {
    console.error('导出失败:', error);
  }
}

main();