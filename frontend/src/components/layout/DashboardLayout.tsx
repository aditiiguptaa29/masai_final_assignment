'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { 
  LayoutDashboard, 
  Car, 
  Calendar, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  User
} from 'lucide-react'
import { authApi } from '@/lib/api'

interface DashboardLayoutProps {
  children: React.ReactNode
  role: 'vehicle_owner' | 'driver' | 'customer'
}

const navigationByRole = {
  vehicle_owner: [
    { name: 'Dashboard', href: '/dashboard/owner', icon: LayoutDashboard },
    { name: 'My Vehicles', href: '/dashboard/owner/vehicles', icon: Car },
    { name: 'Bookings', href: '/dashboard/owner/bookings', icon: Calendar },
    { name: 'Analytics', href: '/dashboard/owner/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/dashboard/owner/settings', icon: Settings },
  ],
  driver: [
    { name: 'Dashboard', href: '/dashboard/driver', icon: LayoutDashboard },
    { name: 'My Trips', href: '/dashboard/driver/trips', icon: Calendar },
    { name: 'Vehicles', href: '/dashboard/driver/vehicles', icon: Car },
    { name: 'Earnings', href: '/dashboard/driver/earnings', icon: BarChart3 },
    { name: 'Settings', href: '/dashboard/driver/settings', icon: Settings },
  ],
  customer: [
    { name: 'Dashboard', href: '/dashboard/customer', icon: LayoutDashboard },
    { name: 'Browse Vehicles', href: '/dashboard/customer/vehicles', icon: Car },
    { name: 'My Bookings', href: '/dashboard/customer/bookings', icon: Calendar },
    { name: 'History', href: '/dashboard/customer/history', icon: BarChart3 },
    { name: 'Settings', href: '/dashboard/customer/settings', icon: Settings },
  ],
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useState(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  })

  const navigation = navigationByRole[role]

  const handleLogout = async () => {
    try {
      // Call logout API to clear server-side session/cache
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Always clear local storage and redirect
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/auth/login')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4 h-16 border-b border-gray-200">
            <Car className="h-8 w-8 text-gray-900" />
            <span className="ml-2 text-xl font-bold text-gray-900">FleetManager</span>
          </div>

          {/* User Profile */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-900" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user?.profile?.firstName} {user?.profile?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{role.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-900'
                  }`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Logout Button */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="group flex w-full items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-600" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <div className="flex items-center">
            <Car className="h-8 w-8 text-gray-900" />
            <span className="ml-2 text-xl font-bold text-gray-900">FleetManager</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-600"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="bg-white border-b border-gray-200">
            <div className="px-4 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-900" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.profile?.firstName} {user?.profile?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{role.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
            <nav className="px-2 py-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-white' : 'text-gray-400'
                    }`} />
                    {item.name}
                  </Link>
                )
              })}
              <button
                onClick={handleLogout}
                className="w-full group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-red-600"
              >
                <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-600" />
                Logout
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}