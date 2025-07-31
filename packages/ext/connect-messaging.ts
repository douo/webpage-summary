/**
 * 浏览器扩展长连接消息传递封装库
 * 
 * 主要功能：
 * 1. 类型安全的消息传递接口
 * 2. 支持流式数据传输（用于 AI 文本生成等场景）
 * 3. 混合响应类型处理（原始值、Promise、流式数据）
 * 4. 跨扩展上下文的可靠通信
 * 
 * 使用场景：
 * - AI 流式文本生成
 * - 大数据分块传输
 * - 复杂异步操作的结果传递
 */

import { CoreMessage } from "ai";
import { browser } from "wxt/browser";
import { ModelConfigItem } from "./src/types/config/model";
import { PromptConfigItem } from "./src/types/config/prompt";
import { TokenUsage } from "./src/types/summary";

/**
 * 消息协议定义接口
 * 定义了扩展不同部分之间可以交换的消息结构
 * 每个键代表不同的消息类型，对应的值是定义该消息输入和输出类型的函数签名
 */
interface ProtocolMap {
  /**
   * 通过长连接进行流式文本生成
   * 用于 AI 模型的流式响应，同时返回 token 使用统计和文本流
   */
  streamTextViaConnect(input: {
    messages: CoreMessage[];      // AI 对话消息列表
    modelConfig: ModelConfigItem; // AI 模型配置
  }): {
    tokenUsage: Promise<TokenUsage>; // 异步返回的 token 统计
    textStream: ChunkConsumer;       // 流式文本数据
  };

  /**
   * 测试函数 - 演示多种返回类型的混合使用
   * 展示如何同时返回原始值、Promise 和流式数据
   */
  func1(input: { p1: string; p2: number; p3: boolean }): {
    r1: string;           // 原始值
    r2: Promise<string>;  // 异步值
    r3: ChunkConsumer;    // 流式数据
  };
}

// 导出类型安全的消息传递函数
export const { onConnectMessage, sendConnectMessage } = defineConnectMessage();

/*
=== defineConnectMessage 的具体实现 ===
以下是核心实现代码，包含完整的类型系统和消息处理逻辑
*/

// 输入类型定义：可以是记录对象或任意类型
type InputType = Record<string, any> | any;

// 结果类型定义：可以包含任意类型、Promise 或流式消费者的记录对象
type ResultType = Record<string, any | Promise<any> | ChunkConsumer>;

// 消息类型定义：接受输入并返回结果的函数类型
type MessageType<I extends InputType, O extends ResultType> = (input: I) => O;

// 获取函数第一个参数的类型
type FirstParameter<T extends (args: any) => any> = T extends (
  args: infer P
) => any
  ? P
  : never;

/**
 * 流式数据消费者接口
 * 用于处理流式数据，其中 onChunk 在每个数据块到达时调用，onComplete 在流结束时调用
 */
type ChunkConsumer = {
  onChunk: (callback: (v: unknown) => void) => void;           // 设置数据块处理回调
  onChunkComplete: (callback: () => void) => void;            // 设置流完成回调
};

/**
 * 消息监听器类型（用于 background.js 中注册消息处理器）
 * 表示注册回调函数的函数，当接收到特定键的消息时执行该回调
 */
type OnMessage = <T extends keyof ProtocolMap>(
  key: T,
  func: (
    input: FirstParameter<ProtocolMap[T]>,
    opt: {
      // 标记返回值类型的回调，让发送方知道响应每个字段的期望类型
      markReturn: (param: MarkReturnValue<ReturnType<ProtocolMap[T]>>) => void;
      // 指示消息处理完成的回调，表示处理器已完成处理
      complete: () => void;
      // 解析返回值中 Promise 的回调，用于异步响应
      resolve: <K extends keyof ReturnType<ProtocolMap[T]>>(
        key: K,
        value: unknown
      ) => void;
      // 发送数据块的回调，用于流式响应
      chunk: <K extends keyof ReturnType<ProtocolMap[T]>>(
        key: K,
        value: unknown
      ) => void;
      // 指示分块数据流结束的回调，表示流式响应的结束
      chunkEnd: <K extends keyof ReturnType<ProtocolMap[T]>>(key: K) => void;
      // 错误处理回调
      error: (error: Error) => void;
    }
  ) => void
) => void;

/**
 * 消息发送器类型
 * 表示发送带有特定键和输入的消息，并返回解析为响应的 Promise 的函数
 */
type SendMessage = <T extends keyof ProtocolMap>(
  key: T,
  input: FirstParameter<ProtocolMap[T]>,
  opts?: {
    onError?: (e: any) => void;  // 可选的错误处理回调
  }
) => Promise<ReturnType<ProtocolMap[T]> & { stop: CallableFunction }>;

/**
 * 连接消息类型（用于 .postMessage()）
 * 表示发送方和接收方之间内部交换的消息结构
 */
