import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';

interface EpubContent {
  html: string;
  images: Array<{
    path: string;
    data: Buffer;
  }>;
}

interface EpubMetadata {
  title: string;
  author: string;
  language: string;
  identifier?: string;
  description?: string;
  publisher?: string;
  date?: string;
}

export class EpubGenerator {
  private contents: EpubContent[] = [];
  private metadata: EpubMetadata;
  private uuid: string;

  constructor(metadata: EpubMetadata) {
    this.metadata = metadata;
    this.uuid = metadata.identifier || uuidv4();
  }

  /**
   * 添加HTML内容和相关图片到EPUB
   * @param html HTML内容字符串
   * @param images 图片文件数组
   */
  public addContent(html: string, images: Array<{ path: string; data: Buffer }>) {
    this.contents.push({ html, images });
  }

  /**
   * 生成EPUB文件
   * @param outputPath 输出文件路径
   */
  public async generate(outputPath: string): Promise<void> {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    // 添加mimetype文件
    archive.append('application/epub+zip', { name: 'mimetype' });

    // 添加容器文件
    archive.append(this.generateContainerXml(), { name: 'META-INF/container.xml' });

    // 添加OPF文件
    archive.append(this.generatePackageOpf(), { name: 'OEBPS/content.opf' });

    // 添加NCX文件
    archive.append(this.generateTocNcx(), { name: 'OEBPS/toc.ncx' });

    // 添加内容文件
    for (let i = 0; i < this.contents.length; i++) {
      const content = this.contents[i];
      const htmlFileName = `chapter_${i + 1}.xhtml`;
      
      // 处理HTML内容
      const $ = cheerio.load(content.html);
      $('img').each((_, elem) => {
        const src = $(elem).attr('src');
        if (src) {
          const imgName = path.basename(src);
          $(elem).attr('src', `images/${imgName}`);
        }
      });

      archive.append($.html(), { name: `OEBPS/${htmlFileName}` });

      // 添加图片
      for (const image of content.images) {
        const imgName = path.basename(image.path);
        archive.append(image.data, { name: `OEBPS/images/${imgName}` });
      }
    }

    await archive.finalize();
  }

  private generateContainerXml(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  }

  private generatePackageOpf(): string {
    const manifest = this.contents.map((_, index) => {
      return `<item id="chapter_${index + 1}" href="chapter_${index + 1}.xhtml" media-type="application/xhtml+xml"/>`;
    }).join('\n    ');

    const spine = this.contents.map((_, index) => {
      return `<itemref idref="chapter_${index + 1}"/>`;
    }).join('\n    ');

    const imageItems = this.contents.flatMap(content => {
      return content.images.map(image => {
        const imgName = path.basename(image.path);
        const mediaType = this.getImageMediaType(imgName);
        return `<item id="${imgName}" href="images/${imgName}" media-type="${mediaType}"/>`;
      });
    }).join('\n    ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uuid_id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${this.metadata.title}</dc:title>
    <dc:creator>${this.metadata.author}</dc:creator>
    <dc:language>${this.metadata.language}</dc:language>
    <dc:identifier id="uuid_id">${this.uuid}</dc:identifier>
    ${this.metadata.description ? `<dc:description>${this.metadata.description}</dc:description>` : ''}
    ${this.metadata.publisher ? `<dc:publisher>${this.metadata.publisher}</dc:publisher>` : ''}
    ${this.metadata.date ? `<dc:date>${this.metadata.date}</dc:date>` : ''}
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifest}
    ${imageItems}
  </manifest>
  <spine toc="ncx">
    ${spine}
  </spine>
</package>`;
  }

  private generateTocNcx(): string {
    const navPoints = this.contents.map((_, index) => {
      return `<navPoint id="chapter_${index + 1}" playOrder="${index + 1}">
      <navLabel>
        <text>Chapter ${index + 1}</text>
      </navLabel>
      <content src="chapter_${index + 1}.xhtml"/>
    </navPoint>`;
    }).join('\n    ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${this.uuid}"/>
  </head>
  <docTitle>
    <text>${this.metadata.title}</text>
  </docTitle>
  <navMap>
    ${navPoints}
  </navMap>
</ncx>`;
  }

  private getImageMediaType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.gif':
        return 'image/gif';
      case '.svg':
        return 'image/svg+xml';
      default:
        return 'application/octet-stream';
    }
  }
}