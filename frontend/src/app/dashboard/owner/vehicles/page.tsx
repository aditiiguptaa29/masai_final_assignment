'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import {
  Plus,
  Search,
  Filter,
  MapPin,
  Star,
  Users,
  Package,
  Edit,
  Trash2,
  Eye,
  Car,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { vehicleApi } from '@/lib/api'

const statusColors: Record<string, string> = {
  available: 'bg-green-50 text-green-700',
  on_trip: 'bg-blue-50 text-blue-700',
  maintenance: 'bg-yellow-50 text-yellow-700',
  inactive: 'bg-slate-100 text-slate-600',
}

const typeLabels: Record<string, string> = {
  sedan: 'Sedan',
  suv: 'SUV',
  truck: 'Truck',
  van: 'Van',
  motorcycle: 'Motorcycle',
  bus: 'Bus',
}

export default function OwnerVehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const res = await vehicleApi.getMyVehicles()
      setVehicles(res.data.data || [])
    } catch {
      toast.error('Failed to load vehicles')
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }

  const filteredVehicles = vehicles.filter((v) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      v.make?.toLowerCase().includes(q) ||
      v.modelName?.toLowerCase().includes(q) ||
      v.licensePlate?.toLowerCase().includes(q)

    const matchesStatus = statusFilter === 'all' || v.status === statusFilter
    const matchesType = typeFilter === 'all' || v.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return
    try {
      await vehicleApi.delete(id)
      toast.success('Vehicle deleted')
      fetchVehicles()
    } catch {
      toast.error('Failed to delete vehicle')
    }
  }

  return (
    <ProtectedRoute allowedRoles={['vehicle_owner']}>
      <DashboardLayout role="vehicle_owner">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                  My Vehicles
                </h1>
                <p className="text-sm text-slate-600">
                  Manage and monitor your fleet
                </p>
              </div>
              <Link href="/dashboard/owner/vehicles/new">
                <Button className="mt-4 md:mt-0 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Vehicle
                </Button>
              </Link>
            </div>

            {/* FILTERS */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by make, model, plate"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="on_trip">On Trip</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm"
                >
                  <option value="all">All Types</option>
                  {Object.keys(typeLabels).map((t) => (
                    <option key={t} value={t}>
                      {typeLabels[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* VEHICLE GRID */}
            {loading ? (
              <div className="text-center py-16 text-slate-500">
                Loading vehicles…
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No vehicles found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.map((v) => (
                  <div
                    key={v._id}
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition"
                  >
                    <div className="aspect-video rounded-lg bg-slate-100 mb-4 flex items-center justify-center overflow-hidden">
                      {v.images?.[0] ? (
                        <img
                          src={v.images[0]}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Car className="h-12 w-12 text-slate-400" />
                      )}
                    </div>

                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-slate-900">
                          {v.year} {v.make} {v.modelName}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {v.licensePlate}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[v.status]}`}
                      >
                        {v.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex gap-4 text-sm text-slate-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {v.capacity?.passengers || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {v.capacity?.cargo || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        {v.rating?.average || 0}
                      </span>
                    </div>

                    <div className="flex items-center text-xs text-slate-600 mb-3">
                      <MapPin className="h-4 w-4 mr-1" />
                      {v.location?.city}, {v.location?.state}
                    </div>

                    <div className="border-t pt-3 flex justify-between items-center">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">
                          ${v.pricing?.baseRate}
                          <span className="text-sm text-slate-500">
                            /{v.pricing?.rateType}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {typeLabels[v.type]}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/dashboard/owner/vehicles/${v._id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/owner/vehicles/${v._id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:border-red-300"
                          onClick={() => handleDelete(v._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
