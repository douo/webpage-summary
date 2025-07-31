/**
 * 重构后的总结组件主入口
 * 使用新架构重新实现的Summary组件
 */
<template>
  <SummaryPanel
    :panel-id="panelId"
    :close-mode="closeOrHide"
    @close="$emit('closePanel')"
    @minimize="$emit('minimizePanel')"
    @create-new="$emit('createNewPanel')"
    ref="summaryPanelRef"
  />
</template>

<script setup lang="ts">
import { ref, defineExpose } from 'vue'
import { useSummaryStateInject } from '@/src/composables/core/useSummaryState'
import SummaryPanel from '@/src/components/business/summary/SummaryPanel.vue'

export interface SummaryProps {
  closeOrHide?: 'close' | 'hide'
  panelId?: string
}

const props = withDefaults(defineProps<SummaryProps>(), {
  closeOrHide: 'hide',
  panelId: '0'
})

const emit = defineEmits<{
  minimizePanel: []
  closePanel: []
  createNewPanel: []
}>()

// 注入已提供的总结状态
const summaryState = useSummaryStateInject()
const summaryPanelRef = ref<InstanceType<typeof SummaryPanel>>()

// 暴露方法供外部调用
defineExpose({
  status: () => summaryState.status.value,
  refreshSummary: summaryState.refreshSummary,
  addContentToChatDialog: (content: string) => {
    summaryPanelRef.value?.addContentToChat(content)
  },
  on: (name: string, fn: Function) => {
    // 兼容原有的事件监听方式
    if (name === 'onPrepareDone') {
      summaryState.onPrepareDone(fn as () => void)
    }
  }
})
</script>
