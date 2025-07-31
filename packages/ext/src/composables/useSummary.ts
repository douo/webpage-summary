/**
 * 网页总结功能的核心 Composable
 * 
 * 职责：
 * - 网页内容提取和处理
 * - AI 模型配置管理
 * - 消息流处理（与 AI 对话）
 * - SPA 路由变化监听
 * - 流式文本生成
 * 
 * 状态机：preparing → ready → running → ready
 *                ↓       ↓      ↓
 *             failed ← failed ← failed
 * 
 * 设计模式：
 * - 观察者模式：EventEmitter 处理事件通信
 * - 状态机模式：管理组件的各种状态
 * - 策略模式：可替换的内容处理策略
 */

import { sendConnectMessage } from '@/connect-messaging';
import { CoreMessage } from 'ai';
import { EventEmitter } from 'eventemitter3';
import { computed, onMounted, onUnmounted, Ref, ref, toRaw } from 'vue';
import { toast } from '../components/ui/toast';
import { ModelConfigItem } from '../types/config/model';
import { PromptConfigItem } from '../types/config/prompt';
import { UIMessage } from '../types/message';
import { TokenUsage, WebpageContent } from '../types/summary';
import { handleConnectError } from '../utils/error-parse';
import { renderMessages } from '../utils/prompt';
import { getEnableAutoBeginSummary, getSummaryLanguage } from './general-config';
import { useModelConfigStorage } from './model-config';
import { usePromptConfigStorage, usePromptDefaultPreset } from './prompt';
import { writeTextToClipboard, onSpaRouteChange } from '../utils/document';
import { simpleParseRead } from '../utils/page-read';



