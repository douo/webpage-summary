<script lang="ts" setup>
import { sendMessage } from '@/messaging';
import { Button } from '@/src/components/ui/button';
import { useExtInfo } from '@/src/composables/extension';
import { getEnablePopupClickTrigger } from '@/src/composables/general-config';
import { BookOpenTextIcon, SettingsIcon } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';
import { browser } from 'wxt/browser';
import { activePageAndInvokeSummary, t } from '../../src/utils/extension';

const { iconUrl, name, version } = useExtInfo()
const enablePopupClickTrigger = ref<boolean>()

async function invokeCurrentTabSummary() {
  const tab = (await browser.tabs.query({ active: true, currentWindow: true }))[0]
  if (!tab.id) {
    alert('No tab found')
    return
  }
  await activePageAndInvokeSummary(tab)
  window.close()

}

onMounted(async () => {
  enablePopupClickTrigger.value = await getEnablePopupClickTrigger()
  if (enablePopupClickTrigger.value ) {
    invokeCurrentTabSummary()
  }

})
</script>

<template>
  <!-- default: summary and setting button -->
  <div class="popup-container" v-if="enablePopupClickTrigger!==undefined && enablePopupClickTrigger===false">
    <div class="popup-header">
      <img :src="iconUrl" class="popup-icon" />
      <div class="popup-title">{{ name }}</div>
      <div class="popup-version"> {{ version }}</div>
    </div>

    <Button variant="topic" class="popup-button" @click="invokeCurrentTabSummary">
      <BookOpenTextIcon />
      {{ t('summarize') }}
    </Button>

    <Button @click="sendMessage('openOptionPage', '/options.html#/')" variant="secondary" class="popup-button">
      <SettingsIcon />
      {{ t('Open_Setting') }}
    </Button>
  </div>
</template>

<style scoped>
.popup-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  width: 320px;
  min-height: 200px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  background: #fff;
}

.popup-header {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  white-space: nowrap;
  align-items: center;
  gap: 4px;
  padding-right: 32px;
}

.popup-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.popup-title {
  align-self: flex-start;
  font-weight: 500;
  font-size: 14px;
}

.popup-version {
  font-size: 12px;
  font-weight: 300;
  align-self: flex-end;
  color: #666;
}

.popup-button {
  width: 100%;
  justify-content: flex-start;
  font-size: 14px;
  padding: 8px 12px;
  height: auto;
  min-height: 36px;
}
</style>
