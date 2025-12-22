'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import { vehicleSchema } from '@/lib/validations'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Upload, X } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { vehicleApi } from '@/lib/api'

export default function NewVehiclePage() {
  const router = useRouter()
  const [images, setImages] = useState<string[]>([])

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      // Note: Images will be empty for now until S3 upload is implemented
      const payload = {
        make: values.make,
        modelName: values.model,
        year: values.year,
        color: values.color,
        licensePlate: values.licensePlate,
        vin: values.vin,
        type: values.type,
        capacity: {
          passengers: values.passengers,
          cargo: values.cargo
        },
        pricing: {
          baseRate: values.baseRate,
          rateType: values.rateType
        },
        location: {
          type: 'Point',
          coordinates: [0, 0],
          address: values.street,
          city: values.city,
          state: values.state
        },
        features: values.features ? values.features.split(',').map((f: string) => f.trim()) : [],
        // Don't send blob URLs - they're client-side only and can't be stored
        images: []
      }

      const response = await vehicleApi.create(payload)
      
      if (response.data.success) {
        toast.success('Vehicle added successfully!')
        router.push('/dashboard/owner/vehicles')
      }
    } catch (error: any) {
      console.error('Error adding vehicle:', error)
      toast.error(error.response?.data?.message || 'Failed to add vehicle')
    } finally {
      setSubmitting(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      // Show preview only - actual upload to S3 not yet implemented
      const newImages = Array.from(files).map(file => URL.createObjectURL(file))
      setImages([...images, ...newImages])
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  return (
    <ProtectedRoute allowedRoles={['vehicle_owner']}>
      <DashboardLayout role="vehicle_owner">
        <div className="py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <Link href="/dashboard/owner/vehicles">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Vehicles
              </Button>
            </Link>

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Add New Vehicle</h1>
              <p className="mt-1 text-sm text-gray-600">
                Fill in the details to list your vehicle
              </p>
            </div>

            {/* Form */}
            <div className="card">
              <Formik
                initialValues={{
                  make: '',
                  model: '',
                  year: new Date().getFullYear(),
                  color: '',
                  licensePlate: '',
                  vin: '',
                  type: 'sedan',
                  passengers: 5,
                  cargo: 10,
                  baseRate: 100,
                  rateType: 'daily',
                  street: '',
                  city: '',
                  state: '',
                  zipCode: '',
                  country: 'US',
                  features: '',
                  description: '',
                }}
                validationSchema={vehicleSchema}
                onSubmit={handleSubmit}
              >
                {({ isSubmitting, values }) => (
                  <Form className="space-y-6">
                    {/* Vehicle Images */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vehicle Photos
                      </label>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-yellow-800">
                          ⚠️ Note: Image upload to cloud storage is not yet implemented. Images are shown as preview only and won't be saved with the vehicle.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {images.map((img, index) => (
                          <div key={index} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                            <img src={img} alt={`Vehicle ${index + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <label className="aspect-video border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
                          <Upload className="h-8 w-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">Upload Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleImageUpload}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">Photos shown are for preview only</p>
                    </div>

                    {/* Basic Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="make" className="block text-sm font-medium text-gray-700 mb-1">
                            Make
                          </label>
                          <Field name="make" className="form-input" placeholder="Tesla" />
                          <ErrorMessage name="make" component="div" className="form-error" />
                        </div>

                        <div>
                          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                            Model
                          </label>
                          <Field name="model" className="form-input" placeholder="Model 3" />
                          <ErrorMessage name="model" component="div" className="form-error" />
                        </div>

                        <div>
                          <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                            Year
                          </label>
                          <Field name="year" type="number" className="form-input" />
                          <ErrorMessage name="year" component="div" className="form-error" />
                        </div>

                        <div>
                          <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                            Color
                          </label>
                          <Field name="color" className="form-input" placeholder="Pearl White" />
                          <ErrorMessage name="color" component="div" className="form-error" />
                        </div>

                        <div>
                          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                            Vehicle Type
                          </label>
                          <Field as="select" name="type" className="form-input">
                            <option value="sedan">Sedan</option>
                            <option value="suv">SUV</option>
                            <option value="truck">Truck</option>
                            <option value="van">Van</option>
                            <option value="motorcycle">Motorcycle</option>
                            <option value="bus">Bus</option>
                          </Field>
                          <ErrorMessage name="type" component="div" className="form-error" />
                        </div>

                        <div>
                          <label htmlFor="licensePlate" className="block text-sm font-medium text-gray-700 mb-1">
                            License Plate
                          </label>
                          <Field name="licensePlate" className="form-input" placeholder="ABC-1234" />
                          <ErrorMessage name="licensePlate" component="div" className="form-error" />
                        </div>

                        <div className="md:col-span-2">
                          <label htmlFor="vin" className="block text-sm font-medium text-gray-700 mb-1">
                            VIN (17 characters)
                          </label>
                          <Field name="vin" className="form-input" placeholder="1HGBH41JXMN109186" maxLength={17} />
                          <ErrorMessage name="vin" component="div" className="form-error" />
                        </div>
                      </div>
                    </div>

                    {/* Capacity */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Capacity</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="passengers" className="block text-sm font-medium text-gray-700 mb-1">
                            Passengers
                          </label>
                          <Field name="passengers" type="number" className="form-input" min="1" max="50" />
                          <ErrorMessage name="passengers" component="div" className="form-error" />
                        </div>

                        <div>
                          <label htmlFor="cargo" className="block text-sm font-medium text-gray-700 mb-1">
                            Cargo Space (cu ft)
                          </label>
                          <Field name="cargo" type="number" className="form-input" min="0" />
                          <ErrorMessage name="cargo" component="div" className="form-error" />
                        </div>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="baseRate" className="block text-sm font-medium text-gray-700 mb-1">
                            Base Rate ($)
                          </label>
                          <Field name="baseRate" type="number" className="form-input" min="0" step="0.01" />
                          <ErrorMessage name="baseRate" component="div" className="form-error" />
                        </div>

                        <div>
                          <label htmlFor="rateType" className="block text-sm font-medium text-gray-700 mb-1">
                            Rate Type
                          </label>
                          <Field as="select" name="rateType" className="form-input">
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                          </Field>
                          <ErrorMessage name="rateType" component="div" className="form-error" />
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                            Street Address
                          </label>
                          <Field name="street" className="form-input" placeholder="123 Main St" />
                          <ErrorMessage name="street" component="div" className="form-error" />
                        </div>

                        <div>
                          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          <Field name="city" className="form-input" placeholder="San Francisco" />
                          <ErrorMessage name="city" component="div" className="form-error" />
                        </div>

                        <div>
                          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                            State
                          </label>
                          <Field name="state" className="form-input" placeholder="CA" />
                          <ErrorMessage name="state" component="div" className="form-error" />
                        </div>

                        <div>
                          <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                            Zip Code
                          </label>
                          <Field name="zipCode" className="form-input" placeholder="94102" />
                          <ErrorMessage name="zipCode" component="div" className="form-error" />
                        </div>

                        <div>
                          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                            Country
                          </label>
                          <Field name="country" className="form-input" />
                          <ErrorMessage name="country" component="div" className="form-error" />
                        </div>
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
                      <div>
                        <label htmlFor="features" className="block text-sm font-medium text-gray-700 mb-1">
                          Features (comma-separated)
                        </label>
                        <Field 
                          name="features" 
                          className="form-input" 
                          placeholder="GPS, Bluetooth, Backup Camera, Heated Seats"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter features separated by commas</p>
                      </div>

                      <div className="mt-4">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <Field 
                          as="textarea"
                          name="description" 
                          rows={4}
                          className="form-input" 
                          placeholder="Describe your vehicle, its condition, and any special notes..."
                        />
                      </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-4 pt-6 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => router.back()}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        isLoading={isSubmitting}
                        disabled={isSubmitting}
                      >
                        Add Vehicle
                      </Button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}