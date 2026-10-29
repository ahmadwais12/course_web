import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ThemeInitScript from "@/components/ThemeInitScript";
import SplashScreen from "@/components/SplashScreen";
import Toaster from "@/components/ui/Toast";
import { PermissionsProvider } from "@/context/PermissionsContext";
import AnalyticsBeacon from "@/components/analytics/AnalyticsBeacon";
import { buildRootMetadata, SEO } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = buildRootMetadata();

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#070b12" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={SEO.language} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <LanguageProvider>
            <PermissionsProvider>
              {children}
              <Suspense fallback={null}>
                <AnalyticsBeacon />
              </Suspense>
              <SplashScreen />
              <Toaster />
            </PermissionsProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
