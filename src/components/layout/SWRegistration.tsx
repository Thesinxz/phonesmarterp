"use client";

import { useEffect } from 'react';

export function registerServiceWorker() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => {
                    console.log('[SW] Registered with scope:', reg.scope);
                })
                .catch(err => {
                    console.error('[SW] Registration failed:', err);
                });
        });
    }
}

export function SWRegistration() {
    useEffect(() => {
        registerServiceWorker();
    }, []);

    return null;
}
