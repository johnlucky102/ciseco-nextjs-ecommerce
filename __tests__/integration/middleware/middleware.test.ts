/** @jest-environment node */

// ─── Shared mock state ─────────────────────────────────────────────────────────

const mockAuth: any = { getUser: jest.fn() }
const mockQB: any = {}
const mockSupabase: any = {}

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabase),
}))

const mockRedirectResult = { type: 'redirect' as const }
const mockNextResult = { type: 'next' as const, headers: { set: jest.fn() }, cookies: { set: jest.fn() } }

jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => mockNextResult),
    redirect: jest.fn(() => mockRedirectResult),
  },
}))

import { middleware } from '@/middleware'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const mockNextResponse = NextResponse as jest.Mocked<typeof NextResponse>

// ─── Mock NextRequest factory ─────────────────────────────────────────────────

function makeMockRequest(pathname: string): any {
  const cloneResult = {
    pathname,
    searchParams: { set: jest.fn() },
    toString: () => `http://localhost${pathname}`,
  }
  return {
    nextUrl: {
      pathname,
      clone: jest.fn(() => cloneResult),
    },
    cookies: {
      getAll: jest.fn(() => []),
      set: jest.fn(),
    },
    headers: new Headers(),
    url: `http://localhost${pathname}`,
  }
}

// ─── Setup helper ─────────────────────────────────────────────────────────────

function setupMockQB(roleData: any[] = []) {
  mockQB.select = jest.fn().mockReturnValue(mockQB)
  mockQB.eq = jest.fn().mockReturnValue(mockQB)
  mockQB.in = jest.fn().mockReturnValue(mockQB)
  mockQB.limit = jest.fn().mockResolvedValue({ data: roleData, error: null })
}

