import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import fs from "node:fs";
import path from "node:path";

// ponytail: H5 dev — 让 /favicon.ico 直接命中 src/static/favicon.ico，避免 404。
// Chrome 等仍会硬抓该路径，所以加一个内置中间件（生产构建 TDesign/uni-app 不受影响）。
const faviconPath = path.resolve(__dirname, "src/static/favicon.ico");

export default defineConfig({
  plugins: [
    uni(),
    {
      name: "favicon-shortcut",
      configureServer(server) {
        server.middlewares.use("/favicon.ico", (_req, res) => {
          if (fs.existsSync(faviconPath)) {
            res.setHeader("Content-Type", "image/svg+xml");
            fs.createReadStream(faviconPath).pipe(res);
          } else {
            res.statusCode = 204;
            res.end();
          }
        });
      },
    },
  ],
});
