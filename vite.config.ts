import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Stamp sw.js with a unique version per build so browsers detect the new
// service worker (a byte-identical sw.js would never trigger an update).
function swVersionPlugin(): Plugin {
  return {
    name: 'sw-version',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(process.cwd(), 'dist/sw.js')
      const stamped = readFileSync(swPath, 'utf8').replaceAll(
        '__BUILD_VERSION__',
        Date.now().toString(36)
      )
      writeFileSync(swPath, stamped)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), swVersionPlugin()],
  base: '/workout-app/',
})
