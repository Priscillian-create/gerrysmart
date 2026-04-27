import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS Backend",
  description: "Production-ready POS backend on Next.js, Prisma, and TiDB."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
