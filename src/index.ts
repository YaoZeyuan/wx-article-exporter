export { EpubGenerator } from './EpubGenerator';

export interface EpubMetadata {
  title: string;
  author: string;
  language: string;
  identifier?: string;
  description?: string;
  publisher?: string;
  date?: string;
}

export interface ImageContent {
  path: string;
  data: Buffer;
}