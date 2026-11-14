import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_PROXY_TARGET || 'http://api.sakinatherapy.app'
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(target).hostname)
  // باك اند بعيد يُختار بالـvirtual host فيحتاج ترويسة Host خاصة به
  const proxy = { '/api': { target, changeOrigin: !local } }
  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
  }
})
