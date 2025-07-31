/**
 * 调试组件管理器
 * 控制调试组件的加载和显示，避免生产环境污染
 */

export interface DebugConfig {
  enabled: boolean
  components: string[]
  mode: 'development' | 'production' | 'test'
}

export class DebugManager {
  private static instance: DebugManager
  private config: DebugConfig

  constructor() {
    this.config = {
      enabled: import.meta.env.DEV || false,
      components: [],
      mode: import.meta.env.MODE as 'development' | 'production' | 'test'
    }
  }

  static getInstance(): DebugManager {
    if (!DebugManager.instance) {
      DebugManager.instance = new DebugManager()
    }
    return DebugManager.instance
  }

  /**
   * 检查是否应该加载调试组件
   */
  shouldLoadDebugComponent(componentName: string): boolean {
    if (!this.config.enabled) return false
    if (this.config.mode === 'production') return false
    return true
  }

  /**
   * 动态加载调试组件
   */
  async loadDebugComponent(componentName: string) {
    if (!this.shouldLoadDebugComponent(componentName)) {
      return null
    }

    try {
      // 动态导入调试组件
      const componentMap: Record<string, () => Promise<any>> = {
        'ReadabilityDebug': () => import('@/src/components/debug/ReadabilityDebug.vue'),
        'VercelAICoreDebug': () => import('@/src/components/debug/VercelAICoreDebug.vue'),
        'MessageDebug': () => import('@/src/components/debug/MessageDebug.vue'),
        'StorageDebug': () => import('@/src/components/debug/StorageDebug.vue'),
        'SummaryHeaderDebug': () => import('@/src/components/debug/SummaryBoxDebug.vue'),
        'ShadcnThemeColorVisual': () => import('@/src/components/debug/ShadcnThemeColorVisual.vue'),
        'CustomSelectDebug': () => import('@/src/components/debug/CustomSelectDebug.vue'),
        'ConnectMessageDebug': () => import('@/src/components/debug/ConnectMessageDebug.vue'),
        'ResizableDebug': () => import('@/src/components/debug/ResizableDebug.vue'),
        'FetchDebug': () => import('@/src/components/debug/FetchDebug.vue'),
      }

      const loader = componentMap[componentName]
      if (loader) {
        return await loader()
      }
    } catch (error) {
      console.warn(`Failed to load debug component: ${componentName}`, error)
    }
    
    return null
  }

  /**
   * 获取所有可用的调试组件
   */
  async getAllDebugComponents() {
    if (!this.shouldLoadDebugComponent('*')) {
      return []
    }

    const componentNames = [
      'ReadabilityDebug',
      'VercelAICoreDebug', 
      'MessageDebug',
      'StorageDebug',
      'SummaryHeaderDebug',
      'ShadcnThemeColorVisual',
      'CustomSelectDebug',
      'ConnectMessageDebug',
      'ResizableDebug',
      'FetchDebug'
    ]

    const components = []
    for (const name of componentNames) {
      const component = await this.loadDebugComponent(name)
      if (component) {
        components.push({
          name,
          component: component.default || component
        })
      }
    }

    return components
  }

  /**
   * 设置调试配置
   */
  setConfig(config: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取当前配置
   */
  getConfig(): DebugConfig {
    return { ...this.config }
  }
}

// 导出单例
export const debugManager = DebugManager.getInstance()

// 便捷方法
export function shouldShowDebugComponents(): boolean {
  return debugManager.shouldLoadDebugComponent('*')
}

export async function loadDebugComponent(name: string) {
  return debugManager.loadDebugComponent(name)
}

// Vue组合式API
export function useDebugManager() {
  return {
    debugManager,
    shouldLoadDebugComponent: debugManager.shouldLoadDebugComponent.bind(debugManager),
    loadDebugComponent: debugManager.loadDebugComponent.bind(debugManager),
    shouldShowDebugComponents
  }
}
