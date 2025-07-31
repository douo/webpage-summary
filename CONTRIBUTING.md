# CONTRIBUTING

## key dependencies
1. [wxt](https://github.com/wxt-dev/wxt)
2. vue3
3. tailwind
4. [shadcn-vue](https://github.com/unovue/shadcn-vue)
5. [vercel/ai](https://github.com/vercel/ai)

## directory structure
```
packages/ext/
├── app.config.ts     #runtime contfig(version, ...)
├── components.json   #shadcn-vue config
├── connect-messaging.ts   #wrapper for .connect message api 
├── messaging.ts      #message defination @webext-core/messaging 
├── public/
│   ├── _locals/    #i18n jsons
│   └── ... 
├── entrypoints/      #browser extension scripts entrypoints
│   ├── background/ 
│   ├── options/    
│   ├── page.content/  #content scripts
│   └── popup/      
├── src/              
│   ├── components/    #resuable(for content/options) components 
│   │   ├── debug/     #will not be packaged into build
│   │   ├── custom-ui/ #custom shadcn-vue components
│   │   ├── ui/        #shadcn-vue generates
│   │   └── ...
│   ├── composables/     # composables(hooks)
│   ├── constants/       
│   ├── model-providers/  # create obj using user's llm config
│   ├── presets/          
│   ├── types/
│   └── utils/  
```

## 本地开发

### 基础开发命令
```sh
cd packages/ext
pnpm install

# Chrome 开发模式（默认）
pnpm run dev

# Firefox 开发模式
pnpm run dev:firefox

# Edge 开发模式
pnpm run dev:edge
```

### 开发模式特性
- 扩展名称会自动添加 `(DEV)` 前缀和浏览器标识
- 支持热重载（HMR）
- 自动重新构建和重新加载扩展

## 实时调试

### 1. 浏览器开发者工具调试

#### Chrome/Edge 调试：
1. 打开 `chrome://extensions/` 或 `edge://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `.output/chrome-mv3` 目录

#### Firefox 调试：
1. 打开 `about:debugging`
2. 点击"此 Firefox"
3. 点击"临时载入附加组件"
4. 选择 `.output/firefox-mv2/manifest.json`

### 2. VSCode 调试配置

#### 创建调试配置文件
创建 `.vscode/launch.json` 文件：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Chrome Extension",
      "type": "chrome",
      "request": "launch",
      "url": "chrome://extensions/",
      "webRoot": "${workspaceFolder}/packages/ext",
      "sourceMaps": true,
      "userDataDir": "${workspaceFolder}/.vscode/chrome-debug-profile",
      "runtimeArgs": [
        "--load-extension=${workspaceFolder}/packages/ext/.output/chrome-mv3",
        "--disable-extensions-except=${workspaceFolder}/packages/ext/.output/chrome-mv3"
      ]
    },
    {
      "name": "Attach to Chrome Extension",
      "type": "chrome",
      "request": "attach",
      "port": 9222,
      "webRoot": "${workspaceFolder}/packages/ext",
      "sourceMaps": true
    },
    {
      "name": "Debug Extension Background",
      "type": "chrome",
      "request": "attach",
      "port": 9222,
      "webRoot": "${workspaceFolder}/packages/ext",
      "sourceMaps": true,
      "urlFilter": "chrome-extension://*"
    }
  ]
}
```

#### 启用 Source Maps
在 `wxt.config.ts` 中启用 source maps：

```typescript
build: {
  sourcemap: true, // 启用此选项
  rollupOptions: {
    // ...
  }
}
```

#### VSCode 调试步骤

**方法一：直接启动调试**
1. 先运行 `pnpm run dev` 构建扩展
2. 在 VSCode 中按 `F5` 或点击"运行和调试"
3. 选择"Launch Chrome Extension"配置
4. Chrome 会自动启动并加载扩展

**方法二：附加到现有 Chrome 实例**
1. 启动 Chrome 并启用调试端口：
   ```bash
   # macOS
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   
   # Windows
   chrome.exe --remote-debugging-port=9222 --user-data-dir=c:\temp\chrome-debug
   ```
2. 手动加载扩展到 Chrome
3. 在 VSCode 中选择"Attach to Chrome Extension"配置
4. 按 `F5` 开始调试

### 3. 内置调试组件

项目提供了丰富的调试组件，位于 `src/components/debug/` 目录：

- **DebugPanel.vue** - 主调试面板
- **DebugPanelForContentScript.vue** - 内容脚本调试面板
- **ConnectMessageDebug.vue** - 消息通信调试
- **StorageDebug.vue** - 存储调试
- **SummaryBoxDebug.vue** - 摘要功能调试
- **TestSummary.vue** - 摘要测试组件
- **MessageDebug.vue** - 消息系统调试
- **FetchDebug.vue** - 网络请求调试

这些调试组件在开发模式下会被包含在构建中，生产模式会被自动排除。

### 4. 不同上下文的调试

#### Background Script 调试：
- 在扩展管理页面点击"检查视图：背景页"
- 或在扩展详情页面点击"背景页"链接
- 在 `entrypoints/background/index.ts` 中设置断点

#### Content Script 调试：
- 在目标网页上按 F12 打开开发者工具
- Content Script 的日志会显示在 Console 中
- 在 `entrypoints/page.content/App.vue` 中设置断点

#### Popup 调试：
- 右键点击扩展图标
- 选择"检查弹出内容"
- 在 popup 相关文件中设置断点

### 5. 调试最佳实践

#### 分层调试：
- **Background Script**：扩展生命周期、API 调用
- **Content Script**：页面交互、DOM 操作
- **Popup**：用户界面、设置管理

#### 使用调试组件：
- 在开发时启用相关调试面板
- 监控消息通信和数据流

#### 错误处理：
- 在关键位置添加 try-catch
- 使用 `ErrorComponent.vue` 显示错误

#### 常用调试技巧：
```javascript
// 1. 条件日志
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// 2. 错误边界
try {
  // 危险操作
} catch (error) {
  console.error('Error occurred:', error);
}

// 3. 性能测量
console.time('operation');
// 执行操作
console.timeEnd('operation');
```

### 6. 推荐的 VSCode 扩展

安装以下扩展来增强调试体验：
- **Debugger for Chrome** - Chrome 调试支持
- **Vue Language Features (Volar)** - Vue 3 支持
- **TypeScript Vue Plugin (Volar)** - Vue TypeScript 支持

## 构建和打包

### 构建命令
```sh
# 构建所有浏览器版本
pnpm run build

# 构建特定浏览器
pnpm run build:firefox
pnpm run build:edge

# 构建并打包
pnpm run zip
pnpm run zip:firefox
pnpm run zip:edge

# 构建所有版本并打包
pnpm run build:all
pnpm run zip:all
