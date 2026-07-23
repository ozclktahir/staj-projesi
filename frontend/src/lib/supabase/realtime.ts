import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createAuthedRealtimeClient } from "@/lib/supabase/client";
import {
  normalizeTaskStatusInput,
  TASK_PRIORITIES,
  type ProjectTask,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";
import type { ActivityLogItem } from "@/app/actions/activity-logs";

export function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("access_token");
  } catch {
    return null;
  }
}

/** JWT payload'dan sub / email oku */
export function decodeAccessTokenClaims(): {
  userId: string | null;
  email: string | null;
} {
  const token = readAccessToken();
  if (!token) return { userId: null, email: null };
  try {
    const part = token.split(".")[1] ?? "";
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const payload = JSON.parse(atob(padded)) as {
      sub?: string;
      email?: string;
    };
    return {
      userId: payload.sub ?? null,
      email: typeof payload.email === "string" ? payload.email : null,
    };
  } catch {
    return { userId: null, email: null };
  }
}

export async function resolveRealtimeUserId(
  client: SupabaseClient,
): Promise<string | null> {
  try {
    const { data } = await client.auth.getUser();
    if (data.user?.id) return data.user.id;
  } catch {
    // fallback below
  }
  return decodeAccessTokenClaims().userId;
}

function normalizePriority(value: unknown): TaskPriority {
  if (
    typeof value === "string" &&
    (TASK_PRIORITIES as string[]).includes(value.toUpperCase())
  ) {
    return value.toUpperCase() as TaskPriority;
  }
  return "MEDIUM";
}

/** Realtime task satırını ProjectTask'a dönüştür */
export function mapRealtimeTaskRow(
  row: Record<string, unknown>,
  previous?: ProjectTask | null,
): ProjectTask {
  const assigneeId =
    (typeof row.assignee_id === "string" && row.assignee_id) ||
    (typeof row.assigned_to === "string" && row.assigned_to) ||
    null;

  const status =
    (normalizeTaskStatusInput(row.status) as TaskStatus | null) ??
    previous?.status ??
    "TODO";

  const keepAssignee =
    previous && previous.assignee_id === assigneeId ? previous.assignee : null;

  return {
    id: String(row.id),
    title:
      (typeof row.title === "string" && row.title) ||
      previous?.title ||
      "Adsız görev",
    description:
      row.description === undefined
        ? (previous?.description ?? null)
        : ((row.description as string | null) ?? null),
    status,
    priority: normalizePriority(row.priority ?? previous?.priority),
    project_id:
      (typeof row.project_id === "string" && row.project_id) ||
      previous?.project_id ||
      null,
    workspace_id:
      (typeof row.workspace_id === "string" && row.workspace_id) ||
      previous?.workspace_id ||
      null,
    due_date:
      row.due_date === undefined
        ? (previous?.due_date ?? null)
        : ((row.due_date as string | null) ?? null),
    parent_task_id:
      row.parent_task_id === undefined
        ? (previous?.parent_task_id ?? null)
        : ((row.parent_task_id as string | null) ?? null),
    assignee_id: assigneeId,
    assignee: keepAssignee,
    created_at:
      (typeof row.created_at === "string" && row.created_at) ||
      previous?.created_at ||
      null,
    created_by:
      (typeof row.created_by === "string" && row.created_by) ||
      previous?.created_by ||
      null,
    subtask_done: previous?.subtask_done ?? 0,
    subtask_total: previous?.subtask_total ?? 0,
  };
}

export function isTaskSoftDeleted(row: Record<string, unknown>): boolean {
  return row.deleted_at != null && row.deleted_at !== "";
}

export function mapRealtimeActivityRow(
  row: Record<string, unknown>,
): ActivityLogItem {
  const details =
    row.details && typeof row.details === "object"
      ? (row.details as Record<string, unknown>)
      : {};

  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id ?? ""),
    projectId: (row.project_id as string | null) ?? null,
    taskId: (row.task_id as string | null) ?? null,
    userId: String(row.user_id ?? ""),
    actionType: String(row.action_type ?? row.action ?? ""),
    details,
    createdAt: (row.created_at as string | null) ?? null,
    actorName: "Bir kullanıcı",
    actorAvatarUrl: null,
  };
}

type PostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

type SubscribeOptions = {
  channelName: string;
  table: string;
  filter?: string;
  event?: PostgresEvent;
  onPayload: (payload: {
    eventType: string;
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => void;
};

/**
 * Tek tablo için Realtime aboneliği kurar; cleanup için channel + client döner.
 */
export function subscribePostgresChanges(
  options: SubscribeOptions,
): { client: SupabaseClient; channel: RealtimeChannel } | null {
  const client = createAuthedRealtimeClient();
  if (!client) return null;

  const channel = client
    .channel(options.channelName)
    .on(
      "postgres_changes",
      {
        event: options.event ?? "*",
        schema: "public",
        table: options.table,
        ...(options.filter ? { filter: options.filter } : {}),
      },
      (payload) => {
        options.onPayload({
          eventType: payload.eventType,
          new: (payload.new ?? {}) as Record<string, unknown>,
          old: (payload.old ?? {}) as Record<string, unknown>,
        });
      },
    )
    .subscribe();

  return { client, channel };
}
