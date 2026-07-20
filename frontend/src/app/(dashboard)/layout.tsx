"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/dashboard/app-header";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import {
  readStoredUser,
  resolveUserDisplayName,
  syncAuthCookiesFromStorage,
} from "@/lib/auth-session";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [userName, setUserName] = useState("Kullanıcı");

  useEffect(() => {
    void syncAuthCookiesFromStorage().then(() => {
      setUserName(resolveUserDisplayName(readStoredUser()));
    });
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader userName={userName} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
