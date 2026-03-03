import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      'react-native': resolve(__dirname, './tests/mocks/react-native.ts'),
      '@react-native-async-storage/async-storage': resolve(__dirname, './tests/mocks/async-storage.ts'),
      '@react-native-community/netinfo': resolve(__dirname, './tests/mocks/netinfo.ts'),
    },
  },
  test: {
    globals: true,
    include: ['tests/**/*.test.ts', '__tests__/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
