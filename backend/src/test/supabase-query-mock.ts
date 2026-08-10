/**
 * Supabase-js sorgu zincirini (`.from().select().eq()....maybeSingle()`) taklit eden
 * test yardımcıları. Gerçek bir Postgrest builder'ı gibi zincirlenebilir; sonunda
 * `single`/`maybeSingle` çağrılmazsa builder'ın kendisi awaitlenebilir (thenable).
 */

export type QueryResult<T = unknown> = {
  data?: T;
  error?: { message: string; code?: string } | null;
  count?: number | null;
};

export function createQueryBuilderMock<T = unknown>(
  result: QueryResult<T>,
): any {
  const resolved = {
    data: result.data ?? null,
    error: result.error ?? null,
    count: result.count ?? null,
  };

  const builder: any = {
    select: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    upsert: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    neq: jest.fn(() => builder),
    in: jest.fn(() => builder),
    ilike: jest.fn(() => builder),
    is: jest.fn(() => builder),
    not: jest.fn(() => builder),
    order: jest.fn(() => builder),
    range: jest.fn(() => Promise.resolve(resolved)),
    limit: jest.fn(() => builder),
    maybeSingle: jest.fn(() => Promise.resolve(resolved)),
    single: jest.fn(() => Promise.resolve(resolved)),
    then: (onFulfilled: any, onRejected?: any) =>
      Promise.resolve(resolved).then(onFulfilled, onRejected),
  };

  return builder;
}

/** Tablo adına göre farklı sonuç dönen `client.from(table)` mock'u. */
export function createSupabaseClientMock(
  byTable: Record<string, QueryResult>,
): { from: jest.Mock } {
  return {
    from: jest.fn((table: string) =>
      createQueryBuilderMock(byTable[table] ?? {}),
    ),
  };
}
