<script lang="ts" setup>
import { onMessage } from '@/messaging'
import RightFloatingBallContainer from '@/src/components/container/RightFloatingBallContainer.vue'
import HoverCard from '@/src/components/custom-ui/HoverCard.vue'
// import DebugPanelForContentScript from '@/src/components/debug/DebugPanelForContentScript.vue'
import Summary from '@/src/components/summary/Summary.vue'
import Toaster from '@/src/components/ui/toast/Toaster.vue'
import { getEnableAutoBeginSummaryByActionOrContextTrigger, getEnableSummaryWindowDefault, useEnableFloatingBall } from '@/src/composables/general-config'
import { useEnableOnceAndToggleHide } from '@/src/composables/switch-control'
import { useExtractorConfig } from '@/src/composables/extractor-config'
import { watchOnce } from '@vueuse/core'
import { sleep } from 'radash'
import { ref, useTemplateRef, VNode, onMounted } from 'vue'
import icon from '~/assets/16.png'

const { tryEnableOrShow, isEnable: isOpenSummaryPanel, isShow, toggleShow } = useEnableOnceAndToggleHide()
const { enableFloatingBall } = useEnableFloatingBall()
const isFloatingBallPulseAnim = ref(false)
const summaryRef = useTemplateRef('summaryRef')

const panelSerial = ref(1)
const panelList = ref<{ id: number }[]>([{ id: 0 }])

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
 * try to begin summary, called  after confirming that the `Summary` component is not already, 
 */
function tryBeginSummary() {
  if (summaryRef.value) {
    summaryRef.value.forEach(panelRef => {
      if (!panelRef) {
        console.warn('[invokeSummary]panelRef in list not mounted.')
        return
      }
      if (panelRef.status() === 'preparing') {
        console.debug('[invokeSummary]Summary preparing, hook begin summary on prepared done.')
        panelRef.on('onPrepareDone', () => {
          panelRef!.refreshSummary()
        })
      } else if (panelRef.status() === 'ready') {
        console.debug('[invokeSummary]Summary Already prepared, directly begin summary.')
        panelRef.refreshSummary()
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
  tryEnableOrShow() //open panel
  if (summaryRef.value) {
    summaryRef.value.forEach(item => item?.addContentToChatDialog(content))
  } else {//maybe the summary page not prepared when initailly
    watchOnce(summaryRef, () => {
      sleep(500).then(() => {
        summaryRef.value?.forEach(item => item?.addContentToChatDialog(content))
      })
    })
  }
})

</script>

<template>
  <div ref="container" class="relative z-[99999] user-setting-style">

    <Toaster />

    <Summary v-if="isOpenSummaryPanel" v-for="{ id } in panelList" :key="id" v-show="isShow" ref="summaryRef"
      @minimize-panel="toggleShowWrap" @create-new-panel="createNewPanel" :close-or-hide="id === 0 ? 'hide' : 'close'"
      @close-panel="closePanel(id)" @vue:mounted="(node) => movePanelAfterMounted(node, id)"
      class="h-fit top-[--webpage-summary-panel-top] bottom-[--webpage-summary-panel-bottom] left-[--webpage-summary-panel-left] right-[--webpage-summary-panel-right] scale-[--webpage-summary-calc-scale] origin-top-right" />


    <RightFloatingBallContainer v-if="enableFloatingBall" class=" scale-[--webpage-summary-calc-scale] origin-top-right"
      :init-closed-btn-hidden="false" :storage-key="'page'">
      <HoverCard position="left" alignment="middle">
        <div @click="tryEnableOrShow" :class="{ 'animate-bounce duration-500': isFloatingBallPulseAnim }"
          class="w-fit h-fit p-1 aspect-square rounded-full border-[1px] border-purple-700">
          <img :src="icon" class="w-6 h-6 rounded select-none" draggable="false">
        </div>
        <template #custom-content>
          <div class="absolute right-12 top-0 rounded p-1 text-nowrap bg-neutral-700 text-white"> open summary panel
          </div>
        </template>
      </HoverCard>
    </RightFloatingBallContainer>


    <!-- <DebugPanelForContentScript class="fixed border-amber-200 bg-white max-w-[min(40rem,50vw)] top-0 left-0" /> -->
  </div>
</template>

<style scoped></style>
