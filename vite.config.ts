import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from "path";
// https://vitejs.dev/config/
export default defineConfig({
  base: './',

  plugins: [vue()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, "./src"),
      '*': path.resolve(''),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 9123,
    open: true,
   
  },
})
