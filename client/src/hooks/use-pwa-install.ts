import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

const PWA_INSTALL_SOURCE_KEY = 'pwaInstallSource';

export function usePwaInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsInstalled(true);
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        const handleAppInstalled = () => {
            console.log('PWA was installed');
            setIsInstallable(false);
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const promptInstall = async (source?: string) => {
        if (!deferredPrompt) return;

        // Remember where the install was triggered from
        if (source) {
            localStorage.setItem(PWA_INSTALL_SOURCE_KEY, source);
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        setDeferredPrompt(null);
        if (outcome === 'accepted') {
            setIsInstallable(false);
        }
    };

    return { isInstallable, isInstalled, promptInstall };
}

/** Call this on app launch to check if we should redirect to /pos */
export function getPwaLaunchRedirect(): string | null {
    const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone;

    if (!isStandalone) return null;

    const source = localStorage.getItem(PWA_INSTALL_SOURCE_KEY);
    if (source === 'pos') return '/pos';

    return null;
}