import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'Profile',
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="md:flex">
            <aside className="md:w-1/4 border-r p-6">
              <nav className="space-y-2">
                <Link
                  className="block px-3 py-2 rounded hover:bg-gray-100"
                  href="/profile/personal"
                >
                  Personal information
                </Link>
                <Link className="block px-3 py-2 rounded hover:bg-gray-100" href="/profile/bank">
                  Bank / Stripe onboarding
                </Link>
                <Link
                  className="block px-3 py-2 rounded hover:bg-gray-100"
                  href="/profile/change-password"
                >
                  Change password
                </Link>
              </nav>
            </aside>
            <main className="md:flex-1 p-6">{children}</main>
          </div>
        </div>
      </div>
    </div>
  )
}
