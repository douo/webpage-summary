import { Extractor } from "../../types/extractor";
import { ReadabilityExtractor } from "./readability-extractor";
import { HtmlToTextExtractor } from "./html-to-text-extractor";
import { RedditThreadExtractor } from "./reddit-thread";

export const extractors: Extractor[] = [
  new ReadabilityExtractor(),
  new HtmlToTextExtractor(),
  new RedditThreadExtractor()
];

export function getExtractor(name: string): Extractor | undefined {
  return extractors.find(extractor => extractor.name === name);
}

export function getDefaultExtractor(): Extractor {
  // 默认使用 Readability
  return extractors[0];
} 