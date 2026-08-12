import { redirect } from "next/navigation";
import { getMyPendingInvitations } from "@/app/actions/notifications";
import { ensureWorkspaceAccess } from "@/app/actions/workspace-access";
import { OnboardingGate } from "@/components/onboarding-gate";

export default async function OnboardingPage() {
  const access = await ensureWorkspaceAccess();

  // Zaten workspace'i olan kullanıcı dashboard'a
  if (access.hasAccess) {
    redirect("/");
  }

  // Cookie görünür ama SSR auth başarısız → cookie temizle (redirect loop önlemi)
  if (!access.userId) {
    redirect("/clear-session");
  }

  const invitesResult = await getMyPendingInvitations();
  const invitations = invitesResult.success ? invitesResult.invitations : [];
  const hasInvitations = invitations.length > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            İş Yönetim Sistemi
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {hasInvitations ? "Bekleyen Davetin Var" : "Workspace Oluştur"}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {hasInvitations
              ? "Seni bir çalışma alanına davet ettiler. Kabul edersen doğrudan o workspace'e geçersin; reddedersen kendi workspace'ini oluşturabilirsin."
              : "İlk çalışma alanını oluştur. Bu workspace'in sahibi (Admin) olursun; proje ve görev ekleyebilir, ekibini davet edebilirsin."}
          </p>
        </div>

        <OnboardingGate invitations={invitations} />
      </div>
    </div>
  );
}
