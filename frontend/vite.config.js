import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
var proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:4000';
var wsTarget = proxyTarget.replace('http', 'ws');
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        host: true,
        proxy: {
            '/api': {
                target: proxyTarget,
                changeOrigin: true,
            },
            '/socket': {
                target: wsTarget,
                ws: true,
            },
        },
    },
});
