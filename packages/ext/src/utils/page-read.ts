import { useExtractorConfig } from '../composables/extractor-config';

/**
 * use `@mozilla/readability` to get page content
 * @returns u
 */

export function simpleParseRead() {
  const { getExtractorForCurrentUrl } = useExtractorConfig();
  const extractor = getExtractorForCurrentUrl.value;
  
  if (!extractor) {
    console.warn("No extractor found for current URL");
    return null;
  }

  return extractor.extract(document);
}

/**
 * 将连续的\n ' '替换为单个
 * @param input 
 * @returns 
 */
export function cleanString(input: string): string {
  return input.replace(/(\n+\s+\n)|(\s{2,})/g, match => {
    if (match.includes('\n')) {
      return '\n';
    }
    return ' ';
  });
}