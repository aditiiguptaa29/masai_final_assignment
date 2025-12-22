import { Button } from '@/components/ui/Button'
import { Hero } from '@/components/landing/Hero'
import { Features } from '@/components/landing/Features'
import { Footer } from '@/components/landing/Footer'
import { Navbar } from '@/components/layout/Navbar'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <Footer />
    </>
  )
}