import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spectra Wholesale",
  description: "Alaska's licensed cannabis wholesale marketplace.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The theme script sets data-theme before hydration
      suppressHydrationWarning
      className={`${jakarta.variable} ${fraunces.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        {/* Must be a raw inline <script> so it runs before first paint. next/script's
            beforeInteractive defers inline code until after hydration (theme flash).
            React logs a dev-only "script tag" warning for this; it's expected. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
