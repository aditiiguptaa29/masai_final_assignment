import Link from 'next/link'
import { Car, Mail, Phone, MapPin } from 'lucide-react'

const footerLinks = {
  platform: [
    { name: 'Browse Vehicles', href: '/vehicles' },
    { name: 'How it Works', href: '/how-it-works' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Safety', href: '/safety' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Careers', href: '/careers' },
    { name: 'Press', href: '/press' },
    { name: 'Blog', href: '/blog' },
  ],
  support: [
    { name: 'Help Center', href: '/help' },
    { name: 'Contact Us', href: '/contact' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Privacy Policy', href: '/privacy' },
  ],
}

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-12">

        {/* TOP */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-md bg-slate-900 flex items-center justify-center">
                <Car className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-slate-900">
                FleetManager
              </span>
            </Link>

            <p className="text-sm text-slate-600 max-w-md mb-6">
              A centralized fleet management platform designed
              for vehicle owners, drivers, and customers to
              operate within a reliable and structured system.
            </p>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-500" />
                <span>support@fleetmanager.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-500" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-slate-500" />
                <span>San Francisco, CA</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <FooterColumn title="Platform" links={footerLinks.platform} />
          <FooterColumn title="Company" links={footerLinks.company} />
          <FooterColumn title="Support" links={footerLinks.support} />
        </div>

        {/* BOTTOM */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
          <span>
            © {new Date().getFullYear()} FleetManager Systems. All rights reserved.
          </span>

          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/terms" className="hover:text-slate-900">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/cookies" className="hover:text-slate-900">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* Footer column */
const FooterColumn = ({
  title,
  links,
}: {
  title: string
  links: { name: string; href: string }[]
}) => {
  return (
    <div>
      <h3 className="text-sm font-medium text-slate-900 mb-4">
        {title}
      </h3>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.name}>
            <Link
              href={link.href}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
