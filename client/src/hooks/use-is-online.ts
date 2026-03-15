import { useState, useEffect } from 'react';

export function useIsOnline(): boolean {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const checkConnection = async () => {
            if (!navigator.onLine) {
                setIsOnline(false);
                return;
            }

            try {
                const probeOnce = (url: string) =>
                    new Promise<boolean>((resolve) => {
                        const img = new Image();
                        const timeoutId = window.setTimeout(() => {
                            img.onload = null;
                            img.onerror = null;
                            resolve(false);
                        }, 3000);

                        const done = (ok: boolean) => {
                            window.clearTimeout(timeoutId);
                            img.onload = null;
                            img.onerror = null;
                            resolve(ok);
                        };

                        img.onload = () => done(true);
                        img.onerror = () => done(false);
                        img.src = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
                    });

                const results = await Promise.all([
                    probeOnce('https://www.cloudflare.com/favicon.ico'),
                    probeOnce('https://www.google.com/favicon.ico'),
                ]);

                // Offline only if BOTH probes fail
                setIsOnline(results.some(Boolean));
            } catch {
                // Probe threw — assume online to avoid false positives
                setIsOnline(true);
            }
        };

        checkConnection();
        const interval = setInterval(checkConnection, 5000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    return isOnline;
}