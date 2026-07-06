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
        'wave-horizon-2': resolve(__dirname, 'animations/wave-horizon-2/index.html'),
        'leave-a-message': resolve(__dirname, 'animations/leave-a-message/index.html'),
        'connections-1': resolve(__dirname, 'animations/connections-1/index.html'),
        'connections-2': resolve(__dirname, 'animations/connections-2/index.html'),
        'model-loader': resolve(__dirname, 'animations/model-loader/index.html'),
        heartsigh: resolve(__dirname, 'animations/heartsigh/index.html'),
      },
    },
  },
}));
