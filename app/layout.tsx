import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/providers/query-provider";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "hi-res",
  description: "Collaborative document management with teams, collections, and rich text editing. Organize your work with precision.",
  openGraph: {
    title: "hi-res",
    description: "Collaborative document management with teams, collections, and rich text editing. Organize your work with precision.",
    images: [
      {
        url: "/hero.webp",
        width: 1200,
        height: 630,
        alt: "hi-res",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "hi-res",
    description: "Collaborative document management with teams, collections, and rich text editing. Organize your work with precision.",
    images: ["/hero.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NuqsAdapter>
          <QueryProvider>{children}</QueryProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
