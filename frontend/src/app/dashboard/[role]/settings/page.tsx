'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { useState, useEffect } from 'react'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { User, Mail, Phone, MapPin, Lock, Bell, CreditCard, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/lib/api'

const profileSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  phone: Yup.string().required('Phone is required'),
  street: Yup.string(),
  city: Yup.string(),
  state: Yup.string(),
  zipCode: Yup.string(),
  country: Yup.string()
})

const passwordSchema = Yup.object().shape({
  currentPassword: Yup.string().required('Current password is required'),
  newPassword: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .required('New password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your password')
})

interface SettingsPageProps {
  params: {
    role: 'owner' | 'driver' | 'customer'
  }
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | 'payment'>('profile')
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: true,
    bookingUpdates: true,
    promotions: false,
    tripReminders: true
  })

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const response = await authApi.getProfile()
      const user = response.data.data
      setUserData({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        email: user.email || '',
        phone: user.profile?.phone || '',
        street: user.profile?.address?.street || '',
        city: user.profile?.address?.city || '',
        state: user.profile?.address?.state || '',
        zipCode: user.profile?.address?.zipCode || '',
        country: user.profile?.address?.country || ''
      })
    } catch (error: any) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (values: any, { setSubmitting }: any) => {
    try {
      await authApi.updateProfile({
        profile: {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          address: {
            street: values.street,
            city: values.city,
            state: values.state,
            zipCode: values.zipCode,
            country: values.country
          }
        }
      })
      toast.success('Profile updated successfully')
      fetchUserProfile()
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasswordChange = async (values: any, { setSubmitting, resetForm }: any) => {
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      })
      toast.success('Password changed successfully')
      resetForm()
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast.error(error.response?.data?.message || 'Failed to change password')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNotificationToggle = (key: string) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }))
    toast.success('Notification settings updated')
  }

  const roleMap = {
    owner: 'vehicle_owner',
    driver: 'driver',
    customer: 'customer'
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={[roleMap[params.role] as any]}>
        <DashboardLayout role={roleMap[params.role] as any}>
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={[roleMap[params.role] as any]}>
      <DashboardLayout role={roleMap[params.role] as any}>
        <div className="py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your account settings and preferences
              </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`${
                    activeTab === 'profile'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`${
                    activeTab === 'password'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                >
                  <Lock className="h-4 w-4" />
                  Password
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`${
                    activeTab === 'notifications'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                >
                  <Bell className="h-4 w-4" />
                  Notifications
                </button>
                {params.role === 'customer' && (
                  <button
                    onClick={() => setActiveTab('payment')}
                    className={`${
                      activeTab === 'payment'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                  >
                    <CreditCard className="h-4 w-4" />
                    Payment Methods
                  </button>
                )}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="card">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
                  <Formik
                    initialValues={userData}
                    validationSchema={profileSchema}
                    onSubmit={handleProfileUpdate}
                  >
                    {({ isSubmitting }) => (
                      <Form className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                              First Name
                            </label>
                            <Field name="firstName" className="form-input" />
                            <ErrorMessage name="firstName" component="div" className="form-error" />
                          </div>

                          <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                              Last Name
                            </label>
                            <Field name="lastName" className="form-input" />
                            <ErrorMessage name="lastName" component="div" className="form-error" />
                          </div>
                        </div>

                        {/* Contact */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                              <Mail className="inline h-4 w-4 mr-1" />
                              Email
                            </label>
                            <Field name="email" type="email" className="form-input" />
                            <ErrorMessage name="email" component="div" className="form-error" />
                          </div>

                          <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                              <Phone className="inline h-4 w-4 mr-1" />
                              Phone
                            </label>
                            <Field name="phone" className="form-input" />
                            <ErrorMessage name="phone" component="div" className="form-error" />
                          </div>
                        </div>

                        {/* Address */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Address
                          </h3>
                          
                          <div>
                            <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                              Street Address
                            </label>
                            <Field name="street" className="form-input" />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                                City
                              </label>
                              <Field name="city" className="form-input" />
                            </div>

                            <div>
                              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                                State
                              </label>
                              <Field name="state" className="form-input" />
                            </div>

                            <div>
                              <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                                Zip Code
                              </label>
                              <Field name="zipCode" className="form-input" />
                            </div>
                          </div>

                          <div>
                            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                              Country
                            </label>
                            <Field name="country" className="form-input" />
                          </div>
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end pt-4 border-t border-gray-200">
                          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                            Save Changes
                          </Button>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </div>
              )}

              {/* Password Tab */}
              {activeTab === 'password' && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
                  <Formik
                    initialValues={{
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    }}
                    validationSchema={passwordSchema}
                    onSubmit={handlePasswordChange}
                  >
                    {({ isSubmitting }) => (
                      <Form className="space-y-4 max-w-md">
                        <div>
                          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Current Password
                          </label>
                          <Field name="currentPassword" type="password" className="form-input" />
                          <ErrorMessage name="currentPassword" component="div" className="form-error" />
                        </div>

                        <div>
                          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                          </label>
                          <Field name="newPassword" type="password" className="form-input" />
                          <ErrorMessage name="newPassword" component="div" className="form-error" />
                        </div>

                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm New Password
                          </label>
                          <Field name="confirmPassword" type="password" className="form-input" />
                          <ErrorMessage name="confirmPassword" component="div" className="form-error" />
                        </div>

                        <div className="pt-4">
                          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                            Change Password
                          </Button>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-600">Receive notifications via email</p>
                      </div>
                      <button
                        onClick={() => handleNotificationToggle('emailNotifications')}
                        className={`${
                          notifications.emailNotifications ? 'bg-primary-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors`}
                      >
                        <span
                          className={`${
                            notifications.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                          } inline-block h-4 w-4 transform rounded-full bg-white transition mt-1`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">SMS Notifications</p>
                        <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                      </div>
                      <button
                        onClick={() => handleNotificationToggle('smsNotifications')}
                        className={`${
                          notifications.smsNotifications ? 'bg-primary-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors`}
                      >
                        <span
                          className={`${
                            notifications.smsNotifications ? 'translate-x-6' : 'translate-x-1'
                          } inline-block h-4 w-4 transform rounded-full bg-white transition mt-1`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">Booking Updates</p>
                        <p className="text-sm text-gray-600">Get notified about booking status changes</p>
                      </div>
                      <button
                        onClick={() => handleNotificationToggle('bookingUpdates')}
                        className={`${
                          notifications.bookingUpdates ? 'bg-primary-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors`}
                      >
                        <span
                          className={`${
                            notifications.bookingUpdates ? 'translate-x-6' : 'translate-x-1'
                          } inline-block h-4 w-4 transform rounded-full bg-white transition mt-1`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">Trip Reminders</p>
                        <p className="text-sm text-gray-600">Receive reminders about upcoming trips</p>
                      </div>
                      <button
                        onClick={() => handleNotificationToggle('tripReminders')}
                        className={`${
                          notifications.tripReminders ? 'bg-primary-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors`}
                      >
                        <span
                          className={`${
                            notifications.tripReminders ? 'translate-x-6' : 'translate-x-1'
                          } inline-block h-4 w-4 transform rounded-full bg-white transition mt-1`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-gray-900">Promotions</p>
                        <p className="text-sm text-gray-600">Receive promotional offers and updates</p>
                      </div>
                      <button
                        onClick={() => handleNotificationToggle('promotions')}
                        className={`${
                          notifications.promotions ? 'bg-primary-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors`}
                      >
                        <span
                          className={`${
                            notifications.promotions ? 'translate-x-6' : 'translate-x-1'
                          } inline-block h-4 w-4 transform rounded-full bg-white transition mt-1`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Methods Tab */}
              {activeTab === 'payment' && params.role === 'customer' && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>
                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-8 w-8 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">Visa ending in 4242</p>
                            <p className="text-sm text-gray-600">Expires 12/2025</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Default
                        </span>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}