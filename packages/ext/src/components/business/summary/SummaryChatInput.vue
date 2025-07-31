/**
 * 聊天输入组件
 * 处理用户输入和聊天界面控制
 */
<template>
  <div class="w-full h-fit relative">
    <!-- 打开聊天按钮 -->
    <div class="absolute right-0 top-0 flex flex-row gap-1">
      <Button
        v-show="!isOpen"
        @click="toggleOpen"
        variant="github"
        size="icon"
        class="rounded-none text-neutral-400 text-primary/50"
        title="继续对话"
      >
        <MessageCirclePlusIcon />
      </Button>
    </div>

    <!-- 关闭聊天按钮 -->
    <div class="absolute bottom-[-1rem] left-[50%] flex flex-row gap-1">
      <Button
        v-show="isOpen"
        @click="toggleOpen"
        variant="github"
        size="icon"
        class="h-4 rounded-none text-gray-500"
      >
        <ChevronUpIcon />
      </Button>
    </div>

    <!-- 聊天输入框 -->
    <ChatInputBox
      v-show="isOpen"
      :disabled="disabled"
      @submit="handleSubmit"
      ref="chatInputRef"
      :class="inputClasses"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { MessageCirclePlusIcon, ChevronUpIcon } from 'lucide-vue-next'
import Button from '@/src/components/ui/button/Button.vue'
import ChatInputBox from '@/src/components/summary/ChatInputBox.vue'

export interface SummaryChatInputProps {
  disabled?: boolean
  enableByDefault?: boolean
  open?: boolean
}

const props = withDefaults(defineProps<SummaryChatInputProps>(), {
  disabled: false,
  enableByDefault: false,
  open: false
})

const emit = defineEmits<{
  submit: [content: string, onSuccess: () => void]
  'update:open': [open: boolean]
}>()

const chatInputRef = ref<InstanceType<typeof ChatInputBox>>()
const isOpen = ref(props.open)

// 响应式类名
const inputClasses = computed(() => [
  'rounded-b-xl'
])

// 初始化
onMounted(() => {
  if (props.enableByDefault) {
    isOpen.value = true
  }
})

// 切换开关状态
function toggleOpen(): void {
  isOpen.value = !isOpen.value
  emit('update:open', isOpen.value)
}

// 处理提交
function handleSubmit(content: string, onSuccess: () => void): void {
  emit('submit', content, onSuccess)
}

// 追加内容
function appendContent(content: string): void {
  chatInputRef.value?.appendContent(content)
}

// 暴露方法
defineExpose({
  appendContent,
  toggleOpen
})
</script>
