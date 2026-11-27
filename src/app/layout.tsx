import type { Metadata, Viewport } from "next";
import "./globals.css";

import PWAManager from "@/components/PWAManager";

export const metadata: Metadata = {
  title: "دارك للاستثمار والتسويق العقاري | CRM",
  description: "نظام إدارة علاقات العملاء لشركة دارك للاستثمار والتسويق العقاري",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#d4af37",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <PWAManager />
        {children}
      </body>
    </html>
  );
}
