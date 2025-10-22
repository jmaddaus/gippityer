import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default {
    // ... other configuration
    build: {
        rollupOptions: {
            external: [
                'electron',
                'electron-store',
                'get-windows',
                'robotjs'
            ],
        },
    },
};