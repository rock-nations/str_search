import type { Metadata } from "next";
import { Geist_Mono, Montserrat, Poppins } from "next/font/google";

import { AppHeader } from "@/components/app-header";

import "./globals.css";
import { Providers } from "./providers";

// STR Search's type pairing: Montserrat for headings, Poppins for body copy.
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Underwriting Lab · STR Search", template: "%s · Underwriting Lab · STR Search" },
  description: "Practice short-term rental underwriting and compare your forecast with an analyst's.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${montserrat.variable} ${poppins.variable} ${geistMono.variable} antialiased`}>
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
