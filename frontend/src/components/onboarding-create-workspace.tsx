"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createWorkspace } from "@/app/actions/workspaces";
import { clearAuthSession } from "@/lib/auth-session";
import { writeActiveWorkspaceId } from "@/hooks/use-workspaces";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingCreateWorkspace() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await createWorkspace({ name, description });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      writeActiveWorkspaceId(result.workspace.id);
      toast.success("Workspace oluşturuldu — Admin olarak devam ediyorsun");
      // Hard navigate: session/context anında güncellenir (çıkış gerekmez)
      window.location.assign(
        `/?workspaceId=${encodeURIComponent(result.workspace.id)}`,
      );
      return;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Workspace oluşturulurken bir hata oluştu.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await clearAuthSession();
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Card className="rounded-lg border-border bg-card shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg text-foreground">
          Yeni çalışma alanı
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Ad zorunludur. Oluşturduğun workspace&apos;te tam yetkiye sahip
          olursun.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="onboarding-workspace-name">Workspace adı</Label>
            <Input
              id="onboarding-workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Örn: Kişisel Projeler"
              required
              disabled={isSubmitting}
              className="rounded-lg"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="onboarding-workspace-description">Açıklama</Label>
            <textarea
              id="onboarding-workspace-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="İsteğe bağlı açıklama"
              rows={3}
              disabled={isSubmitting}
              className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? "Oluşturuluyor…" : "Workspace Oluştur"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            disabled={signingOut || isSubmitting}
            onClick={() => void onSignOut()}
            className="w-full rounded-lg text-muted-foreground"
          >
            {signingOut ? "Çıkış yapılıyor…" : "Çıkış Yap"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
