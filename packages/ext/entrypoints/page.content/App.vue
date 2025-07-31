<script lang="ts" setup>
import { onMessage } from '@/messaging'
import BottomFloatingBall from '@/src/components/container/BottomFloatingBall.vue'
import Toaster from '@/src/components/ui/toast/Toaster.vue'
import { getEnableAutoBeginSummaryByActionOrContextTrigger, getEnableSummaryWindowDefault, useEnableFloatingBall } from '@/src/composables/general-config'
import { useEnableOnceAndToggleHide } from '@/src/composables/switch-control'
import { watchOnce } from '@vueuse/core'
import { sleep } from 'radash'
import { ref, useTemplateRef, VNode, onMounted, computed } from 'vue'
import icon from '~/assets/16.png'

// 新架构引入
import SummaryV2 from '@/src/components/business/summary/SummaryV2.vue'
import { provideSummaryState } from '@/src/composables/core/useSummaryState'
import { debugManager } from '@/src/utils/debug-manager'

// 创建并提供摘要状态
const summaryState = provideSummaryState()

const { tryEnableOrShow, isEnable: isOpenSummaryPanel, isShow, toggleShow } = useEnableOnceAndToggleHide()
const { enableFloatingBall } = useEnableFloatingBall()
const isFloatingBallPulseAnim = ref(false)
const summaryRef = useTemplateRef('summaryRef')

const panelSerial = ref(1)
const panelList = ref<{ id: number }[]>([{ id: 0 }])

// 调试组件管理
const DebugPanel = ref<any>(null)

// 动态加载调试组件
onMounted(async () => {
  if (debugManager.shouldLoadDebugComponent('DebugPanelForContentScript')) {
    DebugPanel.value = await debugManager.loadDebugComponent('DebugPanelForContentScript')
  }
})

async function createNewPanel() {
  panelList.value.push({
    id: panelSerial.value
  })
  panelSerial.value++
}

async function closePanel(id: number) {
  panelList.value = panelList.value.filter(item => item.id !== id)
}

/**
 * make a little offset for new created panel
 */
async function movePanelAfterMounted(node: VNode, id: number) {
  if (panelList.value.length > 1) {
    const el = node.el as HTMLElement
    el.style.left = (el.offsetLeft - 10 * id) + 'px'
    el.style.top = (el.offsetTop + 10 * id) + 'px'
  }
}

async function toggleShowWrap() {
  toggleShow()
  isFloatingBallPulseAnim.value = true
  await sleep(1500)
  isFloatingBallPulseAnim.value = false
}

getEnableSummaryWindowDefault().then(v => {
  isOpenSummaryPanel.value = v
})

/**
 * try to begin summary, called after confirming that the `Summary` component is ready
 */
function tryBeginSummary() {
  if (summaryRef.value) {
    summaryRef.value.forEach((panelRef: any) => {
      if (!panelRef) {
        console.warn('[invokeSummary]panelRef in list not mounted.')
        return
      }
      
      // 使用新的状态管理方式
      const currentStatus = summaryState.status.value
      
      if (currentStatus === 'preparing') {
        console.debug('[invokeSummary]Summary preparing, hook begin summary on prepared done.')
        summaryState.onPrepareDone(() => {
          summaryState.refreshSummary()
        })
      } else if (currentStatus === 'ready') {
        console.debug('[invokeSummary]Summary Already prepared, directly begin summary.')
        summaryState.refreshSummary()
      }
    })
  } else {
    console.warn('[invokeSummary]Summary not mounted.')
  }
}

/**
 * trigger by popup/contextMenu, open the panel, and  begin summary depends on config `ENABLE_AUTO_BEGIN_SUMMARY_BY_ACTION_OR_CONTEXT_TRIGGER`
 *  
 * */
onMessage('invokeSummary', () => {
  console.debug('[invokeSummary]received message.', 'isShow:', isShow.value, 'isOpen:', isOpenSummaryPanel.value)

  if (isOpenSummaryPanel.value) {//if already open, minimize it
    toggleShowWrap()
    return;
  }
  tryEnableOrShow() //open panel
  // invoke begin summary 
  getEnableAutoBeginSummaryByActionOrContextTrigger().then(enabled => {
    if (!enabled) return

    if (summaryRef.value) {
      tryBeginSummary()
    } else {//maybe the summary page not prepared when initailly
      console.debug('[invokeSummary]Summary not prepared, wait for prepare done.')
      watchOnce(summaryRef, () => {
        tryBeginSummary()
      })
    }
  })
})

/**
 * trigger by `add-to-chat` context menu button, add selection text to input dialog
 */
onMessage('addContentToChatDialog', (msg) => {
  let content = msg.data
  if (!content) {
    content = window.getSelection()?.toString() ?? ''
  }
  if (!content) return
  
  tryEnableOrShow() // open panel
  
  if (summaryRef.value) {
    summaryRef.value.forEach((item: any) => item?.addContentToChatDialog?.(content))
  } else {
    // maybe the summary page not prepared when initially
    watchOnce(summaryRef, () => {
      sleep(500).then(() => {
        summaryRef.value?.forEach((item: any) => item?.addContentToChatDialog?.(content))
      })
    })
  }
})

// 计算是否显示调试面板
const showDebugPanel = computed(() => {
  return debugManager.shouldLoadDebugComponent('*') && DebugPanel.value
})

</script>

<template>
  <div ref="container" class="relative z-[99999] user-setting-style">

    <Toaster />

    <!-- 使用新的 SummaryV2 组件 -->
    <SummaryV2 
      v-if="isOpenSummaryPanel" 
      v-for="{ id } in panelList" 
      :key="id" 
      v-show="isShow" 
      ref="summaryRef"
      @minimize-panel="toggleShowWrap" 
      @create-new-panel="createNewPanel" 
      :close-or-hide="id === 0 ? 'hide' : 'close'"
      @close-panel="closePanel(id)" 
      @vue:mounted="(node: any) => movePanelAfterMounted(node, id)"
      class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-fit w-[min(90vw,600px)] max-h-[80vh] scale-[--webpage-summary-calc-scale] shadow-2xl backdrop-blur-sm bg-white/95 rounded-xl border border-gray-200/50" 
    />


    <BottomFloatingBall v-if="enableFloatingBall" tooltip="打开摘要面板" class="scale-[--webpage-summary-calc-scale]">
      <div @click="tryEnableOrShow" :class="{ 'animate-bounce duration-500': isFloatingBallPulseAnim }"
        class="w-fit h-fit p-1 aspect-square rounded-full border-[1px] border-purple-700/50 bg-white/80 backdrop-blur-sm">
        <img :src="icon" class="w-6 h-6 rounded select-none" draggable="false">
      </div>
    </BottomFloatingBall>


    <!-- 条件化加载调试组件 -->
    <component 
      :is="DebugPanel" 
      v-if="showDebugPanel"
      class="fixed border-amber-200 bg-white max-w-[min(40rem,50vw)] top-0 left-0" 
    />
  </div>
</template>

<style scoped></style>
