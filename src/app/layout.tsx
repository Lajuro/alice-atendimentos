import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

export const metadata: Metadata = {
  title: "Painel de Atendimentos",
  description:
    "Controle diário de atendimentos",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Atendimentos",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#BE0380" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
      </head>
      <body className="min-h-full flex bg-background text-foreground">
        <Script
          id="dark-mode-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('painel-tema')==='escuro')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
