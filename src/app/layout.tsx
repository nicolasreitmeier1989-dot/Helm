import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HELM // Strategic Foresight",
  description:
    "Map your business, anticipate your competitor, decide your next move. Strategic foresight across BMC, VPC, capabilities and multi-round rollouts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-ink-0 text-ink-900 font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
