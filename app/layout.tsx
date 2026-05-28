import type { Metadata } from "next";
import { Inter, Roboto_Slab } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const robotoSlab = Roboto_Slab({subsets:['latin'],variable:'--font-serif'});

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "URL → Markdown 변환기",
  description: "웹 페이지를 본문 Markdown으로 변환해 LLM에 바로 전달합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className={cn("font-serif", robotoSlab.variable)}>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
