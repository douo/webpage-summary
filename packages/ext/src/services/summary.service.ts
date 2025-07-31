/**
 * 总结服务
 * 核心业务逻辑抽象，处理总结生成、状态管理等
 */

import { sendConnectMessage } from '@/connect-messaging'
import { CoreMessage } from 'ai'
import { toRaw } from 'vue'
import { ModelConfigItem } from '@/src/types/config/model'
import { TokenUsage, WebpageContent } from '@/src/types/summary'
import { messageService, MessageService } from './message.service'
import { errorService, ErrorService } from './error.service'

export interface SummaryConfig {
  model: ModelConfigItem
  systemMessage: string
  userMessage: string
}

export interface SummaryResult {
  textStream: any
  tokenUsage: Promise<TokenUsage>
  stop: CallableFunction
}

export interface SummaryContext {
  webpageContent: WebpageContent
  summaryLanguage: string
}

export class SummaryService {
  private static instance: SummaryService
  private messageService: MessageService
  private errorService: ErrorService

  constructor() {
    this.messageService = messageService
    this.errorService = errorService
  }

  static getInstance(): SummaryService {
    if (!SummaryService.instance) {
      SummaryService.instance = new SummaryService()
    }
    return SummaryService.instance
  }

  /**
   * 验证配置有效性
   */
  validateConfig(config: Partial<SummaryConfig>): boolean {
    if (!config.model) {
      this.errorService.handleError(
        new Error('模型配置缺失'),
        ErrorService.createContext('SummaryService', 'validateConfig')
      )
      return false
    }

    if (!config.systemMessage || !config.userMessage) {
      this.errorService.handleError(
        new Error('提示词配置缺失'),
        ErrorService.createContext('SummaryService', 'validateConfig')
      )
      return false
    }

    return true
  }

  /**
   * 检查特殊情况
   */
  checkSpecialCases(model: ModelConfigItem): void {
    if (model.providerType === "moonshot(web)" && ['kimi', 'k1'].includes(model.modelName)) {
      // 可以考虑使用通知服务替代直接toast
      import('@/src/components/ui/toast').then(({ toast }) => {
        toast({
          variant: 'warning',
          title: 'kimi/k1 模型已被月之暗面网页版弃用，请切换到最新模型',
          duration: 10000
        })
      })
    }
  }

  /**
   * 发起总结请求
   */
  async generateSummary(
    config: SummaryConfig,
    messages: CoreMessage[]
  ): Promise<SummaryResult> {
    try {
      this.checkSpecialCases(config.model)

      const result = await sendConnectMessage(
        'streamTextViaConnect',
        {
          modelConfig: toRaw(config.model), // Firefox 代理对象问题
          messages: toRaw(messages),
        },
        {
          onError: (e) => {
            this.errorService.handleConnectError(
              e,
              ErrorService.createContext('SummaryService', 'generateSummary')
            )
          }
        }
      )

      return result
    } catch (error) {
      this.errorService.handleConnectError(
        error,
        ErrorService.createContext('SummaryService', 'generateSummary')
      )
      throw error
    }
  }

  /**
   * 计算token使用成本
   */
  calculateTokenCost(
    model: ModelConfigItem,
    inputTokens: number,
    outputTokens: number
  ): number {
    const inputCost = (model.inputTokenPrice ?? 0) * inputTokens / 100_0000
    const outputCost = (model.outputTokenPrice ?? 0) * outputTokens / 100_0000
    return inputCost + outputCost
  }

  /**
   * 更新token使用统计
   */
  updateTokenUsage(
    currentUsage: TokenUsage,
    newInputTokens: number,
    newOutputTokens: number,
    model: ModelConfigItem
  ): TokenUsage {
    const cost = this.calculateTokenCost(model, newInputTokens, newOutputTokens)
    
    return {
      inputToken: currentUsage.inputToken + newInputTokens,
      outputToken: currentUsage.outputToken + newOutputTokens,
      cost: (currentUsage.cost ?? 0) + cost,
      unit: model.priceUnit
    }
  }

  /**
   * 重置token使用统计
   */
  resetTokenUsage(): TokenUsage {
    return {
      inputToken: 0,
      outputToken: 0,
      cost: 0
    }
  }

  /**
   * 验证总结状态
   */
  validateSummaryState(
    status: string,
    currentModel?: ModelConfigItem | null,
    currentPrompt?: any
  ): { isValid: boolean, reason?: string } {
    if (status === 'preparing') {
      return { isValid: false, reason: '请等待配置读取完成' }
    }
    
    if (status === 'running') {
      return { isValid: false, reason: '总结正在进行中' }
    }
    
    if (!currentModel) {
      return { isValid: false, reason: '模型配置缺失，请先创建模型配置' }
    }
    
    if (!currentPrompt) {
      return { isValid: false, reason: '提示词配置缺失，请先创建提示词配置' }
    }
    
    return { isValid: true }
  }
}

// 导出单例实例
export const summaryService = SummaryService.getInstance()
