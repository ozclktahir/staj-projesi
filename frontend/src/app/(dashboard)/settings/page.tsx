import { Monitor, Settings } from "lucide-react";
import { ThemeSelector } from "@/components/theme-selector";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Settings</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Ayarlar
        </h1>
      </div>

      <Card className="rounded-[var(--radius)] border-border bg-card shadow-sm">
        <CardHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-[var(--radius)] bg-primary/15 text-primary">
            <Monitor className="size-5" />
          </div>
          <CardTitle className="text-lg text-foreground">Görünüm</CardTitle>
          <CardDescription>
            Uygulama temasını seçin. Tercih tarayıcıda saklanır ve yenilemede
            korunur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
        </CardContent>
      </Card>

      <Card className="rounded-[var(--radius)] border-dashed border-border bg-card/60">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-[var(--radius)] bg-muted text-muted-foreground">
            <Settings className="size-6" />
          </div>
          <CardTitle className="text-lg text-foreground">
            Diğer hesap ayarları
          </CardTitle>
          <CardDescription className="max-w-md">
            Profil ve bildirim tercihleri yakında burada yönetilecek.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
