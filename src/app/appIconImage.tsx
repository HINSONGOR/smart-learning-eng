// App 圖示的共用設計：青綠色底、白色「SE」（Smart English）
import { ImageResponse } from "next/og";

export function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
          color: "white",
          fontWeight: 800,
        }}
      >
        <div style={{ fontSize: size * 0.46, letterSpacing: -size * 0.02, lineHeight: 1 }}>SE</div>
        <div
          style={{
            marginTop: size * 0.04,
            width: size * 0.42,
            height: size * 0.035,
            borderRadius: size,
            background: "rgba(255,255,255,0.85)",
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
