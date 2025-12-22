'use client'

export const dynamic = 'force-static'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import { loginSchema } from '@/lib/validations'
import { Button } from '@/components/ui/Button'
import { Car, Mail, Lock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { signIn, getSession } from 'next-auth/react'

export default function LoginPage() {
  const router = useRouter()
  const [apiError, setApiError] = useState('')
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [rateLimitMessage, setRateLimitMessage] = useState('')

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      setApiError('')
      const result = await signIn('credentials', {
        redirect: false,
        email: values.email,
        password: values.password,
      })

      if (result?.ok) {
        // Reset rate limit on successful login
        setIsRateLimited(false)
        setRateLimitMessage('')
        toast.success('Login successful')

        // Read session to route by role
        const session = await getSession()
        const role = (session?.user as any)?.role
        if (role === 'vehicle_owner') router.push('/dashboard/owner')
        else if (role === 'driver') router.push('/dashboard/driver')
        else if (role === 'customer') router.push('/dashboard/customer')
        else router.push('/dashboard')
        return
      }

      const key = result?.error
      const message = key === 'CredentialsSignin'
        ? 'Invalid email or password.'
        : (typeof key === 'string' && key.trim().length > 0
          ? key
          : 'Login failed. Please try again.')
      setApiError(message)
      toast.error(message)
    } catch (error: any) {
      const key = error?.message
      const message = key === 'CredentialsSignin'
        ? 'Invalid email or password.'
        : (typeof key === 'string' && key.trim().length > 0
          ? key
          : 'Login failed. Please try again.')
      setApiError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">

        {/* LEFT – Brand / Context Panel */}
        <div className="hidden md:flex flex-col justify-between bg-slate-900 text-white p-10">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Car className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold tracking-wide">
                FleetManager
              </span>
            </div>
            
          </div>
        </div>

        {/* RIGHT – Login Form */}
        <div className="p-10">
          <h3 className="text-2xl font-semibold text-slate-900">
            Sign in to your account
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Enter your credentials to continue
          </p>

          {apiError && !isRateLimited && (
            <div className="mt-6 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          )}

          {isRateLimited && (
            <div className="mt-6 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Login Temporarily Disabled</p>
                <p className="mt-1">{rateLimitMessage}</p>
                <p className="mt-1 text-xs">Please wait 2 minutes before trying again.</p>
              </div>
            </div>
          )}

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={loginSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="mt-8 space-y-6">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Field
                      name="email"
                      type="email"
                      placeholder="admin@company.com"
                      disabled={isRateLimited}
                      className={`w-full rounded-md border border-slate-300 bg-white px-10 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none ${
                        isRateLimited ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
                      }`}
                    />
                  </div>
                  <ErrorMessage
                    name="email"
                    component="div"
                    className="mt-1 text-xs text-red-600"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Field
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      disabled={isRateLimited}
                      className={`w-full rounded-md border border-slate-300 bg-white px-10 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none ${
                        isRateLimited ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
                      }`}
                    />
                  </div>
                  <ErrorMessage
                    name="password"
                    component="div"
                    className="mt-1 text-xs text-red-600"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-slate-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Remember me
                  </label>

                  <Link
                    href="/auth/forgot-password"
                    className="text-slate-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={isSubmitting || isRateLimited}
                  className={`w-full py-2.5 rounded-md text-sm font-medium ${
                    isRateLimited 
                      ? 'bg-slate-400 cursor-not-allowed text-white' 
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isRateLimited ? 'Login Disabled' : isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>

                <p className="text-center text-sm text-slate-500">
                  New to FleetManager?{' '}
                  <Link
                    href="/auth/register"
                    className="font-medium text-slate-900 hover:underline"
                  >
                    Create an account
                  </Link>
                </p>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  )
}
