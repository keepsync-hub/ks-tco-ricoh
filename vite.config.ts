import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En GitHub Pages el sitio se sirve bajo /ks-tco-ricoh/; en local, bajo la raíz.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/ks-tco-ricoh/' : '/',
  plugins: [react()],
  assetsInclude: ['**/*.xlsx'],
})
