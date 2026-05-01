import type { Metadata, Viewport } from "next";
import { Inter, Newsreader, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import Navbar from "@/components/Navbar";
import MobileTabBar from "@/components/MobileTabBar";
import ConditionalFooter from "@/components/ConditionalFooter";


const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#191919",
};

export const metadata: Metadata = {
  title: "GR Connect",
  description:
    "Connecting researchers, academics, and industry experts worldwide. Discover top-rated experts, engage through AI-powered consultations, and accelerate your research impact.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GR Connect",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable} ${playfair.variable}`}>
      <body className="min-h-screen flex flex-col bg-cream-bg text-charcoal antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <MobileTabBar />

          <ConditionalFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