export function useSummary() {
  // SPA 路由变化监听器的断开函数
  let disconnectOnSPARouteChange: Function
  
  /**
   * 组件挂载时的初始化逻辑
   * 1. 监听 SPA 路由变化
   * 2. 加载配置（模型、提示词）
   * 3. 验证准备状态
   * 4. 触发准备完成事件
   * 5. 自动开始总结（如果配置开启）
   */
  onMounted(async () => {
    /* 监听 SPA 变化，更新网页内容 */
    disconnectOnSPARouteChange = onSpaRouteChange(() => {
      webpageContent.value = simpleParseRead() || undefined
      stop();
      messages.value = [] // 重置消息
      uiMessages.value = [] // 重置 UI 消息

    }).disconnect

    try {
      currentModel.value = await modelStorage.getDefaultItem()
      currentPrompt.value = await promptStorage.getDefaultItem()
      isFailed.value = !(currentModel.value && currentPrompt.value && webpageContent.value)
      isPreparing.value = false
      event.emit('prepare-done')
      if (await getEnableAutoBeginSummary()) {
        await refreshSummary()
      }
    } catch (e) {
      error.value = (e)
      event.emit('prepare-done')
    }
  })
  onUnmounted(() => {
    disconnectOnSPARouteChange?.()
  })

  // UI 显示的消息列表（包含时间戳、隐藏状态等 UI 相关信息）
  const uiMessages = ref<UIMessage[]>([])
  // 发送给 AI 的原始消息列表
  const messages = ref<CoreMessage[]>([])

  // 运行状态管理
  const isRunning = ref(false)    // 是否正在生成总结
  const isFailed = ref(false)     // 是否失败
  const isPreparing = ref(true)   // 是否正在准备中

  /**
   * 计算属性：组件状态机
   * 状态流转：preparing → ready → running → ready
   *                ↓       ↓      ↓
   *             failed ← failed ← failed
   */
  const status = computed<'preparing' | 'failed' | 'ready' | 'running'>(() => {

    if (isRunning.value) {
      return 'running'
    }

    if (isFailed.value || error.value) {
      return 'failed'
    }

    if (isPreparing.value) {
      return 'preparing'
    }

    return 'ready'
  })
  const error = ref<any>()
  let stopFunction: CallableFunction | null = null

  /**
   * 内容处理策略（策略模式）
   * 用于处理网页内容的长度裁剪，可以动态替换不同的处理策略
   * 默认是直接返回原内容的函数
   */
  const textContentTrimmer = ref<{ trim: (s: string) => string }>({ trim: (content: string): string => content })
  // const inputContentLengthInfo = reactive<{
  //   totalLength?: number,
  //   clipedLength?: number,
  // }>({})

  // 配置存储
  const modelStorage = useModelConfigStorage()
  const promptStorage = usePromptConfigStorage()

  // 当前使用的配置
  const currentModel = ref<ModelConfigItem | null>()
  const currentPrompt = ref<PromptConfigItem | null>()

  // 默认提示词预设
  const promptPreset = usePromptDefaultPreset()
  // Token 使用统计和费用计算
  const tokenUsage = ref<TokenUsage>({
    inputToken: 0,
    outputToken: 0,
  })

  // 当前网页内容（从页面解析获得）
  let webpageContent: Ref<WebpageContent | undefined> = ref(simpleParseRead() || undefined)

  // 事件总线（观察者模式）
  const event = new EventEmitter()

  /**
   * 监听准备完成事件（一次性）
   * 用于在组件准备完成后执行回调
   */
  function onPrepareDone(onReadyHook: () => void) {
    event.once('prepare-done', onReadyHook)
  }

  /**
   * 监听文本块事件（持续监听）
   * 用于处理流式文本生成的每个文本块
   */
  function onChunk(onChunkHook: (chunk: unknown) => void) {
    event.on('chunk', onChunkHook)
  }
  

  /**
   * 验证组件是否准备就绪
   * 根据不同状态给出相应的用户提示
   */
  function verfiyReady() {
    if (status.value === 'ready') {
      return true
    }
    if (status.value === 'preparing') {
      toast({ title: "Please wait for the config-reading to be ready", variant: 'warning' })
    } else if (status.value === 'running') {
      return false
    }
    return true
  }

  /**
   * 初始化消息列表
   * 1. 构建系统消息和用户消息
   * 2. 处理网页内容（裁剪、模板渲染）
   * 3. 初始化 UI 消息（前两条隐藏）
   */
  async function initMessages() {
    if (!currentModel.value || !currentPrompt.value) {
      throw new Error("Model or Prompt is not ready")
    }
    messages.value = [
      { role: 'system', content: currentPrompt.value?.systemMessage ?? promptPreset.systemMessage },
      { role: 'user', content: currentPrompt.value?.userMessage ?? promptPreset.userMessage },
    ]
    /*
     * 渲染消息模板并处理内容长度超限
     */
    if (webpageContent.value) {
      if (!webpageContent.value.textContent) webpageContent.value.textContent = ''

      // 应用内容裁剪策略
      if (textContentTrimmer.value) {
        webpageContent.value.textContent = textContentTrimmer.value.trim(webpageContent.value.textContent)
      }
      const summaryInput = {
        ...webpageContent.value,
        summaryLanguage: await getSummaryLanguage()
      }
      renderMessages(messages.value, summaryInput)
    } else {
      throw new Error('webpage content is empty')
    }

    // 初始化 UI 消息，前两条消息（系统消息和初始用户消息）设为隐藏
    uiMessages.value = messages.value.map(m => ({
      at: Date.now(),
      content: m.content as string,
      role: m.role as 'system' | 'user',
      hide: true
    }))
  }

  /**
   * 刷新总结
   * 通过调用 chat 函数开始新的总结对话
   */
  async function refreshSummary() {
    try {
      await chat('', 'assistant')
    } catch (e) {
      console.error(e)
      error.value = handleConnectError(e)
    }

  }

  /**
   * 复制所有消息到剪贴板
   * 格式化为易读的文本格式
   */
  async function copyMessages() {
    const text=uiMessages.value.map(m => m.role + ':  ' + m.content).join('\n' + '-'.repeat(50) + '\n')
    await writeTextToClipboard(text)
    // await navigator.clipboard.writeText()
    toast({ title: "copied to clipboard success!", variant: 'success' })
  }

  /**
   * 核心对话函数 - 处理流式对话
   * 
   * @param content - 消息内容（可以为空字符串，用于触发初始总结）
   * @param role - 消息角色
   * 
   * 流程：
   * 1. 状态检查
   * 2. 初始化消息（如果是第一次）
   * 3. 添加用户消息
   * 4. 预创建 AI 回复消息
   * 5. 发起流式请求
   * 6. 处理流式响应
   * 7. 计算 token 使用量和费用
   */
  async function chat(content: string, role: 'user' | 'assistant') {
    if (!verfiyReady()) {
      return
    }
    if (messages.value.length == 0) {
      await initMessages()
    }
    /* content 可以为空字符串，用于重用此函数来触发包含前两条消息的初始总结 */
    if (content) {
      messages.value.push({
        role: role, content: content
      })

      // 显示用户输入消息
      if (role === 'user') {
        uiMessages.value.push({ role: 'user', content: content, at: Date.now() })
      }
    }

    // 预创建最新的助手消息（空内容，准备接收流式文本）
    uiMessages.value.push({ role: 'assistant', content: '', at: Date.now() })


    isRunning.value = true
    const { textStream, tokenUsage: newTokenUsage, stop } = await sendConnectMessage(
      'streamTextViaConnect',
      {
        modelConfig: toRaw(currentModel.value!), // Firefox 如果是代理对象会抛出异常
        messages: toRaw(messages.value),
      },
      {
        onError: (e) => {
          isRunning.value = false
          isPreparing.value = false
          isFailed.value = true

          error.value = handleConnectError(e)

        }
      }
    )
    // console.log(textStream)
    textStream.onChunk((c) => {
      uiMessages.value[uiMessages.value.length - 1].content += c
      event.emit('chunk', c)
    })
    
    // 处理流式完成
    textStream.onChunkComplete(async () => {
      isRunning.value = false

      /* 将完整消息推送到消息列表 */
      messages.value.push({ role: 'assistant', content: uiMessages.value[uiMessages.value.length - 1].content })

      /* 计算 token 使用量和费用 */
      const { inputToken, outputToken } = await newTokenUsage
      const cost = (currentModel.value?.inputTokenPrice ?? 0) * inputToken / 100_0000 + (currentModel.value?.outputTokenPrice ?? 0) * outputToken / 100_0000

      tokenUsage.value = {
        inputToken: tokenUsage.value.inputToken + inputToken,
        outputToken: tokenUsage.value.outputToken + outputToken,
        cost: cost,
        unit: currentModel.value?.priceUnit
      }
    })
  }

  /**
   * 停止当前总结生成
   */
  async function stop() {
    isRunning.value = false
    if (!stopFunction) {
      // console.error("stop function is not defined")
      return
    }
    stopFunction()
  }

  async function resetMessages() {
    await initMessages()
    tokenUsage.value = { inputToken: 0, outputToken: 0, cost: 0 }
    toast({ title: 'reset summary.', variant: 'success' })
  }

  return {
    status,
    error,
    uiMessages,
    webpageContent,
    onChunk,
    onPrepareDone: onPrepareDone,
    chat,
    stop,
    refreshSummary,
    currentModel,
    currentPrompt,
    tokenUsage,
    textContentTrimmer,
    copyMessages,
    resetMessages
  }
}