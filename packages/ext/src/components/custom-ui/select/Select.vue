<script setup lang="ts">
/*
 * Prompt: 请为我封装一个Select组件
 * 简介: Select组件提供用户从列表中选择一个或多个选项的功能。
 */
import { ref, provide, HTMLAttributes, nextTick, onMounted, onUnmounted, watch } from 'vue';
import { cn } from '@/src/utils/shadcn';
import Button from '../../ui/button/Button.vue';

interface SelectProps {
  class?: HTMLAttributes['class'];
  placeholder?: string;
  defaultValue?:string;
}

const props = withDefaults(defineProps<SelectProps>(), {
  placeholder: '请选择'
});

const modelValue = defineModel<string>()
const emit = defineEmits<{
}>();

const isOpen = ref(false);
const contentRef = ref<HTMLDivElement | null>(null);
const scrollIndicator = ref<HTMLDivElement | null>(null);
const isScrolledToBottom = ref(false);
const selectRef = ref<HTMLDivElement | null>(null);

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
};

const handleSelect = (value: any) => {
  modelValue.value = value;
  isOpen.value = false;
};

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

// 监听 modelValue 的变化，当值改变时关闭下拉框
watch(modelValue, () => {
  isOpen.value = false;
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// for SelectItem to select
provide('select', handleSelect);
provide('selected-value', modelValue);
provide('is-open', isOpen);

</script>

<template>
  <div ref="selectRef" :class="cn('relative text-left', props.class)">
    <button @click.stop="toggleOpen()"
      class="flex bg-card  items-center justify-between rounded-md border px-1 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
      <slot name="trigger" :value="modelValue">
        <div>{{ $attrs.placeholder }}</div>
      </slot>
      <div class="ml-1 shrink-0 opacity-50">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          class="lucide lucide-chevron-down">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </button>

    <!-- dropdown list -->
    <div v-show="isOpen"
      class="absolute z-10 mt-2  text-nowrap rounded-md border bg-popover text-popover-foreground shadow-md">
      <div ref="contentRef" class="max-h-96 overflow-y-auto relative"
        :class="{ 'hide-scrollbar': !isScrolledToBottom }">
        <slot name="content" />
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>