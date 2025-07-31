/**
 * 总结状态管理 Composable
 * 使用服务层和状态管理重构后的核心逻辑
 */

import { EventEmitter } from 'eventemitter3'
import { onMounted, onUnmounted, provide, inject } from 'vue'
import { createSummaryStore, SummaryStore } from '@/src/stores/summary.store'
import { summaryService } from '@/src/services/summary.service'
import { messageService } from '@/src/services/message.service'
import { errorService, ErrorService } from '@/src/services/error.service'
import { useModelConfigStorage } from '@/src/composables/model-config'
import { usePromptConfigStorage, usePromptDefaultPreset } from '@/src/composables/prompt'
import { getEnableAutoBeginSummary } from '@/src/composables/general-config'
import { onSpaRouteChange } from '@/src/utils/document'
import { simpleParseRead } from '@/src/utils/page-read'
import { writeTextToClipboard } from '@/src/utils/document'
import { toast } from '@/src/components/ui/toast'

// 提供/注入的key
export const SummaryStateKey = Symbol('summary-state')

export interface SummaryComposable extends SummaryStore {
  // 事件监听
  onPrepareDone: (callback: () => void) => void
  onChunk: (callback: (chunk: unknown) => void) => void
  
  // 核心操作
  refreshSummary: () => Promise<void>
  chat: (content: string, role: 'user' | 'assistant') => Promise<void>
  stop: () => Promise<void>
  copyMessages: () => Promise<void>
  resetMessages: () => Promise<void>
  
  // 初始化
  initializeState: () => Promise<void>
}

