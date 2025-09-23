import { NextResponse } from 'next/server';


const TOKEN = process.env.N8N_CALLBACK_TOKEN;


export async function POST(req: Request) {
const auth = req.headers.get('authorization');
if (TOKEN && auth !== `Bearer ${TOKEN}`) {
return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
}


const body = await req.json();
// Expected body from n8n:
// {
// "ok": true,
// "application": { id, status, ...fields },
// "balance": { annual, medical, others, lastUpdatedAt }
// }


// You can persist to DB here. For now, just echo.
return NextResponse.json({ ok: true, ...body });
}