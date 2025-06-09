import '@/assets/tailwind.css';
import '@/assets/shadow-dom-reset.css';
import { createShadowRootUi } from "wxt/client";
import { defineContentScript } from "wxt/sandbox";


// 1. Import the style
// import './style.css';
import { getUserCustomStyle } from "@/src/composables/general-config";
import { injectUserSettingCssVariables } from "@/src/utils/document";
import { createApp } from 'vue';
import App from './App.vue';

export default defineContentScript({
  matches: [
    '<all_urls>',
  ],
  // 2. Set cssInjectionMode
  cssInjectionMode: 'ui',

  async main(ctx) {
    console.log('content script loaded: page.content');
    // 3. Define your UI
    const ui = await createShadowRootUi(ctx, {
      name: 'webpage-summary',
      position: 'inline',
      anchor: 'body',
  		append: "last",
      mode: 'open',  //enable document.select('webpage-summary').shadowRoot
      
    

      onMount: (container, _shadow, shadowHost) => {
        // console.log(container,_shadow,shadowHost,_shadow.ownerDocument)

        shadowHost.style.visibility='visible'; //force visible. Prevent some websites (such as Reddit) from using selectors to force web components to be hidden.

        // Apply consistent font and reset styles to prevent page interference
        applyConsistentStyles(_shadow, shadowHost)

        // Apply critical pixel-based overrides
        applyCriticalPixelOverrides(_shadow)

        //inject user-custom appearance css vars
        getUserCustomStyle().then(style=>{
          injectUserSettingCssVariables(style)
        })
        


        const app = createApp(App);
        app.config.errorHandler = (err:any) => {
          console.error('vue err',err)
          // toast({ title: 'Error', description: err.message ,variant:'destructive'}); //don't run this line, it may affect user's browsering
        }
        app.mount(container);
        return app;
      },
      
      onRemove: (app) => {
        // Unmount the app when the UI is removed
        app?.unmount();
      },
    });

    // 4. Mount the UI
    ui.mount();
  },
});


/**
 * Apply consistent styles and font to prevent page interference
 * @param shadowRoot
 * @param shadowHost
 */
function applyConsistentStyles(shadowRoot: ShadowRoot, shadowHost: HTMLElement) {
  // Get page font but provide fallback
  let pageFont = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  try {
    const computedFont = window.getComputedStyle(document.body).fontFamily;
    if (computedFont && computedFont !== 'inherit' && computedFont !== 'initial') {
      pageFont = computedFont;
    }
  } catch (e) {
    console.warn('Failed to get page font, using fallback:', e);
  }

  const style = document.createElement('style');
  style.textContent = `
    /* Additional dynamic font application */
    :host {
      font-family: ${pageFont} !important;
    }

    html, body {
      font-family: ${pageFont} !important;
    }

    /* Apply page font to all text elements while maintaining size consistency */
    .user-setting-style * {
      font-family: ${pageFont} !important;
    }
  `;
  shadowRoot.querySelector('head')?.appendChild(style);
}

/**
 * Apply critical pixel-based overrides to ensure consistent sizing
 * @param shadowRoot
 */
function applyCriticalPixelOverrides(shadowRoot: ShadowRoot) {
  const style = document.createElement('style');
  style.textContent = `
    /* CRITICAL: Override all rem-based calculations with pixel values */

    /* Force root font size to prevent rem calculation issues */
    html {
      font-size: 16px !important;
    }

    /* Override CSS variables with pixel values */
    :root, html, :host {
      --webpage-summary-panel-width: 480px !important;
      --webpage-summary-panel-dialog-max-height: 480px !important;
      --webpage-summary-panel-top: 64px !important;
      --webpage-summary-panel-right: 64px !important;
    }

    /* Force specific Tailwind classes to use pixel values */
    .user-setting-style [class*="w-[var(--webpage-summary-panel-width)]"] {
      width: 480px !important;
    }

    .user-setting-style [class*="max-h-[--webpage-summary-panel-dialog-max-height]"] {
      max-height: 480px !important;
    }

    /* Critical spacing overrides */
    .user-setting-style .px-1 { padding-left: 4px !important; padding-right: 4px !important; }
    .user-setting-style .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }
    .user-setting-style .gap-1 { gap: 4px !important; }
    .user-setting-style .w-6 { width: 24px !important; }
    .user-setting-style .h-6 { height: 24px !important; }
    .user-setting-style .rounded-t-xl { border-top-left-radius: 12px !important; border-top-right-radius: 12px !important; }
    .user-setting-style .rounded-b-xl { border-bottom-left-radius: 12px !important; border-bottom-right-radius: 12px !important; }

    /* Ensure all elements inherit the forced sizing */
    .user-setting-style * {
      box-sizing: border-box !important;
    }
  `;
  shadowRoot.querySelector('head')?.appendChild(style);
}

/**
 * @deprecated Use applyConsistentStyles instead
 */
function applyPageHtmlFont(shadowRoot:ShadowRoot, shadowHost:HTMLElement){
  const pageFont = window.getComputedStyle(document.body).fontFamily;

  const style = document.createElement('style');
  style.textContent = `
    html, :host {
      font-family: ${pageFont}; /* test_j4571 */
    }
  `;
  shadowRoot.querySelector('head')?.appendChild(style);
}