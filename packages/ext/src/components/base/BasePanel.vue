/**
 * 基础面板组件
 * 提供可复用的面板容器功能
 */
<template>
  <div 
    :class="panelClasses"
    :style="panelStyles"
    ref="panelRef"
  >
    <!-- 头部 -->
    <header v-if="$slots.header" :class="headerClasses">
      <slot name="header" />
    </header>

    <!-- 主要内容 -->
    <main :class="contentClasses">
      <slot />
    </main>

    <!-- 底部 -->
    <footer v-if="$slots.footer" :class="footerClasses">
      <slot name="footer" />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { cn } from '@/src/utils/shadcn'

export interface BasePanelProps {
  title?: string
  closable?: boolean
  draggable?: boolean
  resizable?: boolean
  width?: string | number
  height?: string | number
  maxHeight?: string
  background?: string
  variant?: 'default' | 'elevated' | 'outlined'
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<BasePanelProps>(), {
  variant: 'default',
  size: 'md',
  draggable: false,
  resizable: false,
  closable: false
})

defineEmits<{
  close: []
  minimize: []
  maximize: []
}>()

const panelRef = useTemplateRef<HTMLDivElement>('panelRef')

// 样式计算
const panelClasses = computed(() => cn(
  'flex flex-col',
  'bg-background border rounded-xl shadow-lg',
  {
    // 变体样式
    'shadow-2xl': props.variant === 'elevated',
    'border-2': props.variant === 'outlined',
    
    // 尺寸样式
    'min-w-80': props.size === 'sm',
    'min-w-96': props.size === 'md', 
    'min-w-[32rem]': props.size === 'lg',
    
    // 交互样式
    'cursor-move': props.draggable,
    'resize': props.resizable,
  }
))

const headerClasses = computed(() => cn(
  'flex items-center justify-between',
  'px-4 py-3 border-b',
  'rounded-t-xl',
  'bg-background/95'
))

const contentClasses = computed(() => cn(
  'flex-1 flex flex-col',
  'overflow-hidden'
))

const footerClasses = computed(() => cn(
  'px-4 py-3 border-t',
  'rounded-b-xl',
  'bg-background/95'
))

const panelStyles = computed(() => {
  const styles: Record<string, string> = {}
  
  if (props.width) {
    styles.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }
  
  if (props.height) {
    styles.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  }
  
  if (props.maxHeight) {
    styles.maxHeight = props.maxHeight
  }
  
  if (props.background) {
    styles.backgroundColor = props.background
  }
  
  return styles
})

// 暴露面板引用
defineExpose({
  panelRef
})
</script>
