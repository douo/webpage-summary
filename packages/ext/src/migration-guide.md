# 重构迁移指南

## 🎯 迁移概述

本指南将帮助你从旧的Summary.vue架构迁移到新的模块化架构。

## 📋 迁移检查清单

### ✅ 阶段1: 验证新架构 (推荐先并行运行)

1. **引入新组件并行测试**
```vue
<!-- 在现有页面中添加新组件进行测试 -->
<template>
  <!-- 保留原有的Summary组件 -->
  <Summary 
    v-if="useOldVersion"
    :close-or-hide="closeOrHide" 
    @minimize-panel="minimizePanel"
  />
  
  <!-- 添加新的SummaryV2组件 -->
  <SummaryV2 
    v-else
    :close-or-hide="closeOrHide" 
    @minimize-panel="minimizePanel"
  />
</template>
```

2. **功能对比测试**
- [ ] 基础总结功能
- [ ] 聊天对话功能  
- [ ] 消息复制功能
- [ ] 错误处理
- [ ] Token统计
- [ ] 配置切换

### ✅ 阶段2: 逐步替换

1. **更新引用**
```typescript
// 旧代码
import Summary from '@/src/components/summary/Summary.vue'

// 新代码  
import SummaryV2 from '@/src/components/business/summary/SummaryV2.vue'
```

2. **更新错误处理**
```typescript
// 旧代码
import { handleConnectError } from '@/src/utils/error-parse'

// 新代码
import { handleConnectError } from '@/src/services/error.service'
```

3. **更新状态管理**
```typescript
// 旧代码
const { chat, stop, error, status } = useSummary()

// 新代码
const summaryState = useSummaryStateInject()
const { chat, stop, error, status } = summaryState
```

### ✅ 阶段3: 调试代码清理

1. **移除调试组件引用**
```typescript
// 找到所有类似的引用并条件化
// 旧代码
import DebugPanel from '@/src/components/debug/DebugPanel.vue'

// 新代码 
import { loadDebugComponent } from '@/src/utils/debug-manager'

const DebugPanel = await loadDebugComponent('DebugPanel')
```

2. **更新路由配置**
```typescript
// 条件化调试路由
const debugRoute = import.meta.env.DEV ? 
  { path: '/debug', component: () => import('@/src/components/debug/DebugPanel.vue') } : 
  null

export const router = createRouter({
  routes: [
    // ... 其他路由
    ...(debugRoute ? [debugRoute] : [])
  ]
})
```

## 🔄 API变更对照表

### useSummary -> useSummaryState

| 旧API | 新API | 说明 |
|-------|-------|------|
| `useSummary()` | `useSummaryStateInject()` | 注入状态而非创建 |
| `onPrepareDone(cb)` | `onPrepareDone(cb)` | 保持不变 |
| `chat(content, role)` | `chat(content, role)` | 保持不变 |
| `refreshSummary()` | `refreshSummary()` | 保持不变 |
| `error.value` | `error.value` | 保持不变 |

### 错误处理

| 旧API | 新API | 说明 |
|-------|-------|------|
| `handleConnectError(e)` | `errorService.handleConnectError(e, context)` | 增加上下文 |
| `toast({ ... })` | `errorService.handleError(e, context)` | 统一处理 |

### 组件结构

| 旧组件 | 新组件 | 职责 |
|--------|--------|------|
| `Summary.vue` | `SummaryV2.vue` | 主入口 |
| - | `SummaryPanel.vue` | 容器组件 |
| - | `SummaryContent.vue` | 内容展示 |
| - | `SummaryChatInput.vue` | 聊天输入 |

## 🔧 配置迁移

### 1. 环境变量
```bash
# 添加调试控制
VITE_ENABLE_DEBUG_COMPONENTS=true # 开发环境
VITE_ENABLE_DEBUG_COMPONENTS=false # 生产环境
```

### 2. 类型定义更新
```typescript
// 新增类型定义
interface SummaryState { ... }
interface SummaryActions { ... }
interface ErrorContext { ... }
```

## ⚠️ 注意事项

### 破坏性变更
1. **状态管理方式变更** - 需要使用provide/inject模式
2. **错误处理统一** - 所有错误处理走统一服务
3. **调试组件动态加载** - 不再直接导入调试组件

### 兼容性保证  
1. **外部API保持兼容** - 主要的外部调用接口保持不变
2. **事件系统兼容** - onPrepareDone等事件保持兼容
3. **配置系统兼容** - 现有配置继续有效

### 性能影响
1. **包体积减少** - 调试组件不会打包到生产版本
2. **运行时性能** - 状态管理更高效
3. **内存使用** - 组件拆分后内存占用更合理

## 🧪 测试策略

### 单元测试
```typescript
// 测试新的服务层
describe('ErrorService', () => {
  it('should handle API errors correctly', () => {
    // 测试代码
  })
})

describe('MessageService', () => {
  it('should format messages correctly', () => {
    // 测试代码  
  })
})
```

### 集成测试
```typescript
// 测试组件组合
describe('SummaryPanel', () => {
  it('should integrate all sub-components correctly', () => {
    // 测试代码
  })
})
```

### E2E测试
```typescript
// 测试完整流程
describe('Summary workflow', () => {
  it('should complete summary generation workflow', () => {
    // 测试代码
  })
})
```

## 📚 最佳实践

### 1. 逐步迁移
- 先在开发环境并行运行新旧版本
- 确认功能完全一致后再替换
- 保留回滚能力

### 2. 错误监控
- 使用新的错误服务统一收集错误
- 设置错误上报机制
- 监控迁移后的错误率

### 3. 性能监控  
- 对比迁移前后的性能指标
- 监控内存使用变化
- 确保用户体验不受影响

## 🔄 回滚方案

如果发现问题需要回滚：

1. **代码层面**
```vue
<!-- 快速切换回旧版本 -->
<Summary v-if="!useNewVersion" />
<SummaryV2 v-else />
```

2. **配置层面**
```typescript
// 通过配置控制
const USE_NEW_SUMMARY = false // 改为false即可回滚
```

3. **功能开关**
```typescript
// 运行时切换
if (featureFlags.useNewSummary) {
  // 使用新版本
} else {
  // 使用旧版本
}
```
