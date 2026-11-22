// 瀏覽器分頁及 Android 主畫面使用的圖示
import { renderAppIcon } from "./appIconImage";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return renderAppIcon(512);
}
