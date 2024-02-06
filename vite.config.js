import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, "src/index.js"),
      name: "React Firebase Chat",
      // the proper extensions will be added
      fileName: "index",
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["react"],
      output: [
        {
          format: "umd",
          name: "React Firebase Chat",
          // Provide global variables to use in the UMD build
          // for externalized deps
          globals: {
            react: "React",
          },
        },
        {
          format: "es",
          intro: 'import "./style.css";',
        },
      ],
    },
  },
});
