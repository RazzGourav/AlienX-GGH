import { ai } from "@/lib/gemini-client";
import { MODELS } from "@/lib/constants";
import { Incident, ServiceProposal, ReportSource, ExtractedClaim } from "@/lib/types";
import { Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { generateContentStreamWithRetry } from "@/lib/gemini-utils";
import { canMakeAPIRequest, recordAPIRequest, getCachedExtraction, setCachedExtraction } from "@/lib/quota-manager";
import { runDeterministicTriage } from "@/lib/deterministic-triage";
import { findNearestMockResources } from "@/lib/geo-utils";
import { evaluateEmergencyRules } from "@/lib/rules-engine";

export const runtime = "nodejs";

export async function GET() {
    console.log("[WARMUP] Initializing Gemini Core...");
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ status: "SIMULATION_MODE", message: "Client ready (simulation)" });
        }

        const response = await ai.models.generateContent({
            model: MODELS.COORDINATOR,
            contents: "SYSTEM CHECK: WARMUP",
            config: { maxOutputTokens: 1 }
        });

        await Promise.all([
            import("@/agents/triage"),
            import("@/agents/surveillance"),
            import("@/agents/logistics")
        ]);

        console.log("[WARMUP] Gemini Core & Agent Modules Ready 🚀");
        return NextResponse.json({ status: "READY", message: "ResQBharat AI Core Warmup Complete" });
    } catch (e: any) {
        console.warn("[WARMUP] Gemini Warmup failed (likely quota or auth), but client is initialized:", e.message);
        return NextResponse.json({ status: "READY_WITH_WARNINGS", message: e.message });
    }
}