type ConnectMessage = {
  type: "markReturn" | "resolve" | "chunk" | "chunkEnd" | "error" | "stop";
  key: string;
  value: unknown;
};

/**
 * 标记返回值类型
 * 用于指示响应中的字段是原始值、Promise 还是分块流
 */
type MarkReturnValue<
  T extends Record<string, any> = Record<string, any>,
  K extends keyof T = keyof T
> = {
  type: "raw" | "promise" | "chunk";  // 数据类型：原始值 | Promise | 流式数据
  key: K;                             // 字段键名
  value?: T[K];                       // 可选的值（用于原始类型）
}[];

/**
 * 定义连接消息函数的核心实现
 * 返回包含 onConnectMessage 和 sendConnectMessage 函数的对象
 * 
 * 这是整个消息传递系统的核心，实现了：
 * 1. 类型安全的消息路由
 * 2. 多种数据类型的混合处理
 * 3. 长连接的建立和管理
 * 4. 流式数据的分块传输
 */
function defineConnectMessage(): {
  onConnectMessage: OnMessage;
  sendConnectMessage: SendMessage;
} {
  return {
    /**
     * 注册特定键的消息处理器（通常在 Background Script 中使用）
     * 
     * @param key - 消息键，这是处理器响应的消息名称
     * @param callbackFunc - 处理消息的回调函数，当接收到指定键的消息时执行
     * 
     * 工作流程：
     * 1. 监听以特定名称模式建立的连接
     * 2. 接收第一条消息作为输入参数
     * 3. 提供各种响应回调（原始值、Promise、流式数据）
     * 4. 执行用户定义的处理逻辑
     */
    onConnectMessage: (key, callbackFunc) => {
      const NAME_KEY = `onConnectMessage:${key}`;
      let input = {} as any;
      browser.runtime.onConnect.addListener((port) => {
        // 按 NAME_KEY 过滤，只处理具有正确名称的连接
        if (port.name !== NAME_KEY) return;
        let isPortDisconnect = false;
        port.onDisconnect.addListener(() => {
          console.debug(`[${NAME_KEY}][onDisconnect]`);
          isPortDisconnect = true;
        });
        const onMessageListener = (_msg: any) => {
          // 第一条消息是输入参数
          input = _msg;

          /**
           * 标记返回值类型
           * @param retVal - 返回值类型数组，描述响应字段的期望类型
           */
          const markReturn: Parameters<typeof callbackFunc>[1]["markReturn"] = (
            retVal
          ) => {
            port.postMessage({ type: "markReturn", value: retVal });
          };

          /**
           * 指示消息处理完成
           * 关闭端口连接，清理资源
           */
          const complete: Parameters<
            typeof callbackFunc
          >[1]["complete"] = () => {
            port.disconnect();
            // 端口关闭时无需手动移除监听器
          };

          /**
           * 发送数据块
           * @param key - 分块数据的键，标识该块属于哪个字段
           * @param val - 块数据，正在发送的实际数据
           */
          const chunk: Parameters<typeof callbackFunc>[1]["chunk"] = (
            key,
            val
          ) => {
            port.postMessage({ type: "chunk", key: key, value: val });
          };

          /**
           * 指示分块数据流的结束
           * @param key - 分块数据的键，标识哪个流正在结束
           */
          const chunkEnd: Parameters<typeof callbackFunc>[1]["chunkEnd"] = (
            key
          ) => {
            port.postMessage({ type: "chunkEnd", key: key });
          };

          /**
           * 解析返回值中的 Promise
           * @param key - Promise 的键，标识要解析哪个 Promise
           * @param val - 解析值，Promise 将解析为的值
           */
          const resolve: Parameters<typeof callbackFunc>[1]["resolve"] = (
            key,
            val
          ) => {
            port.postMessage({ type: "resolve", key: key, value: val });
          };

          /**
           * 错误处理
           * @param e - 错误对象
           */
          const error = (e: Error) => {
            if (isPortDisconnect) return;
            port.postMessage({ type: "error", key: "error", value: e });
          };
          
          // 执行用户定义的消息处理逻辑
          callbackFunc(input, {
            markReturn,
            complete,
            chunk,
            chunkEnd,
            resolve,
            error,
          });
        };
        port.onMessage.addListener(onMessageListener);
      });
    },

    /**
     * 发送连接消息（通常在 Content Script 或其他上下文中使用）
     * 
     * @param key - 消息键，要发送的消息名称
     * @param input - 输入数据，要随消息发送的数据
     * @param opt - 可选配置，包含错误处理等选项
     * @returns 返回解析为消息处理器返回值的 Promise
     * 
     * 工作流程：
     * 1. 建立到 Background Script 的长连接
     * 2. 发送输入数据
     * 3. 等待响应类型标记
     * 4. 根据类型构建相应的响应对象（原始值/Promise/流）
     * 5. 处理后续的数据传输
     */
    sendConnectMessage: (key, input, opt) => {
      const NAME_KEY = `onConnectMessage:${key}`;
      const connectPort = browser.runtime.connect({ name: NAME_KEY });
      
      /*
       * 创建状态容器
       * 这些变量用于存储与响应相关的回调和数据
       */
      let markReturnResolve: (v: any) => void; // 用标记的返回值解析主 Promise 的回调
      let returnValuePromiseMap: Record<string, (v: any) => void> = {}; // Promise 键到其解析函数的映射
      let returnValueChunkFuncMap: Record<string, (v: any) => void> = {}; // 块键到其块函数的映射
      let returnValueChunkCompleteFuncMap: Record<string, (v: any) => void> =
        {}; // 块键到其完成函数的映射
      let onErrorHook = opt?.onError;
      const result = new Promise<any>((resolve, reject) => {
        markReturnResolve = resolve; // 将解析函数分配给 markReturnResolve
      });

      connectPort.onMessage.addListener((_msg: any, port) => {
        const msg = _msg as ConnectMessage;
        if (msg.type === "markReturn") {
          // 处理 'markReturn' 消息，表示响应的结构
          const markReturnValue = msg.value as MarkReturnValue;
          const returnValue = {} as any;
          // 遍历标记的返回值并构建响应对象
          for (const v of markReturnValue) {
            if (v.type === "raw") {
              // 如果类型是 'raw'，直接将值分配给相应的键
              returnValue[v.key] = v.value;
            } else if (v.type === "promise") {
              // 如果类型是 'promise'，创建新的 Promise 并存储其解析函数
              const newPromise = new Promise<typeof v.value>(
                (resolve, reject) => {
                  returnValuePromiseMap[v.key] = resolve;
                }
              );
              returnValue[v.key] = newPromise;
            } else if (v.type === "chunk") {
              // 如果类型是 'chunk'，创建块处理器并存储其函数
              const { onChunk, chunk, onChunkComplete, chunkComplete } =
                createChunkProcessor();
              returnValueChunkFuncMap[v.key] = chunk;
              returnValueChunkCompleteFuncMap[v.key] = chunkComplete;
              returnValue[v.key] = { onChunk, onChunkComplete };
            }
          }
          // 用构建的返回值对象解析主 Promise
          markReturnResolve({
            ...returnValue,
            stop: () => {
              console.log("手动停止端口连接:", port.name);
              port.disconnect();
            },
          });
        } else if (msg.type === "resolve") {
          // 处理 'resolve' 消息，解析响应中的 Promise
          returnValuePromiseMap[msg.key]!(msg.value);
        } else if (msg.type === "chunk") {
          // 处理 'chunk' 消息，为流式响应发送数据块
          returnValueChunkFuncMap[msg.key]!(msg.value);
        } else if (msg.type === "chunkEnd") {
          // 处理 'chunkEnd' 消息，表示分块流的结束
          returnValueChunkCompleteFuncMap[msg.key]!(msg.value);
        } else if (msg.type === "error") {
          // 处理错误消息
          if (onErrorHook) {
            onErrorHook(msg.value);
          } else {
            throw msg.value;
          }
        } else {
          throw new Error("意外的消息类型:" + msg.type);
        }
      });

      // 发送初始消息，将输入数据发送给消息处理器
      connectPort.postMessage(input);

      return result; // 返回将用响应解析的 Promise
    },
  };
}

