import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [cloudflare(), tailwindcss()],
  define: {
    "import\.meta\.url": '"file://"',
  },
  experimental: {
    enableNativePlugin: true,
  },
  build: {
    rolldownOptions: {
      experimental: {
        resolveNewUrlToAsset: true,
      },
      resolve: {
        conditionNames: ["import"],
      },
      moduleTypes: {
        ".jpg": "dataurl",
        ".jpeg": "dataurl",
        ".png": "dataurl",
        ".gif": "dataurl",
        ".svg": "dataurl",
        ".ico": "dataurl",
      },
    },
  },
});
