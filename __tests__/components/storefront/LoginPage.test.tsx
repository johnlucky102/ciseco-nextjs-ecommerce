import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockSignIn = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: mockPush, refresh: mockRefresh })),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: { signInWithPassword: mockSignIn },
  })),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}))

import PageLogin from '@/app/login/page'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSignIn.mockResolvedValue({ error: null })
  })

  it('render tiêu đề Đăng nhập', () => {
    render(<PageLogin />)
    expect(screen.getByRole('heading', { name: /Đăng nhập/ })).toBeInTheDocument()
  })

  it('render email và password inputs', () => {
    render(<PageLogin />)
    expect(screen.getByPlaceholderText(/example@example.com/i)).toBeInTheDocument()
    expect(screen.getByText(/Mật khẩu/)).toBeInTheDocument()
  })

  it('render link đăng ký', () => {
    render(<PageLogin />)
    expect(screen.getByRole('link', { name: /Đăng ký ngay/ })).toHaveAttribute('href', '/signup')
  })

  it('render link quên mật khẩu', () => {
    render(<PageLogin />)
    expect(screen.getByRole('link', { name: /Quên mật khẩu/ })).toBeInTheDocument()
  })

  it('submit thành công → router.push("/") + router.refresh()', async () => {
    render(<PageLogin />)
    const emailInput = screen.getByPlaceholderText(/example@example.com/i)
    fireEvent.change(emailInput, { target: { value: 'user@test.com' } })
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } })
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({ email: 'user@test.com', password: 'password123' })
      expect(mockPush).toHaveBeenCalledWith('/')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('submit lỗi → hiển thị error message, không navigate', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    render(<PageLogin />)
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  it('loading state: button disabled khi đang submit', async () => {
    mockSignIn.mockImplementation(() => new Promise(r => setTimeout(r, 200)))
    render(<PageLogin />)
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => {
      const btn = document.querySelector('button[type="submit"]')
      expect(btn).toBeDisabled()
    })
  })
})
