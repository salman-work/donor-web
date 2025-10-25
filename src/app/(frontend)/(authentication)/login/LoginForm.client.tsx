'use client'

import { useActionState, useEffect } from 'react'
import { loginAction } from '@/actions/authentication/donor'
import { ErrorMessage } from '@/components/Form/errorMessage'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import PageClient from './page.client'
import { useAuth } from '@/context/AuthContext'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || '/'

  const [state, formAction, pending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      // prevState is provided by useActionState; cast to any for the server action call
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await loginAction(prevState as any, formData)
    },
    { error: '' },
  )
  const router = useRouter()
  const { refresh } = useAuth()

  useEffect(() => {
    if (state?.success) {
      // ensure client auth context is refreshed so nav updates
      refresh().catch(() => {})
      router.push(returnUrl || '/')
    }
  }, [state, router, returnUrl, refresh])

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="flex justify-center">
          <form className="w-full max-w-sm flex flex-col gap-6" action={formAction}>
            <h1 className="text-3xl font-bold mb-6 text-center">Login</h1>
            {state?.error && <ErrorMessage message={state?.error} />}
            <div className="flex flex-col">
              <label htmlFor="email" className="mb-1 font-medium text-left">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                className="input border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="email"
                defaultValue="msalman@test.com"
                required
              />
              <div className="flex flex-col">
                <label htmlFor="password" className="mb-1 font-medium text-left">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  className="input border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="current-password"
                  defaultValue="test1234"
                  required
                />
              </div>
              <div className="flex flex-row items-center justify-between mt-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="btn bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors font-semibold"
                >
                  {pending ? 'Logging in…' : 'Login'}
                </button>
                <Link
                  href="/forgot-password"
                  className="ml-4 text-blue-600 hover:underline font-medium"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
