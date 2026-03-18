import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register Service Worker for PWA in production only
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('SW registered: ', registration);
        }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
    });
} else if ('serviceWorker' in navigator) {
    // Clean up SW in development to avoid HMR / MIME issues
    navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
            registration.unregister().then(() => {
                console.log('SW unregistered for development');
            });
        }
    });
}

createRoot(document.getElementById("root")!).render(<App />);
