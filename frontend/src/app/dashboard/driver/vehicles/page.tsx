'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { vehicleApi, userApi, authApi } from '@/lib/api'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Car, MapPin, BadgeCheck, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DriverVehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [registeredVehicleIds, setRegisteredVehicleIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const [res, profileRes] = await Promise.all([
        vehicleApi.getAll({ status: 'active', availability: true }),
        authApi.getProfile()
      ])
      setVehicles(res.data.data || [])
      const ids: string[] = ((profileRes.data?.data?.driverVehicleIds) || []).map((id: any) => String(id))
      setRegisteredVehicleIds(new Set(ids))
    } catch {
      toast.error('Failed to load vehicles')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (vehicleId: string) => {
    try {
      const res = await userApi.registerDriverToVehicle(vehicleId)
      if (res.data.success) {
        toast.success('Registered to vehicle')
        setRegisteredVehicleIds((prev) => new Set([...Array.from(prev), String(vehicleId)]))
      } else {
        toast(res.data.message || 'Request processed')
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to register')
    }
  }

  return (
    <ProtectedRoute allowedRoles={['driver']}>
      <DashboardLayout role="driver">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">Available Vehicles</h1>
            {loading ? (
              <div className="bg-white border rounded-xl py-12 text-center">Loading…</div>
            ) : vehicles.length === 0 ? (
              <div className="bg-white border rounded-xl py-12 text-center">No vehicles available</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {vehicles.map((v) => {
                  const isRegistered = registeredVehicleIds.has(String(v._id))
                  return (
                  <div key={v._id} className="bg-white border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Car className="h-5 w-5 text-slate-700" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{`${v.year || ''} ${v.make || ''} ${v.modelName || ''}`.trim()}</p>
                        <p className="text-xs text-gray-600">{v.licensePlate}</p>
                      </div>
                      {isRegistered && (
                        <span className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3" /> Registered
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <MapPin className="h-4 w-4" />
                      {v.location?.address || 'Location not specified'}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-semibold text-gray-900">${v.pricing?.baseRate}</span>
                        <span className="text-gray-600"> / {v.pricing?.rateType || 'daily'}</span>
                      </div>
                      <Button
                        onClick={() => handleRegister(v._id)}
                        className="flex items-center gap-2"
                        disabled={isRegistered}
                        variant={isRegistered ? 'outline' : 'primary'}
                      >
                        {isRegistered ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Registered
                          </>
                        ) : (
                          <>
                            <BadgeCheck className="h-4 w-4" /> Register to Drive
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
