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
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Settings
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Ayarlar
        </h1>
      </div>
      <Card className="rounded-lg border border-dashed border-slate-200 bg-white">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-slate-100 text-slate-600">
            <Settings className="size-5" />
          </div>
          <CardTitle className="text-lg text-slate-900">
            Hesap ve tercih ayarları
          </CardTitle>
          <CardDescription className="max-w-md text-slate-500">
            Profil, bildirim ve tema tercihleri burada yönetilecek.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
