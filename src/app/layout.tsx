import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StaffSync – Summer Playground",
  description: "System zarządzania personelem sezonowym",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StaffSync",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <head>
        <meta name="application-name" content="StaffSync" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="StaffSync" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#064d61" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}