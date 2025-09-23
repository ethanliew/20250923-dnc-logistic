'use client';
import useSWR from 'swr';
import type { BalanceResponse, HistoryResponse } from '@/lib/types';
import StatCard from '@/components/StatCard';

function Badge({ text }: { text: string }) {
    const color =
        text === 'Approved' ? '#10b981' :
            text === 'Rejected' ? '#ef4444' :
                text === 'Cancelled' ? '#6b7280' : '#0ea5e9';
    return (
        <span
            style={{ background: `${color}1A`, color, border: `1px solid ${color}33` }}
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
        >
            {text}
        </span>
    );
}

export default function BalancePage() {
    const balanceKey = '/api/apply?view=balance';
    const historyKey = '/api/apply?view=history';

    // Balance
    const { data: balData, error: balErr, isLoading: balLoading } = useSWR<BalanceResponse>(balanceKey);
    const b = balData?.balance;

    // History — auto refresh every 15s, also revalidate on focus
    const { data: histData, error: histErr, isLoading: histLoading } = useSWR<HistoryResponse>(historyKey, {
        refreshInterval: 15000,
        revalidateOnFocus: true,
    });
    const items = (histData?.items ?? []).slice().sort((a, b) =>
        (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0)
    );

    return (
        <div className="space-y-6">
            {/* Balance */}
            <section className="space-y-4 text-center">
                <h1 className="h1 title-border">Leave Balance</h1>

                {balErr && <p className="small">Failed to load.</p>}
                {balLoading && !b && <p className="small">{'\u004C'}oading{'\u2026'}</p>}

                {b && (
                    <>
                        <div className="flex items-stretch gap-3">
                            <StatCard className="flex-1" label="Annual" value={b.annual} />
                            <StatCard className="flex-1" label="Medical" value={b.medical} />
                            <StatCard className="flex-1" label="Others" value={b.others} />
                        </div>
                        <p className="small">Updated: {new Date(b.lastUpdatedAt).toLocaleString()}</p>
                    </>
                )}

                {!balLoading && !b && !balErr && <p className="small">No balance available.</p>}
            </section>

            {/* History (merged here, no button; auto refresh) */}
            <section id="history" className="space-y-4">
                <h2 className="h1 title-border">History</h2>

                {histErr && <p className="small">Failed to load history.</p>}
                {histLoading && <p className="small">{'\u004C'}oading{'\u2026'}</p>}
                {!histLoading && !items.length && !histErr && <p className="small">No records yet.</p>}

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
            </section>
        </div>
    );
}
