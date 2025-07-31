<!--
简介: 这是一个居中底部显示的半透明悬浮球组件，鼠标悬停时显示关闭按钮。
-->
<script lang="ts" setup>
import { cn } from '@/src/utils/shadcn';
import { CircleXIcon } from 'lucide-vue-next';
import { sleep } from 'radash';
import { HTMLAttributes, ref } from 'vue';
import Button from '../ui/button/Button.vue';

const props = defineProps<{
  class?: HTMLAttributes['class'];
  tooltip?: string; // 添加提示文本
}>();

const emit = defineEmits<{
  (e: 'close'): void
}>()

// 关闭按钮默认隐藏，只在鼠标悬停时显示
const isCloseBtnHidden = ref(true)
const isClose = ref(false)
const isTooltipVisible = ref(false) // 提示框显示状态

// 鼠标悬停时显示关闭按钮和提示
async function showCloseBtn() {
  await sleep(100)
  isCloseBtnHidden.value = false
  if (props.tooltip) {
    isTooltipVisible.value = true
  }
}

// 鼠标离开时隐藏关闭按钮和提示
function hideCloseBtn() {
  isCloseBtnHidden.value = true
  isTooltipVisible.value = false
}

// 关闭
function close() {
  isClose.value = true
  emit('close')
}
</script>

<template>
  <div v-if="!isClose" 
    :class="cn('fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 rounded-full p-1 aspect-square bg-white/60 backdrop-blur-sm shadow-lg border border-gray-200/50 hover:bg-white/80 transition-all duration-200 opacity-20 hover:opacity-100', props.class)"
    @mouseenter="showCloseBtn"
    @mouseleave="hideCloseBtn">
    <!-- 关闭按钮 -->
    <Button variant="ghost" size="sm-icon" @click.stop="close"
      class="absolute p-0 w-4 h-4 -top-1 -right-1 rounded-full text-white bg-red-400/80 hover:bg-red-500 hover:text-white transition-colors"
      :class="{ 'opacity-0 pointer-events-none': isCloseBtnHidden, 'opacity-100': !isCloseBtnHidden }">
      <CircleXIcon class="h-3 w-3" />
    </Button>
    <slot>
      <!-- 默认内容 -->
      <div class="h-full w-full rounded-full bg-primary/80 flex items-center justify-center">
        <!-- 这里可以放一个图标 -->
      </div>
    </slot>
    
    <!-- 提示框 -->
    <div v-if="isTooltipVisible && props.tooltip" 
      class="absolute bottom-12 left-1/2 transform -translate-x-1/2 rounded p-2 text-nowrap bg-neutral-700/90 text-white backdrop-blur-sm shadow-lg">
      {{ props.tooltip }}
    </div>
  </div>
</template>

<style scoped></style>