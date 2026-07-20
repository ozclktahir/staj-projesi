import { Settings } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Settings</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Ayarlar
        </h1>
      </div>
      <Card className="rounded-[var(--radius)] border-dashed border-border bg-card/60">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-[var(--radius)] bg-primary/15 text-primary">
            <Settings className="size-6" />
          </div>
          <CardTitle className="text-lg text-foreground">
            Hesap ve tercih ayarları
          </CardTitle>
          <CardDescription className="max-w-md">
            Profil, bildirim ve tema tercihleri burada yönetilecek.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
