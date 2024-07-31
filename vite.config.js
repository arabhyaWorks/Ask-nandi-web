
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',  // Directory for public assets like index.html
  build: {
    outDir: 'dist',  // Output directory for build
  },
  server: {
    port: 3000,  // Vite development server port
  },
});