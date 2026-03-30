import { useEffect } from "react";
import { useActiveCompany } from "@/hooks/use-active-company";
import { applyTheme } from "@/lib/utils";

export function ThemeManager() {
  const { activeCompany } = useActiveCompany();

  useEffect(() => {
    if (activeCompany?.primaryColor) {
      applyTheme(activeCompany.primaryColor);
    }
  }, [activeCompany?.primaryColor]);

  return null;
}
