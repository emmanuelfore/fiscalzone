import { useLocation } from 'wouter';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function PwaInstallPrompt() {
    const [location] = useLocation();
    const { isInstallable, isInstalled, promptInstall } = usePwaInstall();

    // Only show on /pos routes, and not if already installed
    if (!location.startsWith('/pos') || !isInstallable || isInstalled) {
        return null;
    }

    return (
        <div className= "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 max-w-sm w-full mx-4" >
        <div className="flex-1 min-w-0" >
            <p className="text-sm font-semibold" > Install POS App </p>
                < p className = "text-xs text-slate-400 truncate" > Add to home screen for offline use </p>
                    </div>
                    < Button
                size = "sm"
                className = "shrink-0 bg-primary hover:bg-primary/90"
    onClick = {() => promptInstall('pos')
}
            >
    <Download className="w-4 h-4 mr-1" />
        Install
        </Button>
        </div>
    );
}