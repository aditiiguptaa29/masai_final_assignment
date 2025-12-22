'use client'

export const dynamic = 'force-static'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import { registerSchema } from '@/lib/validations'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import {
  Car,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { signIn } from 'next-auth/react'

const roleOptions = [
  {
    value: 'customer',
    label: 'Customer',
    description: 'Book vehicles and manage trips',
    icon: User,
  },
  {
    value: 'driver',
    label: 'Driver',
    description: 'Drive vehicles and accept jobs',
    icon: Car,
  },
  {
    value: 'vehicle_owner',
    label: 'Vehicle Owner',
    description: 'List vehicles and manage fleet',
    icon: CheckCircle2,
  },
]

export default function RegisterPage() {
  const router = useRouter()
  const [apiError, setApiError] = useState('')
  const [step, setStep] = useState(1)

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      setApiError('')

      const payload = {
        email: values.email,
        password: values.password,
        role: values.role,
        profile: {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          address: {
            street: values.street,
            city: values.city,
            state: values.state,
            zipCode: values.zipCode,
            country: values.country,
          },
        },
      }

      const response = await authApi.register(payload)

      if (response.data.success) {
        toast.success('Account created successfully')

        // Auto sign in via NextAuth credentials
        const result = await signIn('credentials', {
          redirect: false,
          email: values.email,
          password: values.password,
        })

        if (result?.ok) {
          // Route by role after session is established
          const role = response.data.data.user.role
          if (role === 'vehicle_owner') router.push('/dashboard/owner')
          else if (role === 'driver') router.push('/dashboard/driver')
          else if (role === 'customer') router.push('/dashboard/customer')
          else router.push('/dashboard')
        } else {
          router.push('/auth/login')
        }
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Registration failed. Please try again.'
      setApiError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">

        {/* LEFT – Brand Panel */}
        <div className="hidden md:flex flex-col justify-between bg-slate-900 text-white p-10">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Car className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold">
                FleetManager
              </span>
            </div>

            <h2 className="text-3xl font-semibold leading-tight">
              Join the fleet  
              <br /> operations platform
            </h2>

            <p className="mt-4 text-slate-300 text-sm leading-relaxed">
              Create an account to manage vehicles, drivers,
              bookings and logistics through a unified system.
            </p>
          </div>

          <div className="text-xs text-slate-400">
            © {new Date().getFullYear()} FleetManager Systems
          </div>
        </div>

        {/* RIGHT – Form */}
        <div className="p-10">
          <h3 className="text-2xl font-semibold text-slate-900">
            Create an account
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Step {step} of 2
          </p>

          {/* Progress */}
          <div className="mt-4 h-1 w-full bg-slate-200 rounded">
            <div
              className="h-full bg-slate-900 rounded transition-all"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>

          {apiError && (
            <div className="mt-6 flex gap-3 rounded-md border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          )}

          <Formik
            initialValues={{
              email: '',
              password: '',
              confirmPassword: '',
              role: 'customer',
              firstName: '',
              lastName: '',
              phone: '',
              street: '',
              city: '',
              state: '',
              zipCode: '',
              country: 'US',
            }}
            validationSchema={registerSchema}
            onSubmit={handleSubmit}
          >
            {({
              isSubmitting,
              values,
              validateForm,
              setTouched,
            }) => (
              <Form className="mt-8 space-y-6">

                {/* STEP 1 */}
                {step === 1 && (
                  <>
                    {/* Role */}
                    <div className="space-y-3">
                      {roleOptions.map((option) => {
                        const Icon = option.icon
                        const selected = values.role === option.value

                        return (
                          <label
                            key={option.value}
                            className={`flex items-start gap-4 rounded-md border p-4 cursor-pointer transition ${
                              selected
                                ? 'border-slate-900 bg-slate-50'
                                : 'border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            <Field
                              type="radio"
                              name="role"
                              value={option.value}
                              className="sr-only"
                            />
                            <Icon
                              className={`h-5 w-5 mt-0.5 ${
                                selected ? 'text-slate-900' : 'text-slate-400'
                              }`}
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-900">
                                {option.label}
                              </div>
                              <div className="text-sm text-slate-600">
                                {option.description}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="form-label">Email</label>
                      <div className="relative">
                        <Mail className="input-icon" />
                        <Field name="email" className="form-input pl-10" />
                      </div>
                      <ErrorMessage name="email" component="div" className="form-error" />
                    </div>

                    {/* Password */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Password</label>
                        <div className="relative">
                          <Lock className="input-icon" />
                          <Field type="password" name="password" className="form-input pl-10" />
                        </div>
                        <ErrorMessage name="password" component="div" className="form-error" />
                      </div>

                      <div>
                        <label className="form-label">Confirm</label>
                        <div className="relative">
                          <Lock className="input-icon" />
                          <Field type="password" name="confirmPassword" className="form-input pl-10" />
                        </div>
                        <ErrorMessage name="confirmPassword" component="div" className="form-error" />
                      </div>
                    </div>

                    <Button
                      type="button"
                      className="w-full bg-slate-900 text-white"
                      onClick={async () => {
                        setTouched({
                          role: true,
                          email: true,
                          password: true,
                          confirmPassword: true,
                        })
                        const errors = await validateForm()
                        if (!errors.role && !errors.email && !errors.password && !errors.confirmPassword) {
                          setStep(2)
                        } else {
                          toast.error('Fix errors before continuing')
                        }
                      }}
                    >
                      Continue
                    </Button>
                  </>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Field name="firstName" placeholder="First name" className="form-input" />
                      <Field name="lastName" placeholder="Last name" className="form-input" />
                    </div>

                    <div className="relative">
                      <Phone className="input-icon" />
                      <Field name="phone" className="form-input pl-10" placeholder="Phone" />
                    </div>

                    <div className="relative">
                      <MapPin className="input-icon" />
                      <Field name="street" className="form-input pl-10" placeholder="Street address" />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <Field name="city" className="form-input col-span-2" placeholder="City" />
                      <Field name="state" className="form-input" placeholder="State" />
                      <Field name="zipCode" className="form-input" placeholder="ZIP" />
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setStep(1)}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-slate-900 text-white"
                        isLoading={isSubmitting}
                      >
                        Create account
                      </Button>
                    </div>
                  </>
                )}
              </Form>
            )}
          </Formik>

          <p className="mt-6 text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-slate-900 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
