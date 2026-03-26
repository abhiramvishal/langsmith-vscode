import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { TracePanel } from "@/components/TracePanel";
import { InstallBanner } from "@/components/InstallBanner";
import { WipNote } from "@/components/WipNote";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Features />
      <HowItWorks />
      <TracePanel />
      <InstallBanner />
      <WipNote />
      <Footer />
    </main>
  );
}
