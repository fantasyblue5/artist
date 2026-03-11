import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "艺术家 Workspace",
  description: "低饱和蓝白风格的创作工作台与项目管理界面",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
