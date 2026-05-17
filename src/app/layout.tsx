import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Book Bob",
  description: "Shared camper booking calendar and trip history"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
