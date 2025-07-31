# 重构计划

## 1. 新目录结构

```
src/
├── components/
│   ├── base/              # 基础UI组件
│   │   ├── BasePanel.vue
│   │   ├── BaseDialog.vue
│   │   └── BaseButton.vue
│   ├── business/          # 业务组件
│   │   ├── summary/
│   │   │   ├── SummaryPanel.vue      # 主容器组件
│   │   │   ├── SummaryContent.vue    # 内容组件
│   │   │   ├── MessageDisplay.vue    # 消息展示组件
│   │   │   └── ChatInput.vue         # 聊天输入组件
│   │   ├── model/
│   │   └── prompt/
│   ├── layout/            # 布局组件
│   │   ├── DraggableContainer.vue
│   │   └── FloatingContainer.vue
│   └── ui/                # shadcn-vue组件
├── services/              # 服务层
│   ├── summary.service.ts
│   ├── message.service.ts
│   ├── model.service.ts
│   └── error.service.ts
├── stores/                # 状态管理
│   ├── summary.store.ts
│   ├── config.store.ts
│   └── ui.store.ts
├── composables/           # 组合式API
│   ├── core/              # 核心功能
│   │   ├── useSummaryState.ts
│   │   ├── useMessageFlow.ts
│   │   └── useErrorHandler.ts
│   ├── ui/                # UI相关
│   │   ├── usePanel.ts
│   │   └── useDialog.ts
│   └── config/            # 配置相关
├── types/
├── utils/
└── constants/
```

## 2. 重构阶段

### 阶段1: 服务层抽象
- 创建服务层架构
- 建立统一错误处理
- 抽象业务逻辑

### 阶段2: 状态管理重构
- 分离UI状态和业务状态
- 实现响应式状态管理
- 优化状态更新机制

### 阶段3: 组件拆分
- 拆分Summary.vue
- 创建专职组件
- 实现组件通信

### 阶段4: 组件优化
- 提升组件复用性
- 统一组件接口
- 增强类型安全

### 阶段5: 调试代码清理
- 移除生产环境调试代码
- 优化开发环境体验
- 完善错误监控
