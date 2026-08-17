import { describe, expect, it } from "vitest";
import {
  getNotificationKind,
  notificationHref,
  type NotificationItem,
} from "@/lib/notification-utils";

function notif(partial: Partial<NotificationItem>): NotificationItem {
  return {
    id: "n1",
    workspaceId: null,
    type: "generic",
    title: "",
    message: "",
    isRead: false,
    createdAt: null,
    link: null,
    metadata: null,
    payload: null,
    ...partial,
  };
}

describe("getNotificationKind", () => {
  it("görev/yorum/proje/üye tiplerini tanır", () => {
    expect(getNotificationKind(notif({ type: "task_claim_request" }))).toBe(
      "task_claim_request",
    );
    expect(getNotificationKind(notif({ type: "task_comment" }))).toBe(
      "task_comment",
    );
    expect(getNotificationKind(notif({ type: "project_created" }))).toBe(
      "project_event",
    );
    expect(getNotificationKind(notif({ type: "role_changed" }))).toBe(
      "member_event",
    );
    expect(getNotificationKind(notif({ type: "workspace_invite" }))).toBe(
      "workspace_invite",
    );
  });
});

describe("notificationHref", () => {
  it("görev bildirimi → proje sayfası + taskId (detay paneli açılsın)", () => {
    const href = notificationHref(
      notif({
        type: "task_assigned",
        workspaceId: "ws1",
        payload: { project_id: "p1", task_id: "t1" },
      }),
    );
    expect(href).toBe("/project/p1?workspaceId=ws1&taskId=t1");
  });

  it("kayıtlı link taskId içermediğinde metadata'dan kurulan hedef kazanır", () => {
    const href = notificationHref(
      notif({
        type: "task_deletion_request",
        workspaceId: "ws1",
        link: "/project/p1?workspaceId=ws1",
        payload: { project_id: "p1", task_id: "t9" },
      }),
    );
    expect(href).toBe("/project/p1?workspaceId=ws1&taskId=t9");
  });

  it("yorum bildirimi → ilgili görev", () => {
    expect(
      notificationHref(
        notif({
          type: "task_comment",
          payload: { project_id: "p2", task_id: "t2", workspace_id: "ws2" },
        }),
      ),
    ).toBe("/project/p2?workspaceId=ws2&taskId=t2");
  });

  it("davet bildirimi → workspace biliniyorsa o alan, yoksa onboarding", () => {
    expect(
      notificationHref(notif({ type: "workspace_invite", workspaceId: "ws3" })),
    ).toBe("/?workspaceId=ws3");
    expect(notificationHref(notif({ type: "workspace_invite" }))).toBe(
      "/onboarding",
    );
  });

  it("üye/rol bildirimi → üyeler sayfası", () => {
    expect(
      notificationHref(notif({ type: "role_changed", workspaceId: "ws4" })),
    ).toBe("/members?workspaceId=ws4");
  });

  it("proje bildirimi → proje sayfası, proje yoksa proje listesi", () => {
    expect(
      notificationHref(
        notif({
          type: "project_created",
          workspaceId: "ws5",
          payload: { project_id: "p5" },
        }),
      ),
    ).toBe("/project/p5?workspaceId=ws5");
    expect(
      notificationHref(notif({ type: "project_created", workspaceId: "ws5" })),
    ).toBe("/projects?workspaceId=ws5");
  });

  it("projesi olmayan görev bildirimi → kişisel alan", () => {
    expect(
      notificationHref(
        notif({
          type: "due_date_warning",
          workspaceId: "ws6",
          payload: { task_id: "t6" },
        }),
      ),
    ).toBe("/personal?workspaceId=ws6");
  });

  it("hiçbir bağlam yoksa null döner (navigasyon yapılmaz)", () => {
    expect(notificationHref(notif({ type: "generic" }))).toBeNull();
  });

  it("metadata payload'ın yerine geçebilir", () => {
    expect(
      notificationHref(
        notif({
          type: "task_assigned",
          metadata: { project_id: "p7", task_id: "t7", workspace_id: "ws7" },
        }),
      ),
    ).toBe("/project/p7?workspaceId=ws7&taskId=t7");
  });
});
