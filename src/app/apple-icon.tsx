// iPhone／iPad「加入主畫面」時使用的圖示
import { renderAppIcon } from "./appIconImage";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppIcon(180);
}
