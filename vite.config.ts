import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

export default defineConfig(() => {
  const githubPages = process.env.GITHUB_PAGES === "true";

  return {
    base: githubPages ? "/line-rich-menu-ig-line-ai/" : "/",
    resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
    plugins: githubPages
      ? [react()]
      : [react(), sites(), cloudflare({ viteEnvironment: { name: "server" } })],
    build: githubPages ? { outDir: "dist/github-pages", emptyOutDir: true } : undefined,
  };
});
