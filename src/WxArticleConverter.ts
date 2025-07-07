import * as fs from 'fs';
import * as path from 'path';
import { EpubGenerator } from './library/epub/index';

interface ConvertProgress {
    total: number;
    current: number;
    errors: Array<{
        type: 'article' | 'image';
        path: string;
        error: string;
    }>;
}

export class WxArticleConverter {
    private albumDir: string;
    private progress: ConvertProgress = {
        total: 0,
        current: 0,
        errors: []
    };

    constructor(albumDir: string) {
        this.albumDir = albumDir;
    }

    /**
     * 获取当前进度
     */
    public getProgress(): ConvertProgress {
        return { ...this.progress };
    }

    /**
     * 读取专辑信息
     */
    private readAlbumInfo() {
        const albumInfoPath = path.join(this.albumDir, 'album.json');
        if (!fs.existsSync(albumInfoPath)) {
            throw new Error('找不到专辑信息文件');
        }

        return JSON.parse(fs.readFileSync(albumInfoPath, 'utf-8'));
    }

    /**
     * 获取所有文章目录
     */
    private getArticleDirs(): string[] {
        return fs.readdirSync(this.albumDir)
            .filter(name => name !== 'album.json')
            .map(name => path.join(this.albumDir, name))
            .filter(dir => fs.statSync(dir).isDirectory())
            .sort((a, b) => {
                const aNum = parseInt(path.basename(a).split('_')[0]);
                const bNum = parseInt(path.basename(b).split('_')[0]);
                return aNum - bNum;
            });
    }

    /**
     * 读取文章内容
     */
    private readArticleContent(articleDir: string): { html: string; images: Array<{ path: string; data: Buffer }> } {
        const htmlPath = path.join(articleDir, 'index.html');
        const imagesDir = path.join(articleDir, 'images');

        if (!fs.existsSync(htmlPath)) {
            throw new Error('找不到文章HTML文件');
        }

        const html = fs.readFileSync(htmlPath, 'utf-8');
        const images: Array<{ path: string; data: Buffer }> = [];

        if (fs.existsSync(imagesDir)) {
            const imageFiles = fs.readdirSync(imagesDir);
            for (const imageFile of imageFiles) {
                try {
                    const imagePath = path.join(imagesDir, imageFile);
                    const imageData = fs.readFileSync(imagePath);
                    images.push({
                        path: imageFile,
                        data: imageData
                    });
                } catch (error) {
                    console.warn(`读取图片失败: ${imageFile}`, error);
                    this.progress.errors.push({
                        type: 'image',
                        path: imageFile,
                        error: error.message
                    });
                }
            }
        }

        return { html, images };
    }

    /**
     * 转换为EPUB
     */
    public async convertToEpub(outputPath: string): Promise<void> {
        // 读取专辑信息
        const albumInfo = this.readAlbumInfo();
        console.log(`开始转换专辑: ${albumInfo.title}`);

        // 获取所有文章目录
        const articleDirs = this.getArticleDirs();
        console.log(`共找到 ${articleDirs.length} 篇文章`);

        // 创建EPUB生成器
        const generator = new EpubGenerator({
            title: albumInfo.title,
            author: albumInfo.author,
            language: 'zh-CN',
            description: `共 ${articleDirs.length} 篇文章，总阅读数 ${albumInfo.readCount}`,
            publisher: '微信公众号',
            date: new Date().toISOString()
        });

        // 初始化进度
        this.progress = {
            total: articleDirs.length,
            current: 0,
            errors: []
        };

        // 处理每篇文章
        for (let i = 0; i < articleDirs.length; i++) {
            const articleDir = articleDirs[i];
            const articleName = path.basename(articleDir).split('_').slice(1).join('_');
            console.log(`转换文章 ${i + 1}/${articleDirs.length}: ${articleName}`);

            try {
                const { html, images } = this.readArticleContent(articleDir);
                generator.addContent(html, images);
                this.progress.current++;
            } catch (error) {
                console.error(`转换文章失败: ${articleName}`, error);
                this.progress.errors.push({
                    type: 'article',
                    path: articleDir,
                    error: error.message
                });
            }
        }

        // 生成EPUB文件
        await generator.generate(outputPath);
    }
}