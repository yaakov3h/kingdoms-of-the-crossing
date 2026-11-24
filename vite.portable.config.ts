import{defineConfig}from'vite';export default defineConfig({base:'./',build:{outDir:'dist-portable',rollupOptions:{output:{inlineDynamicImports:true}}}});
