"use client"

import { Header } from "@/modules/marketing/components/header"
import { HeroSection } from "@/modules/marketing/components/hero-section"
import { StatsSection } from "@/modules/marketing/components/stats-section"
import { ServicesSection } from "@/modules/marketing/components/services-section"
import { TrackerSection } from "@/modules/marketing/components/tracker-section"
import { ValuesSection } from "@/modules/marketing/components/values-section"
import { SupportSection } from "@/modules/marketing/components/support-section"
import { ContactSection } from "@/modules/marketing/components/contact-section"
import { Footer } from "@/modules/marketing/components/footer"

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <StatsSection />
        <ServicesSection />
        <TrackerSection />
        <ValuesSection />
        <SupportSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  )
}
