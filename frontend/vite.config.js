import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import {fileURLToPath, URL} from 'node:url';

export default defineConfig(({mode}) => {
    const isProd = mode === 'production';

    return {
        plugins: [
            vue(),
            vuetify({autoImport: true})
        ],

        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url))
            }
        },

        /* ============================================================
           DEV SERVER ONLY (ignored in production)
           ------------------------------------------------------------
           Proxy is used only during local dev.
        ============================================================= */
        server: {
            port: 3000,
            proxy: !isProd ? {
                '/api': {
                    target: 'http://localhost:5000',
                    changeOrigin: true
                },
                '/socket.io': {
                    target: 'http://localhost:5000',
                    ws: true
                }
            } : undefined
        },

        /* ============================================================
           BUILD CONFIG — important for Nginx monolithic deployment
        ============================================================= */
        build: {
            outDir: 'dist',
            sourcemap: false,
            emptyOutDir: true
        },

        /* ============================================================
           GLOBAL ENV VARIABLES exposed to frontend
        ============================================================= */
        define: {
            __API_URL__: JSON.stringify(process.env.VITE_API_URL || '/api'),
            __SOCKET_URL__: JSON.stringify(process.env.VITE_SOCKET_URL || '/socket.io')
        }
    };
});
