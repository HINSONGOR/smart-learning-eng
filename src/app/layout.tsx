import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { LearnerProvider } from "@/components/providers/LearnerProvider";
import { SpeechProvider } from "@/components/providers/SpeechProvider";
import { LoadingState } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart English 免費英文學習系統",
  description: "IELTS、日常生活及職場英文學習（本機試用版）",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant-HK">
      <body className="antialiased">
        <LearnerProvider>
          <SpeechProvider>
            <Suspense fallback={<LoadingState />}>
              <AppShell>{children}</AppShell>
            </Suspense>
          </SpeechProvider>
        </LearnerProvider>
      </body>
    </html>
  );
}
