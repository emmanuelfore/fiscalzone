import { useState, useEffect } from 'react';
import { setOnlineState } from '@/lib/online-state';

export function useIsOnline(): boolean {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const checkConnection = async () => {
        try {
            // Heartbeat check to actual API
            const res = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
            return res.ok;
        } catch {
            return false;
        }
    };

    const setOnline = (v: boolean) => {
        setIsOnline(v);
        setOnlineState(v);
    };

    useEffect(() => {
        const handleOnline = async () => {
            const hasActualInternet = await checkConnection();
            setOnline(hasActualInternet);
        };
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        handleOnline();

        // Periodic heartbeat every 30s
        const timer = setInterval(handleOnline, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(timer);
        };
    }, []);

    return isOnline;
}
