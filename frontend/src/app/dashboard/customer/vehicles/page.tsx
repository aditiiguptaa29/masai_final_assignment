'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useState, useEffect } from 'react'
import { Search, Filter, MapPin, Users, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { vehicleApi } from '@/lib/api'
import toast from 'react-hot-toast'

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const response = await vehicleApi.getAll({
        status: 'active',
        availability: true,
      })
      setVehicles(response.data.data || [])
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load vehicles'
      toast.error(errorMsg)
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      searchTerm === '' ||
      vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.location?.address
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())

    const matchesType =
      selectedType === 'all' || vehicle.type === selectedType

    return matchesSearch && matchesType
  })

  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <DashboardLayout role="customer">
        <div className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* HEADER */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-slate-900">
                Browse Vehicles
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Choose the right vehicle for your journey
              </p>
            </div>

            {/* SEARCH + FILTER */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by make, model, or location"
                    className="w-full rounded-lg border border-slate-300 pl-11 py-3 text-sm focus:ring-2 focus:ring-slate-900"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-6"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>

              {showFilters && (
                <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FilterSelect
                    label="Vehicle Type"
                    value={selectedType}
                    onChange={setSelectedType}
                    options={[
                      'all',
                      'sedan',
                      'suv',
                      'truck',
                      'van',
                    ]}
                  />
                  <FilterSelect label="Price Range" options={['Any']} />
                  <FilterSelect label="Passengers" options={['Any']} />
                  <FilterInput label="Location" />
                </div>
              )}
            </div>

            {/* VEHICLE GRID */}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredVehicles.map((vehicle) => (
                  <div
                    key={vehicle._id}
                    className="group rounded-2xl bg-white border border-slate-200 overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col"
                  >
                    {/* IMAGE */}
                    <div className="relative h-48 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                      <span className="text-6xl">🚗</span>
                      <span className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-slate-700">
                        {vehicle.type}
                      </span>
                    </div>

                    {/* CONTENT */}
                    <div className="p-5 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h3>
                        <span className="text-sm font-semibold text-slate-900 flex items-center">
                          <DollarSign className="h-4 w-4" />
                          {vehicle.pricing?.baseRate || 0}
                        </span>
                      </div>

                      <p className="text-sm text-slate-500 mb-3">
                        {vehicle.location?.address ||
                          vehicle.location?.city ||
                          'Location not specified'}
                      </p>

                      <div className="flex justify-between text-sm text-slate-600 mb-5">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {vehicle.capacity?.passengers || 0} seats
                        </span>
                        <span className="capitalize">
                          {vehicle.pricing?.rateType === 'daily'
                            ? 'Per day'
                            : 'Per hour'}
                        </span>
                      </div>

                      {vehicle.availability && (
                        <Link
                          href={`/dashboard/customer/vehicles/${vehicle._id}`}
                          className="mt-auto"
                        >
                          <Button
                            className="w-full"
                            variant="primary"
                          >
                            Book Vehicle
                          </Button>
                        </Link>
                      )}
                      {!vehicle.availability && (
                        <Button
                          className="w-full"
                          variant="secondary"
                          disabled
                        >
                          Unavailable
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* EMPTY */}
            {!loading && filteredVehicles.length === 0 && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🚗</div>
                <h3 className="text-lg font-medium text-slate-900">
                  No vehicles found
                </h3>
                <p className="text-slate-600">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

/* FILTER HELPERS */

const FilterSelect = ({
  label,
  value,
  onChange,
  options,
}: any) => (
  <div>
    <label className="text-sm font-medium text-slate-700 mb-1 block">
      {label}
    </label>
    <select
      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    >
      {options.map((o: string) => (
        <option key={o} value={o}>
          {o === 'all' ? 'All types' : o}
        </option>
      ))}
    </select>
  </div>
)

const FilterInput = ({ label }: any) => (
  <div>
    <label className="text-sm font-medium text-slate-700 mb-1 block">
      {label}
    </label>
    <input
      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm"
      placeholder="Enter value"
    />
  </div>
)