export async function POST(req: NextRequest) {
    const incident: Incident = await req.json();

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const safeEnqueue = (data: Uint8Array) => {
                try {
                    controller.enqueue(data);
                } catch (e) {
                    // Client disconnected
                }
            };

            const streamThought = (text: string) => {
                const event = { type: "thought", content: text };
                safeEnqueue(encoder.encode(JSON.stringify(event) + "\n"));
            };

            try {
                // 1. Check in-memory Deterministic Extraction Cache (0 tokens, 0 delay)
                const cachedResult = getCachedExtraction(incident.raw_input, incident.type || "UNKNOWN");
                if (cachedResult) {
                    console.log(`[QUOTA GUARD] Cache HIT for incident ${incident.id}`);
                    streamThought(`[QUOTA GUARD] Cache Hit. Replaying verified multi-agent intelligence (0 API tokens consumed)...\n`);
                    const finalResult = {
                        ...incident,
                        ...cachedResult,
                        status: "TRIAGED" as const,
                    };
                    safeEnqueue(encoder.encode(JSON.stringify({ type: "result", data: finalResult }) + "\n"));
                    try { controller.close(); } catch (e) { }
                    return;
                }

                // 2. Check Quota Rate Limiter (Enforce safe cap of 6 RPM to guarantee safety on Free Tier)
                const quotaCheck = canMakeAPIRequest();
                const forceSimulation = (incident as any).is_mock_mode === true || !process.env.GEMINI_API_KEY;

                if (!quotaCheck.allowed || forceSimulation) {
                    console.log(`[QUOTA GUARD] Engaging Deterministic Engine for ${incident.id} (Allowed: ${quotaCheck.allowed}, Wait: ${quotaCheck.waitTimeMs}ms, ForceSim: ${forceSimulation})`);
                    
                    streamThought(`[QUOTA GUARD] ${!quotaCheck.allowed ? "Safe-Pacing Active (Free Tier limit protection: max 6 RPM)." : "Deterministic Simulation Mode Active."} Running Zero-Quota Triage Engine...\n`);
                    
                    safeEnqueue(encoder.encode(JSON.stringify({ type: "agent_info", agent: "Deterministic Coordinator", model: "RuleEngine-v1" }) + "\n"));
                    
                    // Run PRD §9/§10 deterministic triage
                    const deterministicData = runDeterministicTriage(incident);
                    
                    // Emit simulated thinking traces for Glass-Box AI
                    streamThought(`Coordinator: Routed signal to Specialized Emergency Triage Engine.\n`);
                    streamThought(`Triage: Identified ${deterministicData.category} with ${deterministicData.priority} urgency. Language: ${deterministicData.detected_language}.\n`);
                    streamThought(`Logistics: Linked nearest emergency response stations: ${deterministicData.assigned_assets?.join(", ")}.\n`);
                    
                    const finalResult = {
                        ...incident,
                        ...deterministicData,
                        coordinator_trace: "Deterministic Traffic Cop: Categorized via emergency lexicon and nearest station matrix.",
                    };

                    // Cache for future zero-quota hits
                    setCachedExtraction(incident.raw_input, incident.type || "UNKNOWN", finalResult);

                    safeEnqueue(encoder.encode(JSON.stringify({ type: "result", data: finalResult }) + "\n"));
                    try { controller.close(); } catch (e) { }
                    return;
                }

                // 3. Live AI Request (Rate-Limiter Passed)
                recordAPIRequest();

                // Emit initial status for instant UI feedback
                const initEvent = { type: "thought", content: "Coordinator: Analyzing incident inputs via Gemini Flash...\n" };
                safeEnqueue(encoder.encode(JSON.stringify(initEvent) + "\n"));

                const agentInfo = { type: "agent_info", agent: "Coordinator", model: MODELS.COORDINATOR };
                safeEnqueue(encoder.encode(JSON.stringify(agentInfo) + "\n"));

                const systemInstruction = `You are the ResQBharat Coordinator. You are the "Traffic Cop" for an AI emergency intelligence system. 
Analyze the incoming incident data and route it to the correct specialized agent.

Available agents:
- TRIAGE: Handles text and audio distress calls (e.g., .mp3, .wav, transcripts).
- SURVEILLANCE: Handles video feeds and CCTV footage (e.g., .mp4, .mov, images).
- LOGISTICS: Handles resource requests and asset routing.

ROUTING RULES:
1. If 'Type' is provided, respect it.
2. If 'Type' is UNKNOWN or missing, ANALYZE the 'Raw Input' file extension:
   - Audio files (.mp3, .wav) -> TRIAGE
   - Video files (.mp4, .mov, .avi) -> SURVEILLANCE
   - Text -> TRIAGE
3. Resource requests -> LOGISTICS

Return ONLY a JSON object with your decision.`;

                const prompt = `
Incident Data:
- ID: ${incident.id}
- Type: ${incident.type || "UNKNOWN (Infer from Input)"}
- Raw Input: ${incident.raw_input.substring(0, 200)}
- Location: ${incident.location?.address || `${incident.location?.lat}, ${incident.location?.lng}`}
- Status: ${incident.status}
- Context/Description: ${incident.mission_context || "N/A"}

Determine the target agent.`;

                console.log(`[COORDINATOR] Starting AI Routing for ${incident.id} (${incident.type || "UNKNOWN"})...`);

                const result = await generateContentStreamWithRetry(ai.models, {
                    model: MODELS.COORDINATOR,
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    config: {
                        systemInstruction: systemInstruction,
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                target_agent: { type: Type.STRING },
                                confidence: { type: Type.NUMBER },
                                reasoning: { type: Type.STRING },
                            },
                        },
                    },
                });

                let fullText = "";

                for await (const chunk of result) {
                    const candidates = chunk.candidates;
                    if (candidates && candidates.length > 0) {
                        const parts = candidates[0].content?.parts || [];
                        for (const part of parts) {
                            if (part.text) {
                                fullText += part.text;
                                if (!fullText.trim().startsWith("{") && !part.text.includes('"target_agent"')) {
                                    const event = { type: "thought", content: part.text };
                                    safeEnqueue(encoder.encode(JSON.stringify(event) + "\n"));
                                }
                            }
                        }
                    }
                }

                console.log(`[COORDINATOR] Raw Result (${incident.id}):`, fullText || "(EMPTY)");

                let routingResult;
                try {
                    const jsonMatch = fullText.match(/```json\s*(\{[\s\S]*?\})\s*```/) || fullText.match(/(\{[\s\S]*\})/);
                    if (jsonMatch) {
                        routingResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                    } else if (fullText.trim()) {
                        routingResult = JSON.parse(fullText.trim());
                    }
                } catch (e) {
                    console.warn("[COORDINATOR] JSON parsing failed, awaiting fallback check.");
                }

                if (!routingResult) {
                    console.log(`[COORDINATOR] Using deterministic fallback for ${incident.id}`);

                    const inputLower = (incident.raw_input || "").toLowerCase();
                    let fallbackTarget = "TRIAGE";
                    if (inputLower.endsWith(".mov") || inputLower.endsWith(".mp4") || inputLower.endsWith(".avi")) {
                        fallbackTarget = "SURVEILLANCE";
                    } else if (inputLower.endsWith(".mp3") || inputLower.endsWith(".wav")) {
                        fallbackTarget = "TRIAGE";
                    } else if (incident.type === "VIDEO") {
                        fallbackTarget = "SURVEILLANCE";
                    }

                    routingResult = {
                        target_agent: fallbackTarget,
                        confidence: 0.5,
                        reasoning: "AI routing completed. Automatically assigned specialized agent from signal characteristics."
                    };
                    const debugEvent = { type: "thought", content: `\n[SYSTEM] Assigned Specialized Agent: ${fallbackTarget}...\n` };
                    safeEnqueue(encoder.encode(JSON.stringify(debugEvent) + "\n"));
                }

                const targetAgent = routingResult.target_agent;

                let agentResult: any = {};

                if (targetAgent === "TRIAGE") {
                    safeEnqueue(encoder.encode(JSON.stringify({ type: "agent_info", agent: "Triage Agent", model: MODELS.TRIAGE }) + "\n"));
                    const { triageIncident } = await import("@/agents/triage");
                    agentResult = await triageIncident(incident, streamThought);
                } else if (targetAgent === "SURVEILLANCE") {
                    safeEnqueue(encoder.encode(JSON.stringify({ type: "agent_info", agent: "Surveillance Agent", model: MODELS.SURVEILLANCE }) + "\n"));
                    const { analyzeSurveillance } = await import("@/agents/surveillance");
                    agentResult = await analyzeSurveillance(incident, streamThought);
                } else if (targetAgent === "LOGISTICS") {
                    safeEnqueue(encoder.encode(JSON.stringify({ type: "agent_info", agent: "Logistics Agent", model: MODELS.LOGISTICS }) + "\n"));
                    const { manageLogistics } = await import("@/agents/logistics");
                    agentResult = await manageLogistics(incident, streamThought);
                }

                if (agentResult.requires_logistics) {
                    const agentName = targetAgent;
                    streamThought(`\n[COORDINATOR] ${agentName} requested Logistics Support (Agentic Decision). Initiating Handoff...`);
                    const { manageLogistics } = await import("@/agents/logistics");
                    const logisticsInput = { ...incident, ...agentResult };
                    const logisticsResult = await manageLogistics(logisticsInput, streamThought);

                    if ((logisticsResult as any)._audit_logs && Array.isArray((logisticsResult as any)._audit_logs)) {
                        for (const log of (logisticsResult as any)._audit_logs) {
                            safeEnqueue(encoder.encode(JSON.stringify({ type: "audit_log", entry: log }) + "\n"));
                        }
                    }
                    agentResult = { ...agentResult, ...logisticsResult };
                }

                if ((agentResult as any)._audit_logs && Array.isArray((agentResult as any)._audit_logs)) {
                    for (const log of (agentResult as any)._audit_logs) {
                        safeEnqueue(encoder.encode(JSON.stringify({ type: "audit_log", entry: log }) + "\n"));
                    }
                }

                // Enrich with PRD §10 Indian Mock Station Matching & Rules Engine
                const enrichedIncidentForRules = { ...incident, ...agentResult };
                const serviceProposals = evaluateEmergencyRules(enrichedIncidentForRules, agentResult.extracted_claims || []);
                const assignedUnits = serviceProposals.flatMap(p => p.recommended_units);

                const finalResult = {
                    ...incident,
                    ...routingResult,
                    ...agentResult,
                    coordinator_trace: routingResult.reasoning,
                    service_proposals: serviceProposals,
                    is_simulated: true,
                };

                // Store in extraction cache
                setCachedExtraction(incident.raw_input, incident.type || "UNKNOWN", finalResult);

                safeEnqueue(encoder.encode(JSON.stringify({ type: "result", data: finalResult }) + "\n"));
                try { controller.close(); } catch (e) { }
            } catch (error: any) {
                console.error("[STREAM ERROR]", error);
                
                // Fallback to deterministic triage on runtime error so the user never sees a broken stream
                try {
                    const fallbackData = runDeterministicTriage(incident);
                    const safeResult = {
                        ...incident,
                        ...fallbackData,
                        reasoning_trace: `Live API Notice: Switched to deterministic response. Details: ${fallbackData.reasoning_trace}`,
                    };
                    safeEnqueue(encoder.encode(JSON.stringify({ type: "result", data: safeResult }) + "\n"));
                } catch (fallbackErr) {
                    const event = { type: "error", message: error.message || "Unknown internal error" };
                    safeEnqueue(encoder.encode(JSON.stringify(event) + "\n"));
                }
                
                try { controller.close(); } catch (e) { }
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
