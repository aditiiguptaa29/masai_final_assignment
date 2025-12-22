import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Shield, Clock, Users, Map } from 'lucide-react'

export const Hero = () => {
  return (
    <section className="bg-slate-50 border-b border-slate-200 py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* LEFT — Text */}
          <div>
            <h1 className="text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight">
              Fleet operations,
              <br />
              <span className="text-slate-700">
                centralized and controlled
              </span>
            </h1>

            <p className="mt-5 text-lg text-slate-600 max-w-xl">
              A unified fleet management system designed to connect
              vehicle owners, drivers, and customers through a
              reliable and structured operational platform.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link href="/auth/register">
                <Button size="lg" className="bg-slate-900 text-white">
                  Create account
                </Button>
              </Link>

              <Link href="/auth/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-slate-300 text-slate-900"
                >
                  Sign in
                </Button>
              </Link>
            </div>

            {/* Operational Indicators */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
              <Indicator
                icon={Shield}
                label="Secure Access"
                value="Role-based"
              />
              <Indicator
                icon={Clock}
                label="System Uptime"
                value="24/7"
              />
              <Indicator
                icon={Users}
                label="User Roles"
                value="Owners • Drivers • Customers"
              />
              <Indicator
                icon={Map}
                label="Trip Control"
                value="End-to-end"
              />
            </div>
          </div>

          {/* RIGHT — System Preview (Abstract, Not Flashy) */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div className="h-3 w-32 bg-slate-200 rounded" />
                <div className="h-8 w-8 bg-slate-300 rounded-full" />
              </div>

              {/* KPI Blocks */}
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="border border-slate-200 rounded-lg p-4 space-y-2"
                  >
                    <div className="h-2 w-full bg-slate-200 rounded" />
                    <div className="h-4 w-2/3 bg-slate-300 rounded" />
                  </div>
                ))}
              </div>

              {/* List Rows */}
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3"
                  >
                    <div className="h-6 w-6 bg-slate-300 rounded" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2 w-full bg-slate-200 rounded" />
                      <div className="h-2 w-2/3 bg-slate-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

/* Indicator block */
const Indicator = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any
  label: string
  value: string
}) => {
  return (
    <div>
      <Icon className="h-5 w-5 text-slate-700 mb-2" />
      <div className="text-sm font-medium text-slate-900">
        {value}
      </div>
      <div className="text-sm text-slate-600">
        {label}
      </div>
    </div>
  )
}
