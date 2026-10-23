import { NextRequest, NextResponse } from "next/server";
import { getQuotaMetrics, setExecutionMode } from "@/lib/quota-manager";

export const runtime = "nodejs";

export async function GET() {
    const metrics = getQuotaMetrics();
    return NextResponse.json({
        ...metrics,
        timestamp: new Date().toISOString(),
        carto_active: Boolean(process.env.NEXT_PUBLIC_CARTO_API_KEY),
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (body.mode === "LIVE_AI" || body.mode === "ZERO_QUOTA_SIMULATION") {
            setExecutionMode(body.mode);
        }
        const metrics = getQuotaMetrics();
        return NextResponse.json({
            success: true,
            ...metrics,
            timestamp: new Date().toISOString(),
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
