import { Readability } from "@mozilla/readability";
import { Extractor, ExtractorResult } from "../../types/extractor";
import { cleanString } from "../page-read";

export class ReadabilityExtractor implements Extractor {
  name = "readability";
  description = "使用 Mozilla 的 Readability 库提取网页主要内容";

  extract(document: Document): ExtractorResult | null {
    const documentClone = document.cloneNode(true);
    const _article = new Readability(documentClone as Document, {}).parse();
    
    if (!_article) {
      console.warn("article is null.");
      return null;
    }

    return {
      textContent: cleanString(_article.textContent),
      articleUrl: window.location.href
    };
  }
} 