import './globals.css';
import type { Metadata, Viewport } from 'next';
import NavBar from '@/components/NavBar';
import SwrProvider from './swr-provider';

export const metadata: Metadata = {
    title: 'E-Leave',
    description: 'Apply and track your leaves',
    manifest: '/manifest.json',
    icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' }
};

// Light/dark aware status bar color
export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#0ea5e9' },
        { media: '(prefers-color-scheme: dark)', color: '#0ea5e9' }
    ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" dir="ltr">
            <body>
                <SwrProvider>
                    <main className="page">{children}</main>
                        <NavBar />
                </SwrProvider>
                {/* Register service worker only in production */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 
                  (typeof process === 'undefined' || process.env.NODE_ENV === 'production')) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(()=>{});
                });
              }
            `
                    }}
                />
            </body>
        </html>
    );
}