describe('Middleware — Auth & RBAC', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockNextResult.headers = { set: jest.fn() } as any
    mockNextResult.cookies = { set: jest.fn() } as any
    mockNextResponse.next = jest.fn(() => mockNextResult) as any
    mockNextResponse.redirect = jest.fn(() => mockRedirectResult) as any

    mockSupabase.auth = mockAuth
    mockSupabase.from = jest.fn().mockReturnValue(mockQB)
    setupMockQB()
  })

  // ─── /admin routes ────────────────────────────────────────────────────────────

  describe('/admin routes', () => {
    it('chưa login → redirect /login?redirectTo=/admin', async () => {
      mockAuth.getUser = jest.fn().mockResolvedValue({ data: { user: null } })
      const req = makeMockRequest('/admin')
      const response = await middleware(req)
      expect(mockNextResponse.redirect).toHaveBeenCalled()
      const cloneResult = req.nextUrl.clone()
      expect(cloneResult.pathname).toBe('/login')
      expect(response).toBe(mockRedirectResult)
    })

    it('đã login nhưng không có admin role → redirect /', async () => {
      mockAuth.getUser = jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@test.com' } },
      })
      setupMockQB([])
      const req = makeMockRequest('/admin/products')
      const response = await middleware(req)
      expect(mockNextResponse.redirect).toHaveBeenCalled()
      expect(response).toBe(mockRedirectResult)
    })

    it('đã login với role admin → pass through (không redirect)', async () => {
      mockAuth.getUser = jest.fn().mockResolvedValue({
        data: { user: { id: 'admin-1', email: 'admin@test.com' } },
      })
      setupMockQB([{ role: 'admin' }])
      const req = makeMockRequest('/admin/dashboard')
      const response = await middleware(req)
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(response).toBe(mockNextResult)
    })

    it('đã login với role catalog_manager → pass through', async () => {
      mockAuth.getUser = jest.fn().mockResolvedValue({
        data: { user: { id: 'mgr-1', email: 'manager@test.com' } },
      })
      setupMockQB([{ role: 'catalog_manager' }])
      const req = makeMockRequest('/admin/products')
      const response = await middleware(req)
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(response).toBe(mockNextResult)
    })

    it('query user_roles với đúng roles list', async () => {
      mockAuth.getUser = jest.fn().mockResolvedValue({
        data: { user: { id: 'admin-1' } },
      })
      setupMockQB([{ role: 'admin' }])
      await middleware(makeMockRequest('/admin'))
      expect(mockQB.in).toHaveBeenCalledWith(
        'role',
        expect.arrayContaining(['admin', 'catalog_manager', 'order_manager', 'support'])
      )
    })
  })

  // ─── /account routes ──────────────────────────────────────────────────────────

  describe('/account routes', () => {
    it('chưa login → redirect /login', async () => {
      mockAuth.getUser = jest.fn().mockResolvedValue({ data: { user: null } })
      const req = makeMockRequest('/account')
      const response = await middleware(req)
      expect(mockNextResponse.redirect).toHaveBeenCalled()
      expect(response).toBe(mockRedirectResult)
    })

    it('đã login → pass through', async () => {
      mockAuth.getUser = jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
      })
      const req = makeMockRequest('/account')
      const response = await middleware(req)
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(response).toBe(mockNextResult)
    })
  })

  // ─── /checkout routes ─────────────────────────────────────────────────────────

  describe('/checkout routes', () => {
    it('chưa login → redirect /login', async () => {
      mockAuth.getUser = jest.fn().mockResolvedValue({ data: { user: null } })
      const req = makeMockRequest('/checkout')
      const response = await middleware(req)
      expect(mockNextResponse.redirect).toHaveBeenCalled()
      expect(response).toBe(mockRedirectResult)
    })

    it('đã login → pass through', async () => {
      mockAuth.getUser = jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
      })
      const req = makeMockRequest('/checkout')
      const response = await middleware(req)
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })
  })

  // ─── Public routes ────────────────────────────────────────────────────────────

  describe('Public routes', () => {
    it('/ (homepage) chưa login → pass through', async () => {
      mockAuth.getUser = jest.fn().mockResolvedValue({ data: { user: null } })
      const req = makeMockRequest('/')
      const response = await middleware(req)
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(response).toBe(mockNextResult)
    })

    it('/collection chưa login → pass through', async () => {
      mockAuth.getUser = jest.fn().mockResolvedValue({ data: { user: null } })
      const req = makeMockRequest('/collection')
      const response = await middleware(req)
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(response).toBe(mockNextResult)
    })

    it('/products/[slug] chưa login → pass through', async () => {
      mockAuth.getUser = jest.fn().mockResolvedValue({ data: { user: null } })
      const req = makeMockRequest('/products/sofa-hien-dai')
      const response = await middleware(req)
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })
  })

  // ─── x-pathname header ────────────────────────────────────────────────────────

  describe('x-pathname header', () => {
    it('set header x-pathname với pathname hiện tại', async () => {
      mockAuth.getUser = jest.fn().mockResolvedValue({ data: { user: null } })
      const req = makeMockRequest('/collection')
      await middleware(req)
      expect(mockNextResult.headers.set).toHaveBeenCalledWith('x-pathname', '/collection')
    })
  })

  // ─── Cookie setAll callback ───────────────────────────────────────────────────

  describe('Cookie setAll callback', () => {
    it('setAll gọi request.cookies.set và supabaseResponse.cookies.set cho mỗi cookie', async () => {
      let capturedOptions: any
      ;(createServerClient as jest.Mock).mockImplementationOnce((_url: string, _key: string, opts: any) => {
        capturedOptions = opts
        return mockSupabase
      })
      mockAuth.getUser = jest.fn().mockResolvedValue({ data: { user: null } })
      const req = makeMockRequest('/')
      await middleware(req)

      capturedOptions.cookies.setAll([
        { name: 'sb-access-token', value: 'tok-abc', options: { path: '/' } },
      ])

      expect(req.cookies.set).toHaveBeenCalledWith('sb-access-token', 'tok-abc')
      expect(mockNextResult.cookies.set).toHaveBeenCalledWith('sb-access-token', 'tok-abc', { path: '/' })
    })

    it('setAll với nhiều cookies: mỗi cookie đều được set', async () => {
      let capturedOptions: any
      ;(createServerClient as jest.Mock).mockImplementationOnce((_url: string, _key: string, opts: any) => {
        capturedOptions = opts
        return mockSupabase
      })
      mockAuth.getUser = jest.fn().mockResolvedValue({ data: { user: null } })
      await middleware(makeMockRequest('/'))

      const cookiesToSet = [
        { name: 'sb-access-token', value: 'tok-1', options: {} },
        { name: 'sb-refresh-token', value: 'tok-2', options: { httpOnly: true } },
      ]
      capturedOptions.cookies.setAll(cookiesToSet)

      expect(mockNextResult.cookies.set).toHaveBeenCalledTimes(2)
    })
  })
})
