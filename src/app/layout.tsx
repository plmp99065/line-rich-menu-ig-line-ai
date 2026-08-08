import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./browser-fixes.css";

export const metadata: Metadata = {
  title: "窩的家客服｜LINE 客服管理後台",
  description: "LINE 圖文選單、AI 客服與人工收件匣整合後台",
  manifest: "manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "窩的家客服" },
  icons: { icon: [{ url: "app-icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "app-icon-180.png", sizes: "180x180", type: "image/png" }] },
};

export const viewport: Viewport = { themeColor: "#123f35" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