export function useSummaryState(): SummaryComposable {
  // 创建状态管理
  const store = createSummaryStore()
  
  // 创建事件总线
  const event = new EventEmitter()
  
  // 配置存储
  const modelStorage = useModelConfigStorage()
  const promptStorage = usePromptConfigStorage()
  const promptPreset = usePromptDefaultPreset()
  
  // SPA路由变化监听器
  let disconnectOnSPARouteChange: Function | undefined

  /**
   * 组件挂载时的初始化
   */
  onMounted(async () => {
    await initializeState()
  })

  onUnmounted(() => {
    disconnectOnSPARouteChange?.()
  })

  /**
   * 初始化状态
   */
  async function initializeState(): Promise<void> {
    try {
      // 监听SPA路由变化
      disconnectOnSPARouteChange = onSpaRouteChange(() => {
        const newContent = simpleParseRead()
        store.setWebpageContent(newContent || undefined)
        stop()
        store.resetMessages()
      }).disconnect

      // 加载配置
      const model = await modelStorage.getDefaultItem()
      const prompt = await promptStorage.getDefaultItem()
      
      store.setCurrentModel(model ?? null)
      store.setCurrentPrompt(prompt ?? null)
      
      // 设置网页内容
      const content = simpleParseRead()
      store.setWebpageContent(content || undefined)
      
      // 验证准备状态
      const hasValidConfig = model && prompt && content
      store.setFailed(!hasValidConfig)
      store.setPreparing(false)
      
      event.emit('prepare-done')
      
      // 自动开始总结
      if (await getEnableAutoBeginSummary()) {
        await refreshSummary()
      }
    } catch (e) {
      store.setError(e)
      store.setPreparing(false)
      event.emit('prepare-done')
    }
  }

  /**
   * 事件监听
   */
  function onPrepareDone(callback: () => void): void {
    event.once('prepare-done', callback)
  }

  function onChunk(callback: (chunk: unknown) => void): void {
    event.on('chunk', callback)
  }

  /**
   * 验证是否就绪
   */
  function verifyReady(): boolean {
    const validation = summaryService.validateSummaryState(
      store.status.value,
      store.currentModel.value,
      store.currentPrompt.value
    )
    
    if (!validation.isValid && validation.reason) {
      toast({ 
        title: validation.reason, 
        variant: 'warning' 
      })
      return false
    }
    
    return validation.isValid
  }

  /**
   * 初始化消息
   */
  async function initMessages(): Promise<void> {
    if (!store.currentModel.value || !store.currentPrompt.value || !store.webpageContent.value) {
      throw new Error('配置或内容缺失')
    }

    // 应用内容裁剪
    let processedContent = store.webpageContent.value
    if (store.textContentTrimmer.value && processedContent.textContent) {
      processedContent = {
        ...processedContent,
        textContent: store.textContentTrimmer.value.trim(processedContent.textContent)
      }
    }

    const { messages, uiMessages } = await messageService.initMessages({
      webpageContent: processedContent,
      systemMessage: store.currentPrompt.value.systemMessage || promptPreset.systemMessage,
      userMessage: store.currentPrompt.value.userMessage || promptPreset.userMessage
    })

    store.setMessages(messages)
    store.setUIMessages(uiMessages)
  }

  /**
   * 刷新总结
   */
  async function refreshSummary(): Promise<void> {
    try {
      await chat('', 'assistant')
    } catch (e) {
      console.error(e)
      errorService.handleConnectError(
        e, 
        ErrorService.createContext('SummaryComposable', 'refreshSummary')
      )
    }
  }

  /**
   * 对话功能
   */
  async function chat(content: string, role: 'user' | 'assistant'): Promise<void> {
    if (!verifyReady()) {
      return
    }

    // 初始化消息（如果是第一次）
    if (store.messages.value.length === 0) {
      await initMessages()
    }

    // 添加用户消息
    if (content) {
      messageService.addUserMessage(store.messages.value, store.uiMessages.value, content)
    }

    // 预创建助手消息
    messageService.prepareAssistantMessage(store.uiMessages.value)

    store.setRunning(true)

    try {
      if (!store.currentModel.value) {
        throw new Error('模型配置缺失')
      }

      const result = await summaryService.generateSummary(
        {
          model: store.currentModel.value,
          systemMessage: store.currentPrompt.value?.systemMessage || promptPreset.systemMessage,
          userMessage: store.currentPrompt.value?.userMessage || promptPreset.userMessage
        },
        store.messages.value
      )

      // 处理流式响应
      result.textStream.onChunk((chunk: string) => {
        messageService.updateStreamingMessage(store.uiMessages.value, chunk)
        event.emit('chunk', chunk)
      })

      result.textStream.onChunkComplete(async () => {
        store.setRunning(false)
        
        // 完成助手消息
        messageService.completeAssistantMessage(store.messages.value, store.uiMessages.value)
        
        // 更新token使用统计
        const { inputToken, outputToken } = await result.tokenUsage
        const newUsage = summaryService.updateTokenUsage(
          store.tokenUsage.value,
          inputToken,
          outputToken,
          store.currentModel.value!
        )
        store.setTokenUsage(newUsage)
      })

    } catch (error) {
      store.setRunning(false)
      errorService.handleConnectError(
        error,
        ErrorService.createContext('SummaryComposable', 'chat')
      )
    }
  }

  /**
   * 停止生成
   */
  async function stop(): Promise<void> {
    store.setRunning(false)
    // 这里可以添加实际的停止逻辑
  }

  /**
   * 复制消息
   */
  async function copyMessages(): Promise<void> {
    const text = messageService.formatMessagesForClipboard(store.uiMessages.value)
    await writeTextToClipboard(text)
    toast({ title: '已复制到剪贴板！', variant: 'success' })
  }

  /**
   * 重置消息
   */
  async function resetMessages(): Promise<void> {
    await initMessages()
    store.resetTokenUsage()
    toast({ title: '已重置总结', variant: 'success' })
  }

  return {
    ...store,
    onPrepareDone,
    onChunk,
    refreshSummary,
    chat,
    stop,
    copyMessages,
    resetMessages,
    initializeState
  }
}

/**
 * 提供总结状态
 */
export function provideSummaryState(): SummaryComposable {
  const summaryState = useSummaryState()
  provide(SummaryStateKey, summaryState)
  return summaryState
}

/**
 * 注入总结状态
 */
export function useSummaryStateInject(): SummaryComposable {
  const summaryState = inject(SummaryStateKey)
  if (!summaryState) {
    throw new Error('总结状态未找到，请确保在正确的组件树中使用')
  }
  return summaryState as SummaryComposable
}
