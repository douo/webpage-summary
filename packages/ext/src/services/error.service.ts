/**
 * 统一错误处理服务
 * 提供标准化的错误处理、日志记录和用户提示
 */

import { toast } from '@/src/components/ui/toast'

export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  metadata?: Record<string, any>
}

export interface ErrorInfo {
  name: string
  message: string
  stack?: string
  statusCode?: number
  url?: string
  responseBody?: string
  context?: ErrorContext
}

export class ErrorService {
  private static instance: ErrorService
  
  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService()
    }
    return ErrorService.instance
  }

  /**
   * 处理连接错误（替代原有的 handleConnectError）
   */
  handleConnectError(error: any, context?: ErrorContext): string {
    const errorInfo = this.parseError(error, context)
    this.logError(errorInfo)
    this.showUserFeedback(errorInfo)
    return this.getErrorMessage(errorInfo)
  }

  /**
   * 处理一般错误
   */
  handleError(error: any, context?: ErrorContext): void {
    const errorInfo = this.parseError(error, context)
    this.logError(errorInfo)
    this.showUserFeedback(errorInfo)
  }

  /**
   * 解析错误对象
   */
  private parseError(error: any, context?: ErrorContext): ErrorInfo {
    return {
      name: error.name || 'UnknownError',
      message: error._message || error.message || JSON.stringify(error),
      stack: error.stack,
      statusCode: error.statusCode,
      url: error.url,
      responseBody: error.responseBody,
      context
    }
  }

  /**
   * 记录错误日志
   */
  private logError(errorInfo: ErrorInfo): void {
    console.error('[ErrorService]', {
      ...errorInfo,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 显示用户反馈
   */
  private showUserFeedback(errorInfo: ErrorInfo): void {
    if (errorInfo.name === 'AI_APICallError') {
      this.showAPICallError(errorInfo)
    } else if (errorInfo.message === 'Failed to fetch') {
      this.showNetworkError(errorInfo)
    } else if (errorInfo.name === 'AI_TypeValidationError') {
      this.showValidationError(errorInfo)
    } else {
      this.showGenericError(errorInfo)
    }
  }

  /**
   * 获取错误消息
   */
  private getErrorMessage(errorInfo: ErrorInfo): string {
    if (errorInfo.name === 'AI_TypeValidationError' && errorInfo.responseBody) {
      return errorInfo.responseBody
    }
    return errorInfo.message
  }

  /**
   * 显示API调用错误
   */
  private showAPICallError(errorInfo: ErrorInfo): void {
    toast({
      title: `${errorInfo.name} ${errorInfo.url} ${errorInfo.statusCode}`,
      description: errorInfo.message || errorInfo.responseBody || 'API调用失败，请检查控制台',
      variant: 'destructive',
    })
  }

  /**
   * 显示网络错误
   */
  private showNetworkError(errorInfo: ErrorInfo): void {
    toast({
      title: `网络错误：${errorInfo.message}`,
      description: '网络连接失败，请检查扩展选项页面的开发者控制台',
      variant: 'destructive',
    })
  }

  /**
   * 显示验证错误
   */
  private showValidationError(errorInfo: ErrorInfo): void {
    toast({
      title: errorInfo.name,
      description: errorInfo.message,
      variant: 'destructive',
    })
  }

  /**
   * 显示通用错误
   */
  private showGenericError(errorInfo: ErrorInfo): void {
    toast({
      title: errorInfo.name || '错误',
      description: errorInfo.message || '发生未知错误',
      variant: 'destructive',
    })
  }

  /**
   * 创建错误上下文
   */
  static createContext(component: string, action: string, metadata?: Record<string, any>): ErrorContext {
    return {
      component,
      action,
      metadata,
      userId: 'anonymous' // 可以根据需要扩展
    }
  }
}

// 导出单例实例
export const errorService = ErrorService.getInstance()

// 便捷方法
export function handleError(error: any, context?: ErrorContext): void {
  errorService.handleError(error, context)
}

export function handleConnectError(error: any, context?: ErrorContext): string {
  return errorService.handleConnectError(error, context)
}
