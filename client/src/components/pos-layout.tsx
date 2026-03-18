
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function PosLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        )
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {children}
        </div>
    );
}
