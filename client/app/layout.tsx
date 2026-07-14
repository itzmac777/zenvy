import type { Metadata } from "next";
import { DM_Sans, Noto_Serif_Bengali } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Zenvy",
  description: "A refined indoor football turf booking platform for adult players and field owners.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${bdtSerif.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
