import type { AppProps } from "next/app";
import Head from "next/head";
import { Toaster } from "react-hot-toast";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a0f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="EbookHub" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" href="/favicon.ico" />
        <title>EbookHub — File Bridge</title>
        <meta name="description" content="Transfer, convert and manage ebooks between your devices" />
      </Head>
      <div className="noise">
        <Component {...pageProps} />
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border-2)",
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
          },
          success: { iconTheme: { primary: "var(--green)", secondary: "var(--bg)" } },
          error:   { iconTheme: { primary: "var(--red)",   secondary: "var(--bg)" } },
        }}
      />
    </>
  );
}
