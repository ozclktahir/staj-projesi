/** Ağır liste sorguları için varsayılan sayfa boyutları */
export const PAGE_SIZE = {
  tasks: 30,
  notes: 30,
  todos: 30,
  files: 30,
  notifications: 20,
  activityLogs: 30,
  deadlines: 40,
  members: 100,
} as const;

export type PageQuery = {
  limit?: number;
  offset?: number;
};

export function resolvePage(query?: PageQuery, fallback = PAGE_SIZE.tasks) {
  const limit = Math.min(Math.max(query?.limit ?? fallback, 1), 100);
  const offset = Math.max(query?.offset ?? 0, 0);
  return { limit, offset, to: offset + limit - 1 };
}
