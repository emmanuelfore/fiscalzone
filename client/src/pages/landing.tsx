import { useBranding } from "@/hooks/use-branding";
import FiscalStackLanding from "./landing/FiscalStackLanding";
import FiscalZoneLanding from "./landing/FiscalZoneLanding";

export default function LandingPage() {
  const { currentBrand } = useBranding();

  if (currentBrand === "fiscalzone") {
    return <FiscalZoneLanding />;
  }

  return <FiscalStackLanding />;
}