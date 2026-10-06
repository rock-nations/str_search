import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppHeader } from "@/components/app-header";

import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Underwriting Lab", template: "%s · Underwriting Lab" },
  description: "Practice short-term rental underwriting and compare your forecast with an analyst's.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh bg-background">
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <AppHeader />
            <main className="flex flex-1 flex-col">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
