'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Car, Menu, X } from 'lucide-react'
import { useState } from 'react'

export const Navbar = () => {
  const { data: session, status } = useSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">

          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-slate-900 flex items-center justify-center">
              <Car className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">
              FleetManager
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <Link
              href="/vehicles"
              className="text-slate-700 hover:text-slate-900"
            >
              Vehicles
            </Link>
            <Link
              href="/how-it-works"
              className="text-slate-700 hover:text-slate-900"
            >
              How it works
            </Link>
            <Link
              href="/about"
              className="text-slate-700 hover:text-slate-900"
            >
              About
            </Link>

            {status === 'loading' ? (
              <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
            ) : session ? (
              <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    className="text-slate-900"
                  >
                    Dashboard
                  </Button>
                </Link>

                <span className="text-xs text-slate-500">
                  {session.user?.name}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-300"
                  onClick={handleSignOut}
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
                <Link href="/auth/login">
                  <Button variant="ghost">
                    Sign in
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="bg-slate-900 text-white">
                    Get started
                  </Button>
                </Link>
              </div>
            )}
          </nav>

          {/* MOBILE TOGGLE */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-slate-700"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-6 py-4 space-y-2 text-sm">

            <Link
              href="/vehicles"
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 text-slate-700"
            >
              Vehicles
            </Link>

            <Link
              href="/how-it-works"
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 text-slate-700"
            >
              How it works
            </Link>

            <Link
              href="/about"
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 text-slate-700"
            >
              About
            </Link>

            <div className="pt-3 mt-3 border-t border-slate-200">
              {session ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="block py-2 text-slate-700"
                  >
                    Dashboard
                  </Link>

                  <button
                    onClick={() => {
                      handleSignOut()
                      setIsMenuOpen(false)
                    }}
                    className="block w-full text-left py-2 text-slate-700"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block py-2 text-slate-700"
                  >
                    Sign in
                  </Link>

                  <Link
                    href="/auth/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="block py-2 font-medium text-slate-900"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
