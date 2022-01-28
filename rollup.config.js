import babel from "rollup-plugin-babel";
import resolve from "@rollup/plugin-node-resolve";
import external from "rollup-plugin-peer-deps-external";
import { terser } from "rollup-plugin-terser";
import postcss from "rollup-plugin-postcss";
import postcssUrl from "postcss-url";
import url from "@rollup/plugin-url";

const extensions = [".js", ".jsx", ".svg", ".css", ".scss"];

export default [
  {
    input: "./src/index.js",
    output: [
      { file: "dist/index.js", format: "cjs" },
      { file: "dist/index.es.js", format: "es", exports: "named" },
    ],
    plugins: [
      postcss({
        plugins: [
          postcssUrl({
            url: "inline", // enable inline assets using base64 encoding
            maxSize: 300, // maximum file size to inline (in kilobytes)
            fallback: "copy", // fallback method to use if max size is exceeded
            include: [".wav"],
          }),
        ],
        minimize: true,
      }),
      babel({
        exclude: "node_modules/**",
        presets: ["@babel/preset-react"],
        extensions,
      }),
      url({
        fileName: "[name][extname]",
        include: ["**/*.wav"],
        limit: 50000,
      }),
      external(),
      resolve({ extensions }),
      terser(),
    ],
  },
];
