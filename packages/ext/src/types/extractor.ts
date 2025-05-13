export interface ExtractorResult {
  textContent: string;
  articleUrl: string;
}

export interface Extractor {
  name: string;
  description: string;
  extract: (document: Document) => ExtractorResult | null;
}

export interface WebpageContent {
  articleUrl: string;
  articleTitle: string;
  articleContent: string;
  articleHtml: string;
} 