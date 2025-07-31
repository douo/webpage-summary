<script setup lang="ts">
import { cn } from '@/src/utils/shadcn'
import { ToastRoot, type ToastRootEmits, useForwardPropsEmits } from 'radix-vue'
import type { ToastRootProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'

// 直接定义避免循环依赖
const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md p-6 pr-8 mt-2 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[--radix-toast-swipe-end-x] data-[swipe=move]:translate-x-[--radix-toast-swipe-move-x] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full'
  + 'rounded-l-none py-2 px-2 bg-white/80', //bloquote-style toast
  {
    variants: {
      variant: {
        default: 'border border-l-8 border-l-blue-400 rounded-l-none',
        destructive: 'border border-l-8 border-l-red-400 rounded-l-none',
        success: 'border border-l-8 border-l-green-400 rounded-l-none',
        warning: 'border border-l-8 border-l-amber-700 rounded-l-none',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type ToastVariants = VariantProps<typeof toastVariants>

interface ToastProps extends ToastRootProps {
  class?: HTMLAttributes['class']
  variant?: ToastVariants['variant']
  onOpenChange?: ((value: boolean) => void) | undefined
}

const props = defineProps<ToastProps>()

const emits = defineEmits<ToastRootEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <ToastRoot
    v-bind="forwarded"
    :class="cn(toastVariants({ variant }), props.class)"
    @update:open="onOpenChange"
  >
    <slot />
  </ToastRoot>
</template>
