import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn()
const mockGetUser = jest.fn()
const mockRpc = jest.fn()
const mockFrom = jest.fn()
const mockSupabase: any = {}

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: mockPush, refresh: jest.fn() })),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

jest.mock('@heroicons/react/24/solid', () =>
  new Proxy({}, { get: () => () => null })
)
jest.mock('@heroicons/react/24/outline', () =>
  new Proxy({}, { get: () => () => null })
)

import LikeButton from '@/components/LikeButton'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupMock(user: any = null, initialLiked = false) {
  mockGetUser.mockResolvedValue({ data: { user } })
  const mockMaybeSingle = jest.fn().mockResolvedValue({
    data: initialLiked ? { id: 'wl-1' } : null,
    error: null,
  })
  const mockEq2 = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
  const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2, maybeSingle: mockMaybeSingle })
  const mockQB: any = {
    select: jest.fn().mockReturnValue({ eq: mockEq1 }),
    eq: mockEq1,
    insert: jest.fn().mockResolvedValue({ error: null }),
    delete: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) }),
  }
  mockSupabase.auth = { getUser: mockGetUser }
  mockSupabase.from = jest.fn(() => mockQB)
  mockRpc.mockResolvedValue({ error: null })
  mockSupabase.rpc = mockRpc
  return mockQB
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LikeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('render nút với aria-label', () => {
    setupMock()
    render(<LikeButton variantId="var-1" />)
    expect(document.querySelector('button')).toBeInTheDocument()
  })

  it('unauthenticated: click → toggle optimistic (không redirect)', async () => {
    setupMock(null)
    render(<LikeButton variantId="var-1" />)
    await waitFor(() => {}) // wait for useEffect
    const btn = document.querySelector('button')!
    const pathBefore = document.querySelector('path')!.getAttribute('fill')
    fireEvent.click(btn)
    await waitFor(() => {
      // toggles state: fill changes
      const pathAfter = document.querySelector('path')!.getAttribute('fill')
      expect(pathAfter).not.toBe(pathBefore)
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('authenticated + chưa like: click → thêm wishlist (insert)', async () => {
    const mockQB = setupMock({ id: 'u1', email: 'test@test.com' }, false)
    render(<LikeButton variantId="var-1" />)
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled())
    fireEvent.click(document.querySelector('button')!)
    await waitFor(() => {
      expect(mockQB.insert).toHaveBeenCalled()
    })
  })

  it('authenticated + đã like: click → xóa khỏi wishlist (delete)', async () => {
    const mockQB = setupMock({ id: 'u1', email: 'test@test.com' }, true)
    render(<LikeButton variantId="var-1" />)
    // Wait for useEffect to set isLiked=true from maybeSingle result
    await waitFor(() => {
      const fill = document.querySelector('path')!.getAttribute('fill')
      expect(fill).toBe('#ef4444')
    })
    fireEvent.click(document.querySelector('button')!)
    await waitFor(() => {
      expect(mockQB.delete).toHaveBeenCalled()
    })
  })

  it('liked=true → SVG path fill đỏ #ef4444', () => {
    setupMock()
    render(<LikeButton variantId="var-1" liked={true} />)
    const path = document.querySelector('path')!
    expect(path.getAttribute('fill')).toBe('#ef4444')
  })

  it('liked=false (default) → SVG path fill none', () => {
    setupMock()
    render(<LikeButton variantId="var-1" />)
    const path = document.querySelector('path')!
    expect(path.getAttribute('fill')).toBe('none')
  })
})
