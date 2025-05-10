import { htmlToText } from 'html-to-text';
import { Extractor, ExtractorResult } from "../../types/extractor";

export class HtmlToTextExtractor implements Extractor {
  name = "html-to-text";
  description = "使用 html-to-text 库将 HTML 转换为纯文本";

  extract(document: Document): ExtractorResult | null {
    const documentClone = document.cloneNode(true);
    const html = documentClone.documentElement.outerHTML;
    
    const text = htmlToText(html, {
      wordwrap: false,
      selectors: [
        { selector: 'script', format: 'skip' },
        { selector: 'style', format: 'skip' },
        { selector: 'nav', format: 'skip' },
        { selector: 'footer', format: 'skip' },
        { selector: 'header', format: 'skip' },
        { selector: 'aside', format: 'skip' }
      ]
    });

    return {
      textContent: text,
      articleUrl: window.location.href
    };
  }
} 