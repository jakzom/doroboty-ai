import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { i02ChatPlugin } from "./server/i02-chat";

export default defineConfig(({ command, mode, isPreview }) => {
  const localDev = command === "serve" && !isPreview;
  const apiEnabled = localDev || (command === "build" && process.env.I02_HOSTED_AI === "enabled");
  const env = localDev ? loadEnv(mode, process.cwd(), "I02_") : {};
  return {
    define: {
      "import.meta.env.I02_API_ENABLED": JSON.stringify(apiEnabled ? "enabled" : "disabled"),
    },
    plugins: [
      react(),
      tailwindcss(),
      localDev &&
        i02ChatPlugin({
          key: env.I02_OPENAI_API_KEY?.trim() ?? "",
          model: env.I02_OPENAI_MODEL?.trim() || "gpt-5-mini",
        }),
    ],
    base: "./",
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  };
});
