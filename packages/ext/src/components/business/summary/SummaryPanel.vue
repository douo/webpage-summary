/**
 * 总结面板容器组件（简化版）
 * 主要负责布局和组件组合，暂时使用现有组件
 */
<template>
  <DraggableContainer :class="containerClasses">
    <!-- 头部 -->
    <template #header>
      <SummaryHeader
        v-model:current-model="currentModel"
        v-model:current-prompt="currentPrompt"
        :token-usage="tokenUsage"
        class="rounded-t-xl"
      >
        <template #before-icon-buttons>
          <Button 
            v-if="closeMode === 'close'" 
            @click="$emit('close')" 
            variant="github" 
            size="sm-icon"
            title="close this panel" 
            class="p-0 text-foreground/80"
          >
            <XIcon />
          </Button>
        </template>
        
        <template #left-buttons>
          <StatusButton 
            :status="status" 
            @view-failed-reason="viewError" 
            @refresh="refreshSummary"
            @stop="stop" 
          />
        </template>
        
        <template #right-buttons>
          <Button 
            v-if="closeMode === 'hide' && showCreateButton" 
            @click="$emit('createNew')" 
            variant="github" 
            size="sm-icon"
            title="create new panel" 
            class="p-0 text-foreground/50"
          >
            <CopyPlusIcon />
          </Button>
          
          <Button 
            v-if="closeMode === 'hide'" 
            @click="$emit('minimize')" 
            variant="github" 
            size="sm-icon"
            title="minimize" 
            class="p-0 text-foreground/50"
          >
            <Minimize2Icon />
          </Button>
        </template>
      </SummaryHeader>
    </template>

    <!-- 主要内容 -->
    <template #default>
      <!-- 使用现有的SummaryDialog组件 -->
      <SummaryDialog 
        class="mt-[-1px] min-h-16 overflow-y-auto max-h-[--webpage-summary-panel-dialog-max-height]"
        style="overflow-anchor: auto;" 
        ref="summaryDialog"
      >
        <template #top-right-buttons>
          <!-- 长度检查器 -->
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
            variant="github" 
            size="sm-icon"
            v-if="uiMessages.filter(m => !m.hide).length > 0 && status !== 'running'" 
            title="Clear all" 
            @click="resetMessages"
          >
            <img :src="clearAllIcon" />
          </Button>
        </template>

        <!-- 消息列表 -->
        <div class="flex flex-col gap-4">
          <template v-for="(msg, index) in uiMessages" :key="index">
            <MessageItem v-if="!msg.hide" :message="msg" />
          </template>
          <div id="dialog-bottom-anchor"></div>
        </div>
      </SummaryDialog>

      <!-- 聊天输入 -->
      <div class="w-full h-fit relative">
        <div class="absolute right-0 top-0 flex flex-row gap-1">
          <Button
            v-show="!isChatDialogOpen"
            @click="() => isChatDialogOpen = !isChatDialogOpen"
            variant="github"
            size="icon"
            class="rounded-none text-neutral-400 text-primary/50"
            title="continue chat"
          >
            <MessageCirclePlusIcon />
          </Button>
        </div>

        <div class="absolute bottom-[-1rem] left-[50%] flex flex-row gap-1">
          <Button
            v-show="isChatDialogOpen"
            @click="() => isChatDialogOpen = !isChatDialogOpen"
            variant="github"
            size="icon"
            class="h-4 rounded-none text-gray-500"
          >
            <ChevronUpIcon />
          </Button>
        </div>

        <ChatInputBox
          v-show="isChatDialogOpen"
          @submit="handleChatSubmit"
          ref="chatInputBox"
          :disabled="status !== 'ready'"
          class="rounded-b-xl"
        />
      </div>
    </template>
  </DraggableContainer>
</template>

<script setup lang="ts">
import { computed, ref, provide } from 'vue'
import { useSummaryStateInject } from '@/src/composables/core/useSummaryState'
import { useEnableTokenUsageView, useEnableUserChatDefault, useEnableCreateNewPanelButton } from '@/src/composables/general-config'
import { scrollToId } from '@/src/utils/document'
import { toast } from '@/src/components/ui/toast'

import DraggableContainer from '@/src/components/container/DraggableContainer.vue'
import SummaryHeader from '@/src/components/summary/SummaryHeader.vue'
import SummaryDialog from '@/src/components/summary/SummaryDialog.vue'
import MessageItem from '@/src/components/summary/MessageItem.vue'
import InputInspect from '@/src/components/summary/InputInspect.vue'
import TokenUsageItem from '@/src/components/summary/TokenUsageItem.vue'
import ChatInputBox from '@/src/components/summary/ChatInputBox.vue'
import StatusButton from '@/src/components/summary/StatusButton.vue'
import Button from '@/src/components/ui/button/Button.vue'
import { XIcon, CopyPlusIcon, Minimize2Icon, MessageCirclePlusIcon, ChevronUpIcon } from 'lucide-vue-next'
import clearAllIcon from '~/assets/svg/clear-all.svg'

export interface SummaryPanelProps {
  panelId?: string
  closeMode?: 'hide' | 'close'
}

const props = withDefaults(defineProps<SummaryPanelProps>(), {
  panelId: '0',
  closeMode: 'hide'
})

const emit = defineEmits<{
  close: []
  minimize: []
  createNew: []
}>()

// 注入总结状态
const summaryState = useSummaryStateInject()

// 解构状态和方法
const {
  status,
  currentModel,
  currentPrompt,
  uiMessages,
  webpageContent,
  tokenUsage,
  textContentTrimmer,
  refreshSummary,
  chat,
  stop,
  copyMessages,
  resetMessages
} = summaryState

// 配置
const { enableTokenUsageView } = useEnableTokenUsageView()
const { enableUserChatDefault } = useEnableUserChatDefault()
const { enbaleCreateNewPanelButton: showCreateButton } = useEnableCreateNewPanelButton()

// 本地状态
const isChatDialogOpen = ref(false)
const chatInputBox = ref()
const summaryDialog = ref()

// 样式计算
const containerClasses = computed(() => [
  'w-[var(--webpage-summary-panel-width)]',
  'bg-[--webpage-summary-panel-background]',
  'rounded-t-xl rounded-b-xl shadow-2xl'
])

// 提供方法给子组件
provide('copy-func', copyMessages)
provide('scroll-bottom', () => scrollToId('dialog-bottom-anchor'))

// 处理聊天提交
async function handleChatSubmit(content: string, onSuccess: () => void): Promise<void> {
  // 如果总结还没执行，先开始总结
  if (!content && status.value === 'ready' && uiMessages.value.filter(m => !m.hide).length === 0) {
    await refreshSummary()
    return
  }
  
  if (!content || status.value !== 'ready') return
  
  await chat(content, 'user')
  scrollToId('dialog-bottom-anchor')
  onSuccess()
}

// 查看错误详情
function viewError(): void {
  if (summaryState.error.value) {
    toast({
      title: "错误详情",
      description: summaryState.error.value,
      variant: "destructive"
    })
  }
}

// 添加内容到聊天框
function addContentToChat(content: string): void {
  chatInputBox.value?.appendContent(content + ' ')
  isChatDialogOpen.value = true
}

// 暴露方法
defineExpose({
  status: () => status.value,
  refreshSummary,
  addContentToChat
})
</script>
