import { NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';


const USE_MOCK = process.env.MOCK === '1';
const mockPath = (file: string) => path.join(process.cwd(), 'src', 'mock', file);

async function loadJson(file: string) {
    const p = mockPath(file);
    const txt = await fs.readFile(p, 'utf-8');
    return JSON.parse(txt);
}

export const runtime = 'nodejs'; // ensure Node runtime (Edge lacks process.env by default)

const N8N_WEBHOOK_INGEST_URL = process.env.N8N_WEBHOOK_INGEST_URL;

function json(data: any, init?: number | ResponseInit) {
    const base: ResponseInit = typeof init === 'number' ? { status: init } : (init || {});
    // Always avoid caching
    base.headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...(base.headers || {}),
    };
    return NextResponse.json(data, base);
}

async function readJsonSafe(res: Response) {
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return { ok: false, message: `Upstream returned non-JSON (${res.status} ${res.statusText})`, raw: text };
    }
}

export async function POST(req: Request) {

    if (USE_MOCK) {
        // Return static mock OR generate on the fly
        const data = await loadJson('ingest-response.json');
        return NextResponse.json(data, { status: 200 });
    }

    if (!N8N_WEBHOOK_INGEST_URL) {
        return json({ ok: false, message: 'Server is missing N8N_WEBHOOK_INGEST_URL' }, 500);
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return json({ ok: false, message: 'Invalid JSON body' }, 400);
    }

    // 10s timeout so requests don’t hang
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 10_000);

    try {
        const res = await fetch(N8N_WEBHOOK_INGEST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: ac.signal,
        });

        const data = await readJsonSafe(res);
        // Pass through upstream status but keep no-store headers
        return json(data, res.status);
    } catch (err: any) {
        // Handle abort vs other errors
        const aborted = err?.name === 'AbortError';
        return json(
            {
                ok: false,
                message: aborted ? 'Timed out contacting n8n' : (err?.message || 'Upstream request failed'),
            },
            502
        );
    } finally {
        clearTimeout(t);
    }
}

// Simple demo: return local demo data (replace with your persistence or n8n reads)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view');

    if (USE_MOCK) {
        if (view === 'balance') return NextResponse.json(await loadJson('balance.json'));
        if (view === 'history') return NextResponse.json(await loadJson('history.json'));
        // default → applied
        return NextResponse.json(await loadJson('applied.json'));
    }

    if (view === 'balance') {
        return json({
            ok: true,
            balance: {
                annual: 7,
                medical: 5,
                others: 2,
                lastUpdatedAt: new Date().toISOString(),
            },
        });
    }

    if (view === 'history') {
        return json({ ok: true, items: [] });
    }

    // default: current applied leave list (empty stub)
    return json({ ok: true, items: [] });
}
