import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Quiet Studio — Photography",
  description:
    "A space for seeing slowly. An independent photography collection.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
