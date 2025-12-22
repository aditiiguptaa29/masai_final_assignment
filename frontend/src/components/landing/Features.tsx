import { Car, Users, BarChart3, Shield, Clock, MapPin } from 'lucide-react'

const features = [
  {
    icon: Car,
    title: 'Vehicle Management',
    description:
      'Manage the complete vehicle lifecycle including registration, documentation, maintenance status, and performance tracking.',
  },
  {
    icon: Users,
    title: 'Multi-role Access',
    description:
      'Dedicated workflows and dashboards for vehicle owners, drivers, and customers with role-based permissions.',
  },
  {
    icon: BarChart3,
    title: 'Operational Analytics',
    description:
      'Monitor fleet utilization, trip history, revenue metrics, and operational performance through structured insights.',
  },
  {
    icon: Shield,
    title: 'Security & Reliability',
    description:
      'Secure authentication, protected data storage, and reliable system availability for critical operations.',
  },
  {
    icon: Clock,
    title: 'Real-time Operations',
    description:
      'Live trip monitoring, status updates, and operational notifications across the platform.',
  },
  {
    icon: MapPin,
    title: 'Location-based Intelligence',
    description:
      'Location-aware matching, optimized routing, and proximity-driven service allocation.',
  },
]

export const Features = () => {
  return (
    <section className="py-20 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-6">

        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <h2 className="text-2xl lg:text-3xl font-semibold text-slate-900">
            Platform capabilities
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Core system functions designed to support end-to-end
            fleet operations and role-based workflows.
          </p>
        </div>

        {/* Feature List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="flex gap-4 bg-white border border-slate-200 rounded-lg p-6"
              >
                <div className="flex-shrink-0">
                  <Icon className="h-5 w-5 text-slate-800 mt-1" />
                </div>

                <div>
                  <h3 className="text-sm font-medium text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
