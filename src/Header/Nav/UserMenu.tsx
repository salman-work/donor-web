'use client'

import React, { Fragment } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { User, LogOut } from 'lucide-react'
import { cn } from '@/utilities/ui'
import Link from 'next/link'

export const UserMenu: React.FC = () => {
  const { auth, loading } = useAuth()
  const router = useRouter()
  const { refresh } = useAuth()

  if (loading) return null

  if (auth?.authenticated) {
    return (
      <Menu as="div" className="relative inline-block text-left">
        <MenuButton className="flex items-center py-1 rounded-md text-primary hover:text-primary hover:focus:ring2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary">
          <span className="mr-2 text-sm font-medium">{auth.username}</span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </MenuButton>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <MenuItems className="absolute right-0 mt-2 w-40 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg z-10 focus:outline-none">
            <div className="py-1">
              <MenuItem>
                {({ focus }) => (
                  <button
                    onClick={() => router.push('/profile')}
                    className={`w-full flex items-center gap-2 text-left px-4 py-2 text-gray-700 ${focus ? 'bg-gray-100' : ''}`}
                  >
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium">Profile</span>
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ focus }) => (
                  <button
                    onClick={async () => {
                      try {
                        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
                        await fetch(`${apiBaseUrl}/api/v1/auth/logout`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                        })
                      } catch (_e) {
                        // ignore errors, still proceed to refresh
                      }

                      await refresh().catch(() => {})
                      router.push('/home')
                    }}
                    className={`w-full flex items-center gap-2 text-left px-4 py-2 text-gray-700 ${focus ? 'bg-gray-100' : ''}`}
                  >
                    <LogOut className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                )}
              </MenuItem>
            </div>
          </MenuItems>
        </Transition>
      </Menu>
    )
  }

  return (
    <Button asChild className={cn()} variant="link" size="clear">
      <Link href="/login" className={cn()}>
        Login
      </Link>
    </Button>
  )
}
