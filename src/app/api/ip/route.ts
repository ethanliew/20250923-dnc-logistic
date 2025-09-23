import { NextResponse } from "next/server";
import os from "os";

export async function GET() {
    const nets = os.networkInterfaces();
    const ipv4s: string[] = [];

    Object.values(nets).forEach((ifs) => {
        ifs?.forEach((i) => {
            if (i && i.family === "IPv4" && !i.internal) ipv4s.push(i.address);
        });
    });

    // return first non-internal IPv4 as convenience
    return NextResponse.json({
        ipv4s,
        primary: ipv4s[0] ?? null,
        port: 3000
    });
}
