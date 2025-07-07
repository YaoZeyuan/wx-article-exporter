# wx-article-exporter
将微信公众号合集转为epub电子书

## 特性

- 支持EPUB 3.3标准
- 支持多章节内容
- 自动处理图片资源
- TypeScript支持
- 完整的类型定义

## 安装

```bash
npm install wx-article-exporter
```

## 使用示例

```typescript
import { EpubGenerator } from 'wx-article-exporter';
import * as fs from 'fs';

// 创建EPUB生成器实例
const generator = new EpubGenerator({
  title: '我的公众号文章集',
  author: '作者名',
  language: 'zh-CN',
  description: '微信公众号文章合集',
  publisher: '公众号名称',
  date: new Date().toISOString()
});

// 添加章节内容
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>第一篇文章</title>
</head>
<body>
  <h1>第一篇文章标题</h1>
  <p>这是文章的内容...</p>
  <img src="article-image.jpg" alt="文章配图"/>
</body>
</html>
`;

// 读取图片文件
const imageData = fs.readFileSync('path/to/article-image.jpg');

// 添加内容到生成器
generator.addContent(htmlContent, [
  {
    path: 'article-image.jpg',
    data: imageData
  }
]);

// 生成EPUB文件
generator.generate('output.epub')
  .then(() => console.log('EPUB文件生成成功！'))
  .catch(err => console.error('生成EPUB文件时出错：', err));
```

## API文档

### EpubGenerator

#### 构造函数

```typescript
constructor(metadata: EpubMetadata)
```

创建一个新的EPUB生成器实例。

参数 `metadata` 包含以下属性：
- `title`: 电子书标题（必需）
- `author`: 作者名称（必需）
- `language`: 语言代码（必需，如 'zh-CN'）
- `identifier`: 唯一标识符（可选，默认自动生成UUID）
- `description`: 描述信息（可选）
- `publisher`: 出版社信息（可选）
- `date`: 出版日期（可选）

#### 方法

##### addContent

```typescript
addContent(html: string, images: Array<{ path: string; data: Buffer }>): void
```

添加一个章节的内容到EPUB中。

参数：
- `html`: HTML内容字符串
- `images`: 图片文件数组，每个图片对象包含：
  - `path`: 图片文件名
  - `data`: 图片文件的Buffer数据

##### generate

```typescript
generate(outputPath: string): Promise<void>
```

生成EPUB文件。

参数：
- `outputPath`: 输出文件路径

返回一个Promise，在EPUB文件生成完成时解决。

## 注意事项

1. HTML内容中的图片引用路径应与添加的图片文件名保持一致
2. 支持的图片格式包括：JPG、PNG、GIF、SVG
3. 建议使用绝对路径来指定输出文件位置

## 许可证

MIT
