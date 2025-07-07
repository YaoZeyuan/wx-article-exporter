export interface EpubContent {
  html: string;
  images: Array<{
    path: string;
    data: Buffer;
  }>;
}

export interface EpubMetadata {
  title: string;
  author: string;
  language: string;
  identifier?: string;
  description?: string;
  publisher?: string;
  date?: string;
}