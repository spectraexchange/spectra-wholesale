import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ErrorReporter } from "@/components/error-reporter";
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

const description =
  "Wholesale cannabis marketplace built for Alaska. Licensed retailers order directly from cultivators and processors.";

// Share previews (iMessage, Slack, social) use app/opengraph-image.png and twitter-image.png.
export const metadata: Metadata = {
  // The canonical host (apex redirects here); some preview crawlers won't follow redirects for images
  metadataBase: new URL("https://www.spectrawholesale.com"),
  title: "Spectra Wholesale",
  description,
  applicationName: "Spectra Wholesale",
  openGraph: {
    type: "website",
    siteName: "Spectra Wholesale",
    title: "Spectra Wholesale",
    description,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spectra Wholesale",
    description,
  },
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
      <body className="min-h-full flex flex-col">
        <ErrorReporter />
        {children}
      </body>
    </html>
  );
}
