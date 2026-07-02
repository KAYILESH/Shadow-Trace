import Navbar from "@/frontend/components/landing/Navbar";
import HeroSection from "@/frontend/components/landing/HeroSection";
import FeaturesSection from "@/frontend/components/landing/FeaturesSection";
import HowItWorksSection from "@/frontend/components/landing/HowItWorksSection";
import Footer from "@/frontend/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
      </main>
      <Footer />
    </>
  );
}
