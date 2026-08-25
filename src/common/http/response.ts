export type ApiResponse<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export function ok<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {})
  };
}

export function paginated<T>(data: T[], page: number, limit: number, total: number) {
  return ok(data, {
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit))
  });
}
