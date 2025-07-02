import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    // Load environment variables from .env files with VITE_ prefix
    const env = loadEnv(mode, process.cwd(), ['VITE_', 'GEMINI_']);
    
    return {
      // Make sure environment variables are properly exposed
      define: {
        // Expose all required environment variables
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:5000'),
      },
      // Configure path aliases
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // Disable HMR overlay to prevent errors from showing
      server: {
        hmr: {
          overlay: false
        }
      }
    };
});
