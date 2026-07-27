"use client";

import { ThemeProvider } from "@/components/theme-provider";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider
      attribute="class"
      forcedTheme="dark"
      enableSystem={false}
      defaultTheme="dark"
      storageKey="theme"
      disableTransitionOnChange
    >
      <div className="dark min-h-screen bg-zinc-950 text-zinc-50">
        {children}
      </div>
    </ThemeProvider>
  );
}
