import { useState, useEffect } from 'react';
import { setOnlineState } from '@/lib/online-state';

export function useIsOnline(): boolean {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const setOnline = (v: boolean) => { setIsOnline(v); setOnlineState(v); };

    useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Sync state on mount
        setOnline(navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}
