import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HELM // Adversarial Strategy Simulation",
  description:
    "Anticipate competitor moves 3–5 turns ahead. Tactical & strategic decision simulation across multiple rounds and scenarios.",
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
