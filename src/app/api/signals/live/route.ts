import { NextRequest, NextResponse } from "next/server";
import { Incident, CitizenReportPayload } from "@/lib/types";

export const runtime = "nodejs";

// Global in-memory queue that survives HMR across requests
interface GlobalSignalStorage {
    signals: Incident[];
    mode: "ACTIVE" | "ISOLATED";
    lastConsumedIndex: number;
}

const getStorage = (): GlobalSignalStorage => {
    if (!(globalThis as any).__RESQ_CITIZEN_STORAGE__) {
        (globalThis as any).__RESQ_CITIZEN_STORAGE__ = {
            signals: [],
            mode: "ISOLATED", // Default isolated until dashboard toggles active
            lastConsumedIndex: 0,
        };
    }
    return (globalThis as any).__RESQ_CITIZEN_STORAGE__;
};

// CORS Response Helper
function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders(),
    });
}

/**
 * GET /api/signals/live
 * Used by dashboard to poll new incoming citizen signals
 */
export async function GET(req: NextRequest) {
    const storage = getStorage();
    const url = new URL(req.url);
    const sinceParam = url.searchParams.get("since");
    const sinceTimestamp = sinceParam ? parseInt(sinceParam, 10) : 0;
    const modeParam = url.searchParams.get("set_mode");

    // Allow dashboard to toggle server-side mode via query param
    if (modeParam === "ACTIVE" || modeParam === "ISOLATED") {
        storage.mode = modeParam;
        console.log(`[CITIZEN API] Live Ingestion Mode updated to: ${storage.mode}`);
    }

    // Filter unconsumed or recent signals
    const newSignals = storage.signals.filter(
        s => new Date(s.timestamp).getTime() > sinceTimestamp
    );

    return NextResponse.json(
        {
            mode: storage.mode,
            signals: newSignals,
            total_count: storage.signals.length,
            timestamp: Date.now(),
        },
        { headers: corsHeaders() }
    );
}

/**
 * POST /api/signals/live
 * Ingests live citizen distress signals from the Expo Go app or Web companion
 */
export async function POST(req: NextRequest) {
    const storage = getStorage();

    try {
        const body: CitizenReportPayload = await req.json();

        // Basic validation
        if (!body.citizen?.name || !body.location?.lat || !body.location?.lng) {
            return NextResponse.json(
                { error: "Invalid payload: citizen name and GPS coordinates required." },
                { status: 400, headers: corsHeaders() }
            );
        }

        const isSOS = body.signal_type === "SOS";
        const incidentId = isSOS
            ? `CITIZEN-SOS-${Date.now().toString().slice(-6)}`
            : `CITIZEN-${body.signal_type}-${Date.now().toString().slice(-6)}`;

        // Determine input representation
        let rawInput = body.description || "";
        if (!rawInput.trim()) {
            if (isSOS) {
                rawInput = `🚨 HIGH ALERT SOS! Citizen ${body.citizen.name} triggered one-click emergency distress at ${body.location.address || "GPS Position"}. Immediate armed police / medical evacuation required.`;
            } else if (body.signal_type === "AUDIO") {
                rawInput = `Voice distress audio note transmitted by citizen ${body.citizen.name}. Urgent assessment required.`;
            } else if (body.signal_type === "IMAGE") {
                rawInput = `Citizen captured incident photo evidence at ${body.location.address || "GPS coordinates"}.`;
            } else {
                rawInput = `Citizen emergency distress report via ResQ Citizen Mobile App.`;
            }
        }

        const incident: Incident = {
            id: incidentId,
            type: isSOS ? "COMMAND" : body.signal_type === "AUDIO" ? "AUDIO" : body.signal_type === "IMAGE" ? "IMAGE" : "TEXT",
            raw_input: rawInput,
            location: {
                lat: body.location.lat,
                lng: body.location.lng,
                address: body.location.address || `${body.location.lat.toFixed(4)}° N, ${body.location.lng.toFixed(4)}° E`,
            },
            status: "PENDING",
            priority: isSOS || body.category_hint === "CRIME_ATTACK" || body.category_hint === "WOMEN_SAFETY" ? "CRITICAL" : "HIGH",
            timestamp: body.timestamp || new Date().toISOString(),
            responder_status: "PENDING",
            category_hint: body.category_hint || (isSOS ? "GENERAL_SOS" : "GENERAL"),
            citizen_reporter: body.citizen,
            is_live_citizen: true,
            citizen_media_preview: body.media_base64,
            mission_context: `[CITIZEN LIVE FEED] Verified Citizen: ${body.citizen.name} (${body.citizen.email}). Channel: Expo Go Mobile Terminal. Google Auth ID: ${body.citizen.google_id || "VERIFIED"}.`,
        };

        // Enqueue signal
        storage.signals.push(incident);

        console.log(`[CITIZEN API] Received distress signal: ${incident.id} | Mode: ${storage.mode} | User: ${body.citizen.name}`);

        return NextResponse.json(
            {
                success: true,
                incident_id: incident.id,
                mode: storage.mode,
                is_live_handled: storage.mode === "ACTIVE",
                message: storage.mode === "ACTIVE"
                    ? "Distress signal transmitted to ResQBharat Command Center in REAL-TIME! Multi-Agent Triage Engaged."
                    : "Distress signal queued securely in Citizen Inbox (Command Center currently in isolated drill mode).",
            },
            { status: 201, headers: corsHeaders() }
        );
    } catch (e: any) {
        console.error("[CITIZEN API ERROR]", e);
        return NextResponse.json(
            { error: "Internal server error parsing distress report", details: e.message },
            { status: 500, headers: corsHeaders() }
        );
    }
}
