import { redirect } from "next/navigation";
import { ensureWorkspaceAccess } from "@/app/actions/workspace-access";
import { OnboardingCreateWorkspace } from "@/components/onboarding-create-workspace";

export default async function OnboardingPage() {
  const access = await ensureWorkspaceAccess();

  // Zaten workspace'i olan kullanıcı dashboard'a
  if (access.hasAccess) {
    redirect("/");
  }

  // Oturum yoksa proxy login'e atar; yine de güvenli taraf
  if (!access.userId) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            İş Yönetim Sistemi
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Workspace Oluştur
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            İlk çalışma alanını oluştur. Bu workspace&apos;in sahibi (Admin)
            olursun; proje ve görev ekleyebilir, ekibini davet edebilirsin.
          </p>
        </div>

        <OnboardingCreateWorkspace />
      </div>
    </div>
  );
}
