import type { Metadata } from "next";
import { DM_Sans, Noto_Sans_Bengali, Noto_Serif_Bengali } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const bdtSerif = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: "500",
  variable: "--font-noto-serif-bengali",
  display: "swap",
});

const managerBangla = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-manager-bangla",
  display: "swap",
});

const arpona = localFont({
  src: "../fonts/arpona/ArponaLight.otf",
  variable: "--font-arpona",
  weight: "300",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zenvy",
  description: "A refined indoor football turf booking platform for adult players and field owners.",
  manifest: "/manifest.webmanifest",
  applicationName: "Zenvy Manager",
  icons: {
    icon: "/icon.svg",
    apple: "/zenvy-football-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body suppressHydrationWarning className={`${dmSans.variable} ${bdtSerif.variable} ${managerBangla.variable} ${arpona.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
