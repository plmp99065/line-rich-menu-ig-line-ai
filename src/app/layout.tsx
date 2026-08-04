import type { Metadata } from "next";
import "./globals.css";
import "./browser-fixes.css";

export const metadata: Metadata = {
  title: "窩的家客服｜LINE 客服管理後台",
  description: "LINE 圖文選單、AI 客服與人工收件匣整合後台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
