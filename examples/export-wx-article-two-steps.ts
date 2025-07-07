import * as path from 'path';
import { WxArticleFetcher } from '../src/WxArticleFetcher';
import { WxArticleConverter } from '../src/WxArticleConverter';

async function main() {
    // 微信公众号文章合集链接
    const albumUrl = 'https://mp.weixin.qq.com/mp/appmsgalbum?__biz=Mzg2MzcyODQ5MQ==&action=getalbum&album_id=3845871143212695552&subscene=21&scenenote=https://mp.weixin.qq.com/s%253F__biz=Mzg2MzcyODQ5MQ==&mid=2247492968&idx=1&sn=038c14a5aa0176688ea59fc70200e528&scene=21&subscene=10000&sessionid=1751742350&clicktime=1751742417&enterid=1751742417&ascene=56&fasttmpl_type=0&fasttmpl_fullversion=7805417-zh_CN-zip&fasttmpl_flag=0&realreporttime=1751742417256&devicetype=android-35&version=28003d34&nettype=WIFI&abtest_cookie=AAACAA==&lang=zh_CN&countrycode=CN&exportkey=n_ChQIAhIQBz+57KV+3jGgWc7F6F5MzBLbAQIE97dBBAEAAAAAAOJQNwpmY60AAAAOpnltbLcz9gKNyK89dVj0VQwm6FwUE3z6HhAHh50BKVI2sTm7H+Jm7UDxZgNoOrvVpbcOxM/EXNT/N0/SNzXEWltUTC24kpr7Gia9PgOTDYGgS7GVEbEDsjXtYe5j7LvffAZj0r9kWCijCUNccfjPKQJm7BstaTMFOV9ogvQR+GOK2VYy/7HZ3nCnUh/W1OLrjE9F+P8G6ov2SyGSMzDkH30YIiLtgNKV83HhfK4GQJqf2v2uhX/4fHvK7c2ZLlJtHWb8IQ==&pass_ticket=xrXM965wzcoonUQR5x4FujV3sv5S1tVrUBepmNXPDpqUtEUUl8m4njyEEYQfgRhN&wx_header=3&nolastread=1';

    try {
        // 第一步：下载文章内容和资源
        console.log('\n=== 第一步：下载文章内容和资源 ===');
        const fetcher = new WxArticleFetcher(albumUrl);

        // 创建下载进度报告定时器
        const fetchProgressTimer = setInterval(() => {
            const progress = fetcher.getProgress();
            if (progress.total > 0) {
                const percentage = Math.round((progress.current / progress.total) * 100);
                console.log(`下载进度: ${percentage}% (${progress.current}/${progress.total})`);

                if (progress.errors.length > 0) {
                    console.log('当前错误统计:');
                    const articleErrors = progress.errors.filter(e => e.type === 'article').length;
                    const imageErrors = progress.errors.filter(e => e.type === 'image').length;
                    const resourceErrors = progress.errors.filter(e => e.type === 'resource').length;
                    console.log(`- 文章错误: ${articleErrors}`);
                    console.log(`- 图片错误: ${imageErrors}`);
                    console.log(`- 资源错误: ${resourceErrors}`);
                }
            }
        }, 1000);

        // 执行下载
        const albumDir = await fetcher.fetchAll();
        // path.resolve('D:/win_www/wx-article-exporter/resource/draft/揭秘公司治理框架')

        // 清理下载进度定时器
        clearInterval(fetchProgressTimer);

        // 输出下载统计
        const finalFetchProgress = fetcher.getProgress();
        console.log('\n下载完成!');
        console.log(`总文章数: ${finalFetchProgress.total}`);
        console.log(`成功下载: ${finalFetchProgress.current}`);
        console.log(`失败数量: ${finalFetchProgress.errors.length}`);

        if (finalFetchProgress.errors.length > 0) {
            console.log('\n下载错误详情:');
            finalFetchProgress.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.type}: ${error.url}`);
                console.log(`   错误: ${error.error}`);
            });
        }

        if (5 > 1) {
            console.log("第一步执行完毕")
            // return
        }

        // 第二步：转换为EPUB
        console.log('\n=== 第二步：转换为EPUB ===');
        const converter = new WxArticleConverter(albumDir);
        const outputPath = path.join(__dirname, 'output', 'wx-article.epub');

        // 创建转换进度报告定时器
        const convertProgressTimer = setInterval(() => {
            const progress = converter.getProgress();
            if (progress.total > 0) {
                const percentage = Math.round((progress.current / progress.total) * 100);
                console.log(`转换进度: ${percentage}% (${progress.current}/${progress.total})`);

                if (progress.errors.length > 0) {
                    console.log('当前错误统计:');
                    const articleErrors = progress.errors.filter(e => e.type === 'article').length;
                    const imageErrors = progress.errors.filter(e => e.type === 'image').length;
                    console.log(`- 文章错误: ${articleErrors}`);
                    console.log(`- 图片错误: ${imageErrors}`);
                }
            }
        }, 1000);

        // 执行转换
        await converter.convertToEpub(outputPath);

        // 清理转换进度定时器
        clearInterval(convertProgressTimer);

        // 输出转换统计
        const finalConvertProgress = converter.getProgress();
        console.log('\n转换完成!');
        console.log(`总文章数: ${finalConvertProgress.total}`);
        console.log(`成功转换: ${finalConvertProgress.current}`);
        console.log(`失败数量: ${finalConvertProgress.errors.length}`);

        if (finalConvertProgress.errors.length > 0) {
            console.log('\n转换错误详情:');
            finalConvertProgress.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.type}: ${error.path}`);
                console.log(`   错误: ${error.error}`);
            });
        }

        console.log('\n=== 导出完成 ===');
        console.log(`EPUB文件已生成: ${outputPath}`);
    } catch (error) {
        console.error('导出失败:', error);
    }
}

main();