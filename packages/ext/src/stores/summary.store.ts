/**
 * 总结状态管理
 * 分离UI状态和业务状态，提供清晰的状态管理
 */

import { computed, ref, Ref } from 'vue'
import { CoreMessage } from 'ai'
import { UIMessage } from '@/src/types/message'
import { TokenUsage, WebpageContent } from '@/src/types/summary'
import { ModelConfigItem } from '@/src/types/config/model'
import { PromptConfigItem } from '@/src/types/config/prompt'

export type SummaryStatus = 'preparing' | 'failed' | 'ready' | 'running'

export interface SummaryState {
  // 运行状态
  status: Ref<SummaryStatus>
  isRunning: Ref<boolean>
  isFailed: Ref<boolean>
  isPreparing: Ref<boolean>
  error: Ref<any>

  // 消息相关
  messages: Ref<CoreMessage[]>
  uiMessages: Ref<UIMessage[]>

  // 配置相关
  currentModel: Ref<ModelConfigItem | null>
  currentPrompt: Ref<PromptConfigItem | null>

  // 内容相关
  webpageContent: Ref<WebpageContent | undefined>
  
  // 统计相关
  tokenUsage: Ref<TokenUsage>

  // 内容处理
  textContentTrimmer: Ref<{ trim: (s: string) => string }>
}

export function createSummaryState(): SummaryState {
  // 基础状态
  const isRunning = ref(false)
  const isFailed = ref(false)
  const isPreparing = ref(true)
  const error = ref<any>(null)

  // 计算状态
  const status = computed<SummaryStatus>(() => {
    if (isRunning.value) return 'running'
    if (isFailed.value || error.value) return 'failed'
    if (isPreparing.value) return 'preparing'
    return 'ready'
  })

  // 消息状态
  const messages = ref<CoreMessage[]>([])
  const uiMessages = ref<UIMessage[]>([])

  // 配置状态
  const currentModel = ref<ModelConfigItem | null>(null)
  const currentPrompt = ref<PromptConfigItem | null>(null)

  // 内容状态
  const webpageContent = ref<WebpageContent | undefined>()

  // 统计状态
  const tokenUsage = ref<TokenUsage>({
    inputToken: 0,
    outputToken: 0,
  })

  // 内容处理器
  const textContentTrimmer = ref<{ trim: (s: string) => string }>({
    trim: (content: string): string => content
  })

  return {
    status,
    isRunning,
    isFailed,
    isPreparing,
    error,
    messages,
    uiMessages,
    currentModel,
    currentPrompt,
    webpageContent,
    tokenUsage,
    textContentTrimmer
  }
}

export interface SummaryActions {
  // 状态控制
  setRunning: (running: boolean) => void
  setFailed: (failed: boolean) => void
  setPreparing: (preparing: boolean) => void
  setError: (error: any) => void
  clearError: () => void

  // 消息操作
  setMessages: (messages: CoreMessage[]) => void
  setUIMessages: (uiMessages: UIMessage[]) => void
  resetMessages: () => void
  addMessage: (message: CoreMessage) => void
  addUIMessage: (message: UIMessage) => void

  // 配置操作
  setCurrentModel: (model: ModelConfigItem | null) => void
  setCurrentPrompt: (prompt: PromptConfigItem | null) => void

  // 内容操作
  setWebpageContent: (content: WebpageContent | undefined) => void

  // 统计操作
  setTokenUsage: (usage: TokenUsage) => void
  resetTokenUsage: () => void

  // 内容处理器
  setTextContentTrimmer: (trimmer: { trim: (s: string) => string }) => void
}

export function createSummaryActions(state: SummaryState): SummaryActions {
  return {
    // 状态控制
    setRunning: (running: boolean) => {
      state.isRunning.value = running
    },
    setFailed: (failed: boolean) => {
      state.isFailed.value = failed
    },
    setPreparing: (preparing: boolean) => {
      state.isPreparing.value = preparing
    },
    setError: (error: any) => {
      state.error.value = error
    },
    clearError: () => {
      state.error.value = null
    },

    // 消息操作
    setMessages: (messages: CoreMessage[]) => {
      state.messages.value = messages
    },
    setUIMessages: (uiMessages: UIMessage[]) => {
      state.uiMessages.value = uiMessages
    },
    resetMessages: () => {
      state.messages.value = []
      state.uiMessages.value = []
    },
    addMessage: (message: CoreMessage) => {
      state.messages.value.push(message)
    },
    addUIMessage: (message: UIMessage) => {
      state.uiMessages.value.push(message)
    },

    // 配置操作
    setCurrentModel: (model: ModelConfigItem | null) => {
      state.currentModel.value = model
    },
    setCurrentPrompt: (prompt: PromptConfigItem | null) => {
      state.currentPrompt.value = prompt
    },

    // 内容操作
    setWebpageContent: (content: WebpageContent | undefined) => {
      state.webpageContent.value = content
    },

    // 统计操作
    setTokenUsage: (usage: TokenUsage) => {
      state.tokenUsage.value = usage
    },
    resetTokenUsage: () => {
      state.tokenUsage.value = {
        inputToken: 0,
        outputToken: 0,
        cost: 0
      }
    },

    // 内容处理器
    setTextContentTrimmer: (trimmer: { trim: (s: string) => string }) => {
      state.textContentTrimmer.value = trimmer
    }
  }
}

// 组合状态和动作
export interface SummaryStore extends SummaryState, SummaryActions {}

export function createSummaryStore(): SummaryStore {
  const state = createSummaryState()
  const actions = createSummaryActions(state)
  
  return {
    ...state,
    ...actions
  }
}
