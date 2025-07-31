/**
 * 消息服务
 * 处理消息流、格式化、渲染等功能
 */

import { CoreMessage } from 'ai'
import { UIMessage } from '@/src/types/message'
import { WebpageContent } from '@/src/types/summary'
import { renderMessages } from '@/src/utils/prompt'
import { getSummaryLanguage } from '@/src/composables/general-config'

export interface MessageContext {
  webpageContent?: WebpageContent
  summaryLanguage?: string
  systemMessage?: string
  userMessage?: string
}

export class MessageService {
  private static instance: MessageService

  static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService()
    }
    return MessageService.instance
  }

  /**
   * 初始化消息列表
   */
  async initMessages(context: MessageContext): Promise<{
    messages: CoreMessage[]
    uiMessages: UIMessage[]
  }> {
    const { systemMessage, userMessage, webpageContent } = context
    
    if (!systemMessage || !userMessage) {
      throw new Error('系统消息或用户消息未配置')
    }

    const messages: CoreMessage[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ]

    // 处理网页内容
    if (webpageContent) {
      await this.processWebpageContent(messages, webpageContent)
    } else {
      throw new Error('网页内容为空')
    }

    // 初始化UI消息（前两条隐藏）
    const uiMessages: UIMessage[] = messages.map(m => ({
      at: Date.now(),
      content: m.content as string,
      role: m.role as 'system' | 'user',
      hide: true
    }))

    return { messages, uiMessages }
  }

  /**
   * 处理网页内容
   */
  private async processWebpageContent(messages: CoreMessage[], webpageContent: WebpageContent): Promise<void> {
    // 确保文本内容存在
    if (!webpageContent.textContent) {
      webpageContent.textContent = ''
    }

    // 构建总结输入对象
    const summaryInput = {
      ...webpageContent,
      summaryLanguage: await getSummaryLanguage()
    }

    // 渲染消息模板
    renderMessages(messages, summaryInput)
  }

  /**
   * 添加用户消息
   */
  addUserMessage(
    messages: CoreMessage[], 
    uiMessages: UIMessage[], 
    content: string
  ): void {
    messages.push({
      role: 'user',
      content: content
    })

    uiMessages.push({
      role: 'user',
      content: content,
      at: Date.now()
    })
  }

  /**
   * 预创建助手消息
   */
  prepareAssistantMessage(uiMessages: UIMessage[]): void {
    uiMessages.push({
      role: 'assistant',
      content: '',
      at: Date.now()
    })
  }

  /**
   * 完成助手消息
   */
  completeAssistantMessage(
    messages: CoreMessage[],
    uiMessages: UIMessage[]
  ): void {
    const lastUIMessage = uiMessages[uiMessages.length - 1]
    if (lastUIMessage && lastUIMessage.role === 'assistant') {
      messages.push({
        role: 'assistant',
        content: lastUIMessage.content
      })
    }
  }

  /**
   * 更新流式消息内容
   */
  updateStreamingMessage(uiMessages: UIMessage[], chunk: string): void {
    const lastMessage = uiMessages[uiMessages.length - 1]
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.content += chunk
    }
  }

  /**
   * 格式化消息为剪贴板文本
   */
  formatMessagesForClipboard(uiMessages: UIMessage[]): string {
    return uiMessages
      .filter(m => !m.hide)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n' + '-'.repeat(50) + '\n')
  }

  /**
   * 重置消息列表
   */
  resetMessages(): { messages: CoreMessage[], uiMessages: UIMessage[] } {
    return {
      messages: [],
      uiMessages: []
    }
  }

  /**
   * 获取可见消息数量
   */
  getVisibleMessageCount(uiMessages: UIMessage[]): number {
    return uiMessages.filter(m => !m.hide).length
  }
}

// 导出单例实例
export const messageService = MessageService.getInstance()
