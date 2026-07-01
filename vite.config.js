import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: false,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'flow-field': resolve(__dirname, 'animations/flow-field/index.html'),
        'wave-horizon': resolve(__dirname, 'animations/wave-horizon/index.html'),
      },
    },
  },
});
