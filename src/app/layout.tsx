import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Onyx",
  title: {
    default: "Onyx",
    template: "%s | Onyx",
  },
  description:
    "A privacy-first factory profit, loss and forecast dashboard for operational financial performance.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
