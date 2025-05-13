import { computed } from 'vue';
import { Extractor } from '../types/extractor';
import { extractors } from '../utils/extractors';
import { storage } from 'wxt/storage';
import useWxtStorage from './useWxtStorage';

// 存储键
const DEFAULT_EXTRACTOR_KEY = 'sync:default-extractor';

// 定义存储项
const defaultExtractorStorage = storage.defineItem<string>(DEFAULT_EXTRACTOR_KEY, {
  fallback: 'readability',
  version: 1
});

/**
 * 返回使用 WxtStorage 的响应式默认提取器配置。
 */
export function useDefaultExtractor() {
  const { state: defaultExtractor, ...other } = useWxtStorage<string>(DEFAULT_EXTRACTOR_KEY, 'readability');
  return { defaultExtractor, ...other };
}

/**
 * 获取默认提取器名称
 */
export async function getDefaultExtractor() {
  return await storage.getItem(DEFAULT_EXTRACTOR_KEY, { fallback: 'readability' });
}

/**
 * 管理提取器配置项。
 */
export function useExtractorConfigStorage() {
  /**
   * 设置默认提取器
   */
  async function setDefaultExtractor(name: string) {
    console.log('[extractor-config] Setting default extractor:', name);
    try {
      await defaultExtractorStorage.setValue(name);
      console.log('[extractor-config] Default extractor saved successfully');
      
      // 验证保存是否成功
      const savedValue = await defaultExtractorStorage.getValue();
      console.log('[extractor-config] Verified saved default extractor:', savedValue);
    } catch (e) {
      console.error('[extractor-config] Error saving default extractor:', e);
      // 如果保存失败，尝试重置为默认值
      try {
        await defaultExtractorStorage.setValue('readability');
        console.log('[extractor-config] Reset default extractor to readability');
      } catch (resetError) {
        console.error('[extractor-config] Error resetting default extractor:', resetError);
      }
    }
  }

  return {
    setDefaultExtractor
  };
}

/**
 * 管理提取器配置项。
 */
export function useExtractorConfig() {
  const { state: defaultExtractor } = useWxtStorage<string>(DEFAULT_EXTRACTOR_KEY, 'readability');
  const { setDefaultExtractor } = useExtractorConfigStorage();

  // 获取当前使用的 extractor
  const getExtractorForCurrentUrl = computed(() => {
    const url = window.location.href;
    
    // 首先尝试找到专门针对当前 URL 的提取器
    const specificExtractor = extractors.find(e => {
      if (e.name === 'reddit-thread' && url.match(/reddit\.com\/r\/[^/]+\/comments\/[^/]+/)) {
        return true;
      }
      return false;
    });

    if (specificExtractor) {
      console.log('[extractor-config] Using specific extractor for URL:', specificExtractor.name);
      return specificExtractor;
    }

    // 如果没有找到特定的提取器，使用默认提取器
    const defaultExtractorName = defaultExtractor.value;
    const defaultExtractorInstance = extractors.find(e => e.name === defaultExtractorName);
    console.log('[extractor-config] Using default extractor:', defaultExtractorInstance?.name);
    return defaultExtractorInstance;
  });

  return {
    extractors,
    defaultExtractorName: defaultExtractor,
    getExtractorForCurrentUrl,
    setDefaultExtractor
  };
} 