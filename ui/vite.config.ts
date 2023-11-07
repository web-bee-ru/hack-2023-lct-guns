// @ts-ignore
import { defineConfig } from 'vite';
// @ts-ignore
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/ui',
  plugins: [react()],
});
