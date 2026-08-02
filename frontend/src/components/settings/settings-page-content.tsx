"use client";

import { useState } from "react";
import { Languages, Monitor, Shield } from "lucide-react";
import { ThemeSelector } from "@/components/theme-selector";
import { LanguageSelector } from "@/components/language-selector";
import { MfaSecurityPanel } from "@/components/settings/mfa-security-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/use-translation";
import { cn } from "@/lib/utils";

type SettingsTab = "appearance" | "language" | "security";

/** Ayarlar — Görünüm / Dil / Güvenlik (2FA) sekmeleri. */
export function SettingsPageContent() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<SettingsTab>("appearance");

  const tabs: { id: SettingsTab; label: string; icon: typeof Monitor }[] = [
    { id: "appearance", label: t("settings.appearance"), icon: Monitor },
    { id: "language", label: t("settings.language"), icon: Languages },
    { id: "security", label: t("settings.security"), icon: Shield },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">{t("settings.eyebrow")}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("settings.title")}
        </h1>
      </div>

      <div
        role="tablist"
        className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/40 p-1"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            variant={tab === id ? "default" : "ghost"}
            size="sm"
            className={cn("gap-2", tab === id && "shadow-sm")}
            onClick={() => setTab(id)}
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
      </div>

      {tab === "appearance" ? (
        <Card className="rounded-[var(--radius)] border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">
              {t("settings.appearance")}
            </CardTitle>
            <CardDescription>{t("settings.appearanceDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>
      ) : null}

      {tab === "language" ? (
        <Card className="rounded-[var(--radius)] border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">
              {t("settings.language")}
            </CardTitle>
            <CardDescription>{t("settings.languageDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSelector />
          </CardContent>
        </Card>
      ) : null}

      {tab === "security" ? (
        <Card className="rounded-[var(--radius)] border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">
              {t("settings.security")}
            </CardTitle>
            <CardDescription>{t("settings.securityDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <MfaSecurityPanel />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
