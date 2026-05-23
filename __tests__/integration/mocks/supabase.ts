/**
 * Supabase Client Mock Factory
 * Giả lập hoàn toàn Supabase client để test Server Actions
 * mà không cần kết nối database thật.
 */

export interface MockQueryResult {
  data: any
  error: any
  count?: number
}

export interface MockRpcResult {
  data: any
  error: any
}

/**
 * Tạo mock Supabase client có thể cấu hình kết quả trả về
 */
export function createMockSupabaseClient(overrides?: {
  fromResult?: MockQueryResult
  rpcResult?: MockRpcResult
  authUser?: { id: string; email: string } | null
}) {
  const defaultFromResult: MockQueryResult = { data: null, error: null }
  const defaultRpcResult: MockRpcResult = { data: null, error: null }

  const fromResult = overrides?.fromResult ?? defaultFromResult
  const rpcResult = overrides?.rpcResult ?? defaultRpcResult
  const authUser = overrides?.authUser ?? { id: 'test-user-id', email: 'test@example.com' }

  // Query builder chain mock
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue(fromResult),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockResolvedValue(fromResult),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(fromResult),
    maybeSingle: jest.fn().mockResolvedValue(fromResult),
    // Khi await trực tiếp query builder
    then: (resolve: any) => resolve(fromResult),
  }

  const mockClient = {
    from: jest.fn().mockReturnValue(queryBuilder),
    rpc: jest.fn().mockResolvedValue(rpcResult),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: authUser },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test/image.jpg' }, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/image.jpg' } }),
      }),
    },
  }

  return { mockClient, queryBuilder }
}

/**
 * Helper: tạo mock FormData từ object
 */
export function createMockFormData(data: Record<string, string>): FormData {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}

/**
 * Helper: Mock Supabase error response (giả lập lỗi constraint)
 */
export function createConstraintError(
  constraint: string,
  message = 'duplicate key value violates unique constraint'
) {
  return {
    data: null,
    error: {
      code: '23505', // unique_violation
      message: `${message} "${constraint}"`,
      details: null,
      hint: null,
    },
  }
}

/**
 * Helper: Mock RPC error (giả lập lỗi business logic)
 */
export function createRpcError(message: string, code = 'P0001') {
  return {
    data: null,
    error: {
      code,
      message,
      details: null,
      hint: null,
    },
  }
}
