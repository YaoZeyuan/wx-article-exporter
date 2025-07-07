import { EpubGenerator } from '../EpubGenerator';
import * as fs from 'fs';
import * as path from 'path';

describe('EpubGenerator', () => {
  const testOutputDir = path.join(__dirname, 'test-output');
  const testImagePath = path.join(__dirname, 'test-assets', 'test-image.jpg');
  let generator: EpubGenerator;

  beforeAll(() => {
    // 创建测试输出目录
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }

    // 创建测试图片
    if (!fs.existsSync(path.dirname(testImagePath))) {
      fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    }
    // 创建一个1x1像素的测试图片
    const minimalJPEG = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00,
      0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x03, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
      0x37, 0xFF, 0xD9
    ]);
    fs.writeFileSync(testImagePath, minimalJPEG);
  });

  beforeEach(() => {
    generator = new EpubGenerator({
      title: '测试电子书',
      author: '测试作者',
      language: 'zh-CN',
      description: '这是一本测试电子书',
      publisher: '测试出版社',
      date: '2023-08-01'
    });
  });

  afterAll(() => {
    // 清理测试文件
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
    if (fs.existsSync(path.dirname(testImagePath))) {
      fs.rmSync(path.dirname(testImagePath), { recursive: true, force: true });
    }
  });

  test('should create an instance with metadata', () => {
    expect(generator).toBeInstanceOf(EpubGenerator);
  });

  test('should add content with images', () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><title>测试章节</title></head>
      <body>
        <h1>测试章节</h1>
        <p>这是测试内容</p>
        <img src="test-image.jpg" alt="测试图片"/>
      </body>
      </html>
    `;

    const imageData = fs.readFileSync(testImagePath);
    expect(() => {
      generator.addContent(htmlContent, [
        {
          path: 'test-image.jpg',
          data: imageData
        }
      ]);
    }).not.toThrow();
  });

  test('should generate EPUB file', async () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><title>测试章节</title></head>
      <body>
        <h1>测试章节</h1>
        <p>这是测试内容</p>
        <img src="test-image.jpg" alt="测试图片"/>
      </body>
      </html>
    `;

    const imageData = fs.readFileSync(testImagePath);
    generator.addContent(htmlContent, [
      {
        path: 'test-image.jpg',
        data: imageData
      }
    ]);

    const outputPath = path.join(testOutputDir, 'test-output.epub');
    await generator.generate(outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(0);
  });

  test('should handle multiple chapters', async () => {
    const chapters = [
      {
        title: '第一章',
        content: '第一章的内容'
      },
      {
        title: '第二章',
        content: '第二章的内容'
      }
    ];

    chapters.forEach(chapter => {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><title>${chapter.title}</title></head>
        <body>
          <h1>${chapter.title}</h1>
          <p>${chapter.content}</p>
        </body>
        </html>
      `;
      generator.addContent(htmlContent, []);
    });

    const outputPath = path.join(testOutputDir, 'multi-chapter-test.epub');
    await generator.generate(outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(0);
  });
});