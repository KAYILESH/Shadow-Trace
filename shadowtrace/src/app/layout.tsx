import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ScanRadar — Digital Footprint Cleaner | Erase Your Online Presence",
  description:
    "ScanRadar scans the deep web, data brokers, and social platforms to find and eliminate your exposed personal data. Enterprise-grade digital footprint protection.",
  keywords: [
    "digital footprint",
    "privacy",
    "data removal",
    "cybersecurity",
    "identity protection",
    "data broker removal",
    "online privacy",
  ],
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "ScanRadar — Digital Footprint Cleaner",
    description:
      "Erase your digital footprint before they find you. AI-powered privacy protection.",
    type: "website",
    siteName: "ScanRadar",
    images: [{ url: "/logo.png" }],
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body style={{ backgroundColor: '#F8FAFC', color: '#0F172A' }} className="min-h-full flex flex-col bg-background text-foreground">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#FFFFFF",
              color: "#0F172A",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "12px",
              fontSize: "14px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            },
            success: {
              iconTheme: { primary: "#FF6B00", secondary: "#FFFFFF" },
            },
            error: {
              iconTheme: { primary: "#FF0033", secondary: "#FFFFFF" },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
