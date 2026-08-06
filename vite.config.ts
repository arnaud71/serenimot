import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function getBasePath(): string {
  if (process.env.BASE_PATH) {
    return process.env.BASE_PATH;
  }

  if (process.env.GITHUB_REPOSITORY) {
    const repositoryName = process.env.GITHUB_REPOSITORY.split("/").at(-1);
    return repositoryName ? `/${repositoryName}/` : "/";
  }

  return "/";
}

export default defineConfig({
  base: getBasePath(),
  plugins: [react()]
});