/**
 * 创建流式数据处理器
 * 该函数封装了处理分块数据流的逻辑
 * 
 * @returns 包含 onChunk、chunk、onChunkComplete 和 chunkComplete 函数的对象
 * 
 * 工作原理：
 * - 生产者（发送方）使用 chunk() 发送数据块
 * - 消费者（接收方）使用 onChunk() 设置处理回调
 * - 流结束时调用 chunkComplete() 触发完成回调
 */
function createChunkProcessor() {
  let chunkCallback: (c: any) => void = () => {};     // 数据块处理回调
  let chunkCompleteCallback: () => void = () => {};   // 流完成回调
  let isCompleted = false;                            // 完成状态标记

  // 生产者使用此方法设置回调函数（生产者是块的发送方）
  const onChunk = (callbackfunc: (c: any) => void) => {
    chunkCallback = callbackfunc;
  };

  // 生产者使用此方法添加块并触发回调
  const chunk = (data: any) => {
    if (!isCompleted) {
      chunkCallback(data);
    }
  };

  // 消费者使用此方法设置处理每个块时的回调（消费者是块的接收方）
  const onChunkComplete = (callbackfunc: () => void) => {
    chunkCompleteCallback = callbackfunc;
  };

  // 标记消费完成
  const chunkComplete = () => {
    isCompleted = true;
    chunkCompleteCallback();
  };

  return {
    onChunk,
    chunk,
    onChunkComplete,
    chunkComplete,
  };
}
