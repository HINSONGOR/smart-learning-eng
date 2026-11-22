// 加入主畫面後以獨立 App 形式開啟（不顯示瀏覽器網址列）
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Smart English 免費英文學習系統",
    short_name: "Smart English",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f6",
    theme_color: "#0d9488",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
