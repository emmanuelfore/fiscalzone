import { useBranding } from "@/hooks/use-branding";
import FiscalStackAuth from "./auth/FiscalStackAuth";
import FiscalZoneAuth from "./auth/FiscalZoneAuth";

export default function AuthPage() {
  const { currentBrand } = useBranding();

  if (currentBrand === "fiscalzone") {
    return <FiscalZoneAuth />;
  }

  return <FiscalStackAuth />;
}