/**
 * 总结内容展示组件
 * 负责显示消息列表和相关控制
 */
<template>
  <BaseDialog
    :max-height="'var(--webpage-summary-panel-dialog-max-height)'"
    class="mt-[-1px] min-h-16"
    scrollable
  >
    <!-- 工具栏 -->
    <template #toolbar>
      <!-- 内容长度检查器 -->
      <InputInspect
        v-if="webpageContent && currentModel && textContentTrimmer"
        :content-trimmer="textContentTrimmer"
        :webpag-content="webpageContent"
        :max-content-length="currentModel?.maxContentLength"
        :key="currentModel.name + '_' + webpageContent.articleUrl"
        class="ml-2"
      />

      <!-- Token使用统计 -->
      <div
        v-if="enableTokenUsageView && tokenUsage.inputToken"
        class="flex items-center gap-1 border rounded p-1 bg-gray-200"
        title="Token Usage"
      >
        <TokenUsageItem :usage="tokenUsage" />
      </div>

      <div class="grow" />

      <!-- 重置按钮 -->
      <Button
        v-if="visibleMessageCount > 0 && status !== 'running'"
        variant="github"
        size="sm-icon"
        title="清空所有消息"
        @click="$emit('resetMessages')"
      >
        <img :src="clearAllIcon" />
      </Button>
    </template>

    <!-- 消息列表 -->
    <div class="flex flex-col gap-4">
      <template v-for="(msg, index) in uiMessages" :key="index">
        <MessageItem v-if="!msg.hide" :message="msg" />
      </template>
      <div id="dialog-scroll-anchor" />
    </div>
  </BaseDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseDialog from '@/src/components/base/BaseDialog.vue'
import MessageItem from '@/src/components/summary/MessageItem.vue'
import InputInspect from '@/src/components/summary/InputInspect.vue'
import TokenUsageItem from '@/src/components/summary/TokenUsageItem.vue'
import Button from '@/src/components/ui/button/Button.vue'
import { UIMessage } from '@/src/types/message'
import { TokenUsage, WebpageContent } from '@/src/types/summary'
import { ModelConfigItem } from '@/src/types/config/model'
import clearAllIcon from '~/assets/svg/clear-all.svg'

export interface SummaryContentProps {
  uiMessages: UIMessage[]
  status: string
  webpageContent?: WebpageContent
  currentModel?: ModelConfigItem | null
  textContentTrimmer?: { trim: (s: string) => string }
  tokenUsage: TokenUsage
  enableTokenUsageView: boolean
}

const props = defineProps<SummaryContentProps>()

defineEmits<{
  resetMessages: []
  copyMessages: []
}>()

// 计算可见消息数量
const visibleMessageCount = computed(() => {
  return props.uiMessages.filter((m: UIMessage) => !m.hide).length
})
</script>
