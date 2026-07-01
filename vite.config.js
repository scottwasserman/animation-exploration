import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/animation-exploration/' : '/',
  server: {
    open: false,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'flow-field': resolve(__dirname, 'animations/flow-field/index.html'),
        'face-it-1': resolve(__dirname, 'animations/face-it-1/index.html'),
        'wave-horizon': resolve(__dirname, 'animations/wave-horizon/index.html'),
        'leave-a-message': resolve(__dirname, 'animations/leave-a-message/index.html'),
      },
    },
  },
}));
