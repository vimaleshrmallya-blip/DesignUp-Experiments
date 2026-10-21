import { build, context } from "esbuild";
import { mkdirSync, copyFileSync, writeFileSync, readdirSync } from "node:fs";

const html = (js) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DesignUp 2026 Island</title><style>html,body,#root{height:100%;margin:0}</style></head><body><div id="root"></div>
<script src="/config.js"></script>
<script src="/app.js"></script></body></html>`;

mkdirSync("dist", { recursive: true });
for (const f of readdirSync("public")) copyFileSync("public/" + f, "dist/" + f);
writeFileSync("dist/index.html", html());

const opts = { entryPoints: ["src/main.jsx"], bundle: true, minify: true, outfile: "dist/app.js", loader: { ".jsx": "jsx" }, define: { "process.env.NODE_ENV": '"production"' }, logLevel: "info" };
if (process.argv.includes("--serve")) {
  const ctx = await context({ ...opts, minify: false });
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: "dist", port: 3000 });
  console.log("http://localhost:" + port);
} else {
  await build(opts);
}
