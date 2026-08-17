"use client";

import {
  useWorkspacePresenceContext,
  type WorkspacePresenceState,
} from "@/components/workspace-presence-provider";

type PresenceState = WorkspacePresenceState;

/**
 * Bir workspace'teki "şu an çevrimiçi" kullanıcıları döner.
 *
 * Kanal artık burada AÇILMAZ; uygulama genelindeki tek kanal
 * `WorkspacePresenceProvider` (dashboard shell) tarafından yönetilir — böylece
 * kullanıcı dashboard dışındaki sayfalardayken de çevrimiçi sayılır. Bu hook
 * yalnızca o ortak durumu okur.
 *
 * `workspaceId` parametresi geriye dönük uyumluluk için duruyor: sağlayıcı zaten
 * aktif workspace'i izler, farklı bir workspace istenirse presence hazır
 * sayılmaz (çağıran statik üye sayısına geri düşer).
 */
export function useWorkspacePresence(
  workspaceId?: string | null,
): PresenceState {
  const presence = useWorkspacePresenceContext();
  void workspaceId;
  return presence;
}
