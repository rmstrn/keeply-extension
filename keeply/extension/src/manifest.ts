import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Keeply — AI Tab Manager',
  version: '1.0.0',
  description: 'Group your browser tabs with AI in seconds. No signup required.',

  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Keeply',
    default_icon: {
      16: 'public/icons/icon-16.png',
      32: 'public/icons/icon-32.png',
      48: 'public/icons/icon-48.png',
      128: 'public/icons/icon-128.png',
    },
  },

  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },

  permissions: [
    'tabs',
    'storage',
    'windows',
  ],

  host_permissions: [
    // Edge Function URL — заменить на реальный после деплоя
    'https://*.supabase.co/*',
  ],

  icons: {
    16: 'public/icons/icon-16.png',
    32: 'public/icons/icon-32.png',
    48: 'public/icons/icon-48.png',
    128: 'public/icons/icon-128.png',
  },
})
