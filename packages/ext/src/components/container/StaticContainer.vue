<!--
Prompt: 创建一个静态容器组件，用于替代拖拽容器，提供固定位置的面板布局
简介: 这是一个静态容器组件，不支持拖拽功能，用于固定位置显示内容面板
-->
<script lang="ts" setup>
import { HTMLAttributes } from 'vue';
import { cn } from '@/src/utils/shadcn';

const { class: clazz } = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <!-- 静态容器，不支持拖拽 -->
  <div :class="cn('w-fit', clazz)">
    <!-- 头部区域 -->
    <div class="">
      <slot name="header">
        <div class="h-8 bg-gray-500 w-full rounded">
        </div>
      </slot>
    </div>

    <!-- 主要内容区域 -->
    <slot></slot>
  </div>
</template>

<style scoped></style>