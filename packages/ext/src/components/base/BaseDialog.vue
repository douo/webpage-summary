/**
 * 基础对话框组件
 * 提供可复用的对话框容器功能
 */
<template>
  <div 
    ref="dialogRef"
    :class="dialogClasses"
    :style="dialogStyles"
  >
    <!-- 顶部工具栏 -->
    <div v-if="$slots.toolbar" :class="toolbarClasses">
      <slot name="toolbar" />
    </div>

    <!-- 对话内容区域 -->
    <div ref="contentRef" :class="contentClasses">
      <slot />
    </div>

    <!-- 滚动锚点 -->
    <div v-if="scrollable" id="dialog-scroll-anchor" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { cn } from '@/src/utils/shadcn'

export interface BaseDialogProps {
  maxHeight?: string
  scrollable?: boolean
  variant?: 'default' | 'flat' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<BaseDialogProps>(), {
  scrollable: true,
  variant: 'default',
  padding: 'md'
})

const dialogRef = useTemplateRef<HTMLDivElement>('dialogRef')
const contentRef = useTemplateRef<HTMLDivElement>('contentRef')

// 样式计算
const dialogClasses = computed(() => cn(
  'flex flex-col',
  'bg-background',
  {
    'border-t': props.variant === 'default',
    'shadow-inner': props.variant === 'elevated',
    'bg-muted/30': props.variant === 'flat',
  }
))

const toolbarClasses = computed(() => cn(
  'flex items-center justify-between',
  'px-4 py-2',
  'border-b bg-background/95',
  'sticky top-0 z-10'
))

const contentClasses = computed(() => cn(
  'flex-1',
  {
    'overflow-y-auto': props.scrollable,
    'overflow-hidden': !props.scrollable,
    
    // 内边距
    'p-0': props.padding === 'none',
    'p-2': props.padding === 'sm',
    'p-4': props.padding === 'md',
    'p-6': props.padding === 'lg',
  }
))

const dialogStyles = computed(() => {
  const styles: Record<string, string> = {}
  
  if (props.maxHeight) {
    styles.maxHeight = props.maxHeight
  }
  
  return styles
})

// 滚动到底部
function scrollToBottom(): void {
  if (contentRef.value) {
    const anchor = contentRef.value.querySelector('#dialog-scroll-anchor')
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth' })
    }
  }
}

// 暴露方法和引用
defineExpose({
  dialogRef,
  contentRef,
  scrollToBottom
})
</script>
