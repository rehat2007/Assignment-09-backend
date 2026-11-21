export const PAGE_SIZES = {
  public: 9,
  dashboard: 20,
  max: 100,
} as const;

export type ApiMeta = Record<string, unknown>;

export type ApiSuccess<T> = {
  data: T;
  meta: ApiMeta;
};

export type ApiFailure = {
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
};

export function ok<T>(data: T, meta: ApiMeta = {}): ApiSuccess<T> {
  return { data, meta };
}

export function fail(
  code: string,
  message: string,
  details: unknown[] = [],
): ApiFailure {
  return { error: { code, message, details } };
}

export function paginationMeta(
  page: number,
  pageSize: number,
  total: number,
): ApiMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export function paginated<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number,
  extraMeta: ApiMeta = {},
): ApiSuccess<T[]> {
  return ok(items, { ...paginationMeta(page, pageSize, total), ...extraMeta });
}
