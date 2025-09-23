'use client';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import type { AppliedResponse } from '@/lib/types';

function Badge({ text }: { text: string }) {
    const color =
        text === 'Approved' ? '#10b981' :
            text === 'Rejected' ? '#ef4444' :
                text === 'Cancelled' ? '#6b7280' : '#0ea5e9';
    return (
        <span style={{ background: `${color}1A`, color, border: `1px solid ${color}33` }}
            className="px-2 py-0.5 rounded-full text-xs font-semibold">
            {text}
        </span>
    );
}

export default function AppliedPage() {
    const key = '/api/apply';
    const { data, error, isLoading } = useSWR<AppliedResponse>(key);

    if (error) return <p className="small">Failed to load.</p>;
    if (isLoading) return <p className="small">{'\u004C'}oading{'\u2026'}</p>;

    const items = (data?.items ?? []).slice().sort((a, b) =>
        (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0)
    );

    if (!items.length) {
        return (
            <div className="space-y-3">
                <h1 className="h1">Current Applied Leave</h1>
                <p className="small">
                    No current applications. <Link href="/" className="underline">Apply now</Link>
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="h1">Current Applied Leave</h1>
                <button className="btn" onClick={() => mutate(key)}>Refresh</button>
            </div>

            {items.map((x) => (
                <div key={x.id} className="card space-y-1.5">
                    <div className="flex items-center justify-between">
                        <div className="font-semibold">{x.leaveTypes?.join(', ') || '—'}</div>
                        <Badge text={x.status ?? 'Pending'} />
                    </div>
                    <div className="small">
                        {x.startDate} {'\u2192'} {x.endDate} {'\u2022'} {x.totalWorkingDays} working day(s)
                    </div>
                    <div className="small">
                        Applied: {x.createdAt ? new Date(x.createdAt).toLocaleDateString() : '—'}
                    </div>
                </div>
            ))}
        </div>
    );
}
