// src/lib/api.ts
import type { LeaveApplicationInput, N8nIngestResponse } from './types';

/** 10s request timeout */
const DEFAULT_TIMEOUT = 10_000;

function withTimeout(signal?: AbortSignal, ms = DEFAULT_TIMEOUT) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), ms);
    // If a caller passed a signal, abort our controller when theirs aborts
    signal?.addEventListener('abort', () => ac.abort(), { once: true });
    return { signal: ac.signal, cancel: () => clearTimeout(timer) };
}

async function readJsonSafe(res: Response) {
    const txt = await res.text();
    try {
        return JSON.parse(txt);
    } catch {
        return { ok: false, message: `Non-JSON response (${res.status} ${res.statusText})`, raw: txt };
    }
}

async function api<T = unknown>(
    url: string,
    init: RequestInit = {},
    { timeoutMs = DEFAULT_TIMEOUT }: { timeoutMs?: number } = {}
): Promise<T> {
    const { signal, cancel } = withTimeout(init.signal, timeoutMs);
    try {
        const res = await fetch(url, {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
            ...init,
            signal,
        });
        const data = await readJsonSafe(res);
        if (!res.ok) {
            const msg = (data as any)?.message || `HTTP ${res.status}`;
            throw new Error(msg);
        }
        return data as T;
    } catch (err: any) {
        if (err?.name === 'AbortError') throw new Error('Request timed out');
        throw err;
    } finally {
        cancel();
    }
}

/** Submit a new leave application (proxied to /api/apply → n8n) */
export async function submitLeave(input: LeaveApplicationInput): Promise<N8nIngestResponse> {
    return api<N8nIngestResponse>('/api/apply', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

/** Types for the simple demo GET endpoints */
export type AppliedResponse = { ok: boolean; items: Array<Record<string, any>> };
export type BalanceResponse = {
    ok: boolean;
    balance?: { annual: number; medical: number; others: number; lastUpdatedAt: string };
};
export type HistoryResponse = { ok: boolean; items: Array<Record<string, any>> };

export async function fetchApplied() {
    return api<AppliedResponse>('/api/apply');
}

export async function fetchBalance() {
    return api<BalanceResponse>('/api/apply?view=balance');
}

export async function fetchHistory() {
    return api<HistoryResponse>('/api/apply?view=history');
}

/** SWR convenience fetcher: use like useSWR(key, swrFetcher) */
export const swrFetcher = (url: string) => api(url);
