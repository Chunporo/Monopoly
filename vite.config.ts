import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
    const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;
    
    return {
        plugins: isTauri ? [react()] : [react(), basicSsl()],
        build: {
            outDir: isTauri ? "dist" : "docs"
        },
        server: {
            https: !isTauri,
            port: 5173,
            strictPort: true,
        },
        base: "/",
        // Prevent vite from obscuring rust errors
        clearScreen: false,
        // Tauri expects a fixed port
        envPrefix: ['VITE_', 'TAURI_'],
    };
});
