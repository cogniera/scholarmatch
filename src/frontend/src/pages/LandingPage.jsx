import ParticleBackground from '../components/landing/ParticleBackground';
import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';
import Footer from '../components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <ParticleBackground />
      <Navbar />
      <HeroSection />
      <Footer />
    </div>
  );
}
