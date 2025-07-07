import { EpubGenerator } from '../src';
import * as fs from 'fs';
import * as path from 'path';

const basePath = path.join(__dirname, '../tests');

// 示例：将微信公众号文章转换为EPUB
async function convertArticleToEpub() {
  // 创建EPUB生成器实例
  const generator = new EpubGenerator({
    title: '技术文章合集',
    author: '公众号作者',
    language: 'zh-CN',
    description: '精选技术文章合集',
    publisher: '我的技术公众号',
    date: new Date().toISOString()
  });

  // 模拟文章数据（实际使用时需要替换为真实的文章数据）
  const articles = [
    {
      title: 'TypeScript入门指南',
      content: '这是一篇介绍TypeScript基础的文章...',
      images: [
        {
          filename: 'typescript-intro.jpg',
          path: './images/typescript-intro.jpg'
        }
      ]
    },
    {
      title: 'Node.js最佳实践',
      content: '这是一篇关于Node.js开发技巧的文章...',
      images: [
        {
          filename: 'nodejs-tips.jpg',
          path: './images/nodejs-tips.jpg'
        }
      ]
    }
  ];

  // 处理每篇文章
  for (const article of articles) {
    // 构建文章HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${article.title}</title>
        <meta charset="utf-8"/>
      </head>
      <body>
        <h1>${article.title}</h1>
        <div class="article-content">
          ${article.content}
          ${article.images.map(img => `<img src="${img.filename}" alt="${img.filename}"/>`).join('\n')}
        </div>
      </body>
      </html>
    `;

    // 读取文章相关的图片

    const images = await Promise.all(
      article.images.map(async (img) => {
        const imgPath = path.resolve(basePath, img.path)
        return {
          path: img.filename,
          data: await fs.promises.readFile(imgPath)
        }
      })
    );

    // 添加文章内容到EPUB
    generator.addContent(htmlContent, images);
  }

  // 生成EPUB文件
  const outputPath = path.join(basePath, 'output', 'articles.epub');

  // 确保输出目录存在
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

  // 生成EPUB
  await generator.generate(outputPath);
  console.log(`EPUB文件已生成：${outputPath}`);
}

// 运行转换
convertArticleToEpub().catch(console.error);