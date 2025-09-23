'use client';
import { useEffect } from 'react';

export default function Offline() {
    useEffect(() => {
        const onOnline = () => location.reload();
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, []);

    return (
        <div className="page space-y-2">
            <h1 className="h1">You're offline</h1>
            <p className="small">We’ll refresh automatically when the connection is back.</p>
            <button className="btn primary" onClick={() => location.reload()}>Retry now</button>
        </div>
    );
}
