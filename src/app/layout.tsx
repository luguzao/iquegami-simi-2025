import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ToastProvider } from "@/components/ui/toast-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aplicativo SIMI Iquegami",
  description: "Aplicativo de gerenciamento Iquegami",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SIMI Iquegami"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#d63031" // Conversão precisa do oklch(65.789% 0.22839 26.164)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Meta tags para cor da barra de status mobile - usando cor primary */}
        <meta name="theme-color" content="#d63031" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#d63031" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#d63031" />
        <meta name="msapplication-TileColor" content="#d63031" />
        <meta name="msapplication-navbutton-color" content="#d63031" />
        
        {/* iOS Safari - configurações específicas */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SIMI Iquegami" />
        
        {/* Meta tags adicionais para Safari */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-touch-fullscreen" content="yes" />
        
        {/* Android Chrome */}
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Viewport personalizado para mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
        
        {/* CSS inline para forçar a cor no Safari */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media screen and (max-width: 768px) {
                :root {
                  color-scheme: light;
                }
                
                body {
                  background-color: white;
                }
                
                /* Forçar cor da barra de endereço do Safari */
                html {
                  background-color: #d63031 !important;
                }
              }
              
              @supports (padding: env(safe-area-inset-top)) {
                html {
                  background-color: #d63031 !important;
                }
              }
            `,
          }}
        />
        
        {/* Script para definir theme-color dinamicamente baseado na variável CSS */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Função para atualizar theme-color
                function updateThemeColor() {
                  const themeColorMeta = document.querySelector('meta[name="theme-color"]:not([media])');
                  if (themeColorMeta) {
                    themeColorMeta.setAttribute('content', '#d63031');
                  }
                  
                  // Forçar atualização do Safari
                  document.documentElement.style.setProperty('--safari-theme-color', '#d63031');
                }
                
                // Executar imediatamente
                updateThemeColor();
                
                // Executar quando DOM carregar
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', updateThemeColor);
                } else {
                  updateThemeColor();
                }
                
                // Executar após um pequeno delay para Safari
                setTimeout(updateThemeColor, 100);
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
        <Toaster />
      </body>
    </html>
  );
}
