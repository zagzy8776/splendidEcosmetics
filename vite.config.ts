import { defineConfig } from 'vite'

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

function injectFirebaseSw() {
  function inject(src: string) {
    const env = process.env
    const replacements: Record<string, string> = {
      PLACEHOLDER_API_KEY: env.VITE_FIREBASE_API_KEY || '',
      PLACEHOLDER_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN || '',
      PLACEHOLDER_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID || 'splendid-e-cosmetics',
      PLACEHOLDER_STORAGE_BUCKET: env.VITE_FIREBASE_STORAGE_BUCKET || '',
      PLACEHOLDER_MESSAGING_SENDER_ID: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      PLACEHOLDER_APP_ID: env.VITE_FIREBASE_APP_ID || '',
    }
    let out = src
    for (const [k, v] of Object.entries(replacements)) {
      out = out.split(k).join(v)
    }
    return out
  }
  return {
    name: 'inject-firebase-sw',
    closeBundle() {
      try {
        const distDir = path.resolve(__dirname, 'dist')
        if (!fs.existsSync(distDir)) return
        const env = process.env
        const replacements: Record<string, string> = {
          PLACEHOLDER_API_KEY: env.VITE_FIREBASE_API_KEY || '',
          PLACEHOLDER_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN || '',
          PLACEHOLDER_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID || 'splendid-e-cosmetics',
          PLACEHOLDER_STORAGE_BUCKET: env.VITE_FIREBASE_STORAGE_BUCKET || '',
          PLACEHOLDER_MESSAGING_SENDER_ID: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
          PLACEHOLDER_APP_ID: env.VITE_FIREBASE_APP_ID || '',
        }
        for (const name of ['firebase-config.js', 'firebase-messaging-sw.js']) {
          const pub = path.resolve(__dirname, 'public', name)
          if (!fs.existsSync(pub)) continue
          let src = fs.readFileSync(pub, 'utf8')
          for (const [k, v] of Object.entries(replacements)) {
            src = src.split(k).join(v)
          }
          fs.writeFileSync(path.resolve(distDir, name), src)
          console.log('[inject-firebase-sw] wrote', name, 'projectId=', replacements.PLACEHOLDER_PROJECT_ID)
        }
      } catch (e: any) {
        console.warn('[inject-firebase-sw]', e?.message)
      }
    },
  }
}

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    injectFirebaseSw(),
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
