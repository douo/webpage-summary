import { defineConfig } from "wxt";
import autoprefixer from "autoprefixer";
import tailwind from "tailwindcss";
import { fileURLToPath, URL } from "node:url";
// See https://wxt.dev/api/config.html
// console.log(`fileURLToPath(new URL('./', import.meta.url))`,fileURLToPath(new URL('./', import.meta.url)))
export default defineConfig({
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-vue"],
  imports: false,
  
  // 开发模式配置 - 改善热更新体验
  dev: {
    // 启用自动重载扩展
    reloadCommand: "Alt+R",
  },
  
  vite: (configEnv) => ({
    // Override config here, same as `defineConfig({ ... })`
    // inside vite.config.ts files
    
    // 开发模式特定配置
    ...(configEnv.mode === 'development' && {
      server: {
        hmr: {
          // 启用热模块替换
          overlay: true,
        },
      },
      optimizeDeps: {
        // 预构建常用依赖，提高开发体验
        include: ['vue', '@vueuse/core', 'eventemitter3'],
      },
    }),
    
    build: {
      // 禁用 sourcemap 以避免 Vue SFC 重复导出问题
      // sourcemap: configEnv.mode === 'development' ? 'inline' : false,
      rollupOptions: {
        external: (id) => {
          return (
            configEnv.mode === "production" &&
            id.includes("src/components/debug")
          );
        },
      },
    },
    plugins: [],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./", import.meta.url)),
      },
    },
    css: {
      postcss: {
        plugins: [tailwind(), autoprefixer()],
      },
    },
  }),

  hooks: {
    "build:manifestGenerated": (wxt, manifest) => {
      if (wxt.config.mode === "development") {
        // console.log('manifest',manifest)
        manifest.name = `(DEV)summary-ext (${wxt.config.browser})`;
      }
    },
  },

  manifest: (configEnv) => {
    const permissions =
      configEnv.browser === "firefox"
        ? [
            "storage",
            "contextMenus",
            "scripting",
            "activeTab",
            "cookies",
            "webRequest",
            "webRequestBlocking",
            "*://kimi.moonshot.cn/*",
            "*://chatgpt.com/*",
          ]
        : [
            "storage",
            "contextMenus",
            "scripting",
            "activeTab",
            "cookies",
            "declarativeNetRequest",
          ];
    return {
      name: "__MSG_extStoreName__",
      description: "__MSG_extDescription__",
      // name: 'Webpage Summary',
      // description: 'Open source webpage summarize tool, via any llm api, support prompt-template/site customization.',
      default_locale: "en",
      permissions: permissions,
      /*
       * use dynamic rules to filter requests inside extension
       */
      // declarative_net_request: {
      //   rule_resources: [
      //     {
      //       id: "ruleset",
      //       enabled: true,
      //       path: "rules.json",
      //     },
      //   ],
      // },
      icons: {
        // 16: '/icon/16.png',
        32: "/icon/32.png",
        48: "/icon/48.png",
        64: "/icon/64.png",
        128: "/icon/128.png",
      },
      commands: {
        COMMAND_INVOKE_SUMMARY: {
          suggested_key: {
            default: "Alt+S",
            mac: "Command+S",
          },
          description: "__MSG_Commad_Open_Panel_DESC__",
        },
        COMMAND_ADD_SELECTION: {
          suggested_key: {
            default: "Alt+A",
            mac: "Command+A",
          },
          description: "__MSG_add_selection_to_chat__",
        },
      },
      web_accessible_resources: [
        {
          matches: ["<all_urls>"],
          resources: [
            // 'content-scripts/*.map',
            "llm-icons/*",
          ],
        },
      ],
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content-scripts/page.js"],
          css: ["content-scripts/page.css"]
        }
      ]
    };
  },
});
