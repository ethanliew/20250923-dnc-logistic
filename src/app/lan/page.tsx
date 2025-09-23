'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';

const isValidIPv4 = (s: string) =>
    /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(s);

export default function LanPage() {
    const [ip, setIp] = useState('');
    const [port, setPort] = useState<number>(3000);
    const [auto, setAuto] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // 1) Ask the server for a primary LAN IP (Node sees real NICs)
    useEffect(() => {
        fetch('/api/ip')
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (d?.primary) {
                    setIp(d.primary);
                    setAuto(d.primary);
                    if (d.port) setPort(Number(d.port) || 3000);
                }
            })
            .catch(() => { });
    }, []);

    // 2) If already accessed via LAN host, prefer it (e.g. 192.168.1.10:3000/lan)
    useEffect(() => {
        const host = window.location.hostname;
        const p = Number(window.location.port) || 3000;
        if (host && host !== 'localhost' && !/^127\./.test(host)) {
            setIp(host);
            setAuto(host);
            setPort(p);
        }
    }, []);

    const url = useMemo(() => {
        const cleanIp = ip.trim();
        const p = String(port || 3000).trim();
        if (!cleanIp || !p) return '';
        // Force http for LAN dev; change to https if your dev server runs SSL
        return `http://${cleanIp}:${p}`;
    }, [ip, port]);

    const valid = useMemo(() => isValidIPv4(ip.trim()), [ip]);

    async function onCopy() {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch { }
    }

    async function onShare() {
        if (navigator.share && url) {
            try {
                await navigator.share({ title: 'E-Leave (LAN)', text: 'Open E-Leave on this device', url });
            } catch { }
        } else {
            onCopy();
        }
    }

    return (
        <div className="page space-y-4">
            <h1 className="h1">Open on Phone (LAN)</h1>

            <div className="card space-y-2">
                <label>Your PC LAN IP</label>
                <input
                    placeholder="e.g. 192.168.1.23"
                    inputMode="numeric"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                />
                <p className="small">
                    {auto ? `Detected: ${auto}` : 'Tip: run npm run dev:lan and allow port 3000 in Windows Firewall.'}
                </p>
                {!valid && ip && <p className="small" style={{ color: '#dc2626' }}>That doesn’t look like a valid IPv4 address.</p>}
            </div>

            <div className="card space-y-2">
                <label>Port</label>
                <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={65535}
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value) || 3000)}
                />
            </div>

            <div className="card space-y-3" style={{ textAlign: 'center' }}>
                {valid ? (
                    <>
                        <div className="font-semibold break-all">{url}</div>
                        <div style={{ background: 'white', padding: 12, display: 'inline-block', borderRadius: 12 }}>
                            <QRCode value={url} size={196} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button className="primary btn" onClick={onCopy}>
                                {copied ? 'Copied!' : 'Copy URL'}
                            </button>
                            <button className="btn" onClick={onShare}>
                                Share
                            </button>
                        </div>
                    </>
                ) : (
                    <p className="small">Enter a valid LAN IP to generate a QR.</p>
                )}
            </div>

            <p className="small">
                Make sure your phone is on the same Wi-Fi (not guest/VPN). If it still can’t reach, try a tunnel:
                <code> npx localtunnel --port 3000</code>
            </p>
        </div>
    );
}
