<template>
  <!--
    @description: Chat input box component for typing and sending messages.
    @Prompt: An input box with a send button.
  -->
  <div
    :class="cn('relative flex flex-row flex-nowrap items-end border p-2 h-fit', isTextAreaFocus ? 'border-primary' : '', props.class)">
    <!-- :class="{ 'border-primary': isTextAreaFocus }"> -->
    <!-- Input box -->
    <textarea v-model="inputText" ref="textareaRef"
      :class="cn('w-full h-12 min-h-4  rounded-md border-none text-base focus-visible:outline-none resize-none caret-current bg-transparent', props.class)"
      placeholder="Type your message here... Enter to send, Shift+Enter to insert new line." @input="adjustHeight"
      @focusin="focusin" @focusout="focusout" @keydown="handleEnterPress"></textarea>

    <!-- Send button -->
    <Button variant="default" class="py-2 h-fit" @click="handleSubmit" :disabled="$attrs.disabled">
      <SendHorizonalIcon class="" />
    </Button>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/src/utils/shadcn';
import { ref, useTemplateRef, watch, type HTMLAttributes } from 'vue';
import { SendHorizonalIcon } from 'lucide-vue-next';
import Button from '../ui/button/Button.vue';
import { getLineHeightOfElement } from '@/src/utils/document';
const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
const emit = defineEmits<{
  (e: 'submit', msg: string, onSuc: () => void): void;
}>()
defineExpose({
  appendContent
})
const inputText = ref('')

const isTextAreaFocus = ref(false)
const textAreaRef = useTemplateRef('textareaRef')



const handleEnterPress = (event: KeyboardEvent) => {
  // Stop event propagation to prevent triggering GitHub shortcuts
  event.stopPropagation();
  
  if (event.key === 'Enter') {
    if (event.shiftKey) {
      // Shift+Enter: insert new line, do nothing (default behavior)
    } else {
      // Enter: send message
      event.preventDefault();
      handleSubmit();
    }
  }
}

function focusin() {
  isTextAreaFocus.value = true
}

function focusout() {
  isTextAreaFocus.value = false

}

function adjustHeight(event: Event) {
  const textarea = event.target as HTMLTextAreaElement;
  textarea.style.height = 'auto';  // 先将高度重置为auto，以便动态计算

  const lineHeight = getLineHeightOfElement(textarea)
  if (textarea.scrollHeight > lineHeight * 6) {//>6 lines, limited to 6 lines
    textarea.style.height = `${lineHeight * 6}px`;
  } else { // <6 lines, eq to line count * line height
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
}

function appendContent(content: string) {
  if (!textAreaRef.value)
    return
  textAreaRef.value.value += content
  textAreaRef.value.dispatchEvent(new Event('input'))
  textAreaRef.value.focus()

}

async function handleSubmit() {
  if (!inputText.value.trim()) return;
  
  emit('submit', inputText.value, () => {
    inputText.value = '';
    // Reset textarea height
    if (textAreaRef.value) {
      textAreaRef.value.style.height = 'auto';
    }
  });
}

</script>

<style scoped></style>
