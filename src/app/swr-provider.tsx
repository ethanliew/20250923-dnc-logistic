'use client';

import { SWRConfig } from 'swr';
import { swrFetcher } from '@/lib/api';

export default function SwrProvider({ children }: { children: React.ReactNode }) {
    return (
        <SWRConfig
            value={{
                fetcher: swrFetcher,     // default fetcher
                revalidateOnFocus: true, // pull fresh when you switch back to the tab
                shouldRetryOnError: true,
                errorRetryCount: 2,
                dedupingInterval: 1000,  // de-dupe same key within 1s
            }}
        >
            {children}
        </SWRConfig>
    );
}
