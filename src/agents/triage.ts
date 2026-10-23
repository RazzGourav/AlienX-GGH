"use server";

import { ai, generateThoughtSignature } from "@/lib/gemini-client";
import { MODELS } from "@/lib/constants";
import { type Incident } from "@/lib/types";
import { ThinkingLevel, Type } from "@google/genai";
import fs from "fs";
import path from "path";

import { generateContentStreamWithRetry, extractAndParseJSON } from "@/lib/gemini-utils";


/**
 * Generate a real SHA-256 cryptographic signature for audit trail.
 * Creates a hash of reasoning + priority + timestamp as "Chain of Custody" proof.
 */

export async function triageIncident(incident: Incident, onThought?: (thought: string) => void): Promise<Partial<Incident>> {
    if (!process.env.GEMINI_API_KEY) {
        console.error("[TRIAGE] GEMINI_API_KEY missing. Cannot proceed with Live Analysis.");
        return {
            priority: "MEDIUM",
            category: "SYSTEM_OFFLINE",
            reasoning_trace: "System Offline: No AI API Key provided. Live analysis unavailable.",
            display_reasoning: ["System Offline", "API Key Missing", "Check Config"],
            status: "TRIAGED",
            thought_signature: "ERROR-NO-KEY"
        };
    }
    console.log(`[TRIAGE] ========================================`);
    console.log(`[TRIAGE] Analyzing incident ${incident.id}...`);
    console.log(`[TRIAGE] Using model: ${MODELS.TRIAGE}`);
    const inferredType = incident.type || (incident.raw_input.match(/\.(mp3|wav|ogg|webm|m4a|flac)$/i) ? 'AUDIO (inferred)' :
        incident.raw_input.match(/\.(mp4|webm|mov|avi)$/i) ? 'VIDEO (inferred)' :
            incident.raw_input.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'IMAGE (inferred)' : 'TEXT');
    console.log(`[TRIAGE] Input type: ${inferredType}`);
    console.log(`[TRIAGE] Raw input: ${incident.raw_input.substring(0, 100)}...`);

    const systemInstruction = `
    You are an AI Triage Officer for ResQBharat — India's Autonomous Emergency Response & Disaster Intelligence System.
    
    CORE RESPONSIBILITIES:
    1. MULTILINGUAL & MULTIMODAL INGESTION:
       - Understand and process emergency reports in Hindi (हिंदी), Hinglish (e.g. "paani ghar me ghus gaya hai", "chhat pe log fase hain"), and English.
       - Detect the input language accurately (e.g. "Hindi", "English", "Hinglish").
       - Extract core factual claims: nature of emergency, trapped victims, life hazards, and specific spoken landmarks.

    2. TRIAGE CATEGORIZATION & PRIORITY BRAKE:
       - CATEGORIES: "URBAN_FLOOD", "STRUCTURAL_COLLAPSE", "HAZMAT_GAS_LEAK", "FIRE_RESCUE", "LANDSLIDE_HIGHWAY", "INFRASTRUCTURE_CRITICAL", "MEDICAL_EMERGENCY", "NON_EMERGENCY".
       - PRIORITY LEVELS:
         * CRITICAL: Verified immediate threat to human life (e.g. victims trapped under debris, water reaching live electrical equipment/transformer, severe toxic inhalation).
         * HIGH: Rapidly escalating hazard (e.g. dam spillway surge, rising water in residential cluster, ammonia tanker leak).
         * MEDIUM: Moderate distress, property damage, or plausible event awaiting physical drone/field verification.
         * LOW: Noise, commercial complaints (e.g. food delivery delays, routine traffic, minor nuisance calls), historical or uncorroborated rumors.
       - STRICT PRIORITY BRAKE: If grounding or visual verification yields NO evidence of disaster, or if input is a prank/non-emergency, cap priority at LOW. Non-emergency calls must never tie up emergency dispatch lines.

    3. INDIAN GEOSPATIAL FORENSICS & DUAL GROUNDING:
       - Extract Indian location entities: street names, chowks, bus stands, metro stations, ghats, bypasses, industrial corridors, mohallas.
       - Compare 'spoken_address' from text/audio against GPS/metadata coordinates.
       - If distance between spoken address and GPS telemetry > 500 meters:
         * Flag 'location_ambiguity' = true.
         * Set 'location' to GPS/Metadata (Safety Anchor).
         * Set 'conflicting_location' to the Spoken Address for human dispatcher review.
         * State clearly in reasoning: "⚠️ LOCATION MISMATCH. Telemetry anchors at [X], Caller states [Y]. Flagged for dispatcher review."
       - Use googleSearch tool to ground Indian landmarks to exact GPS coordinates (lat/lng) when coordinates are missing or approximate.

    4. RESCUE & LOGISTICS HANDOFF:
       - Recommend appropriate Indian disaster response unit:
         * "NDRF_INFLATABLE_BOAT" for deep water / riverine rescue.
         * "FIRE_HYDRAULIC_PLATFORM" for multi-story fire / building collapse.
         * "AMBULANCE_108_ALS" for trauma / toxic inhalation victims.
         * "SDRF_QUICK_RESPONSE" for local cordon and rapid relief.
         * "RECON_DRONE" if location requires visual aerial confirmation.

    5. TACTICAL HUD REASONING (3 BULLETS):
       - Generate exactly 3 short, telegraphic bullet points (MAX 10 words each).
       - Bullet 1: Situation & victim status (e.g., "4 civilians trapped under collapsed structure").
       - Bullet 2: Primary environmental or secondary hazard (e.g., "Gas cylinder rupture risk nearby").
       - Bullet 3: Direct tactical action required (e.g., "Dispatch NDRF rescue cutter & 108 ALS").

    RESPONSE FORMAT (JSON):
    {
       "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
       "category": "String",
       "detected_language": "Hindi" | "English" | "Hinglish",
       "reasoning_trace": "String (Step-by-step reasoning trace)",
       "display_reasoning": ["String", "String", "String"],
       "people_safety": "String",
       "location": { "lat": number, "lng": number, "address": "String" },
       "location_source": "SPOKEN" | "VISUAL_LANDMARK" | "SIGNAL_TRIANGULATION" | "MANUAL_TRACE_REQUIRED" | "GPS_DEFAULT",
       "location_ambiguity": boolean,
       "conflicting_location": { "address": "String", "lat": number, "lng": number, "source": "String" } | null,
       "manual_trace_required": boolean,
       "requires_logistics": boolean,
       "suggested_asset_type": "String",
       "audit_log_entries": [
          { "agent": "Triage", "action": "String", "detail": "String", "timestamp": "ISO String" }
       ]
    }
    `;

    // Construct signal metadata from available location data
    const signalMetadata = incident.signal_metadata || (incident.location ? {
        gps_coords: { lat: incident.location.lat, lng: incident.location.lng },
        cell_tower_address: incident.location.address,
        source: "GPS_TELEMETRY"
    } : "NONE");

    const userPrompt = `
    INCIDENT DATA:
    ID: ${incident.id}
    Type: ${incident.type || "UNKNOWN (analyze raw input)"}
    Signal Metadata (GPS/Cell Tower): ${JSON.stringify(signalMetadata)}
    Description/Alert: ${incident.mission_context || "N/A"}
    Raw Input: ${incident.raw_input.substring(0, 500)}...
    
    Analyze this signal and provide your assessment in JSON format.
    `;

    try {
        const contents: any[] = [{ text: userPrompt }];

        // Detect audio files by extension (supports agentic routing where type is inferred)
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.flac'];
        const isAudioFile = audioExtensions.some(ext => incident.raw_input.toLowerCase().endsWith(ext));

        // Robust audio file loading with production fallback
        if (isAudioFile && incident.raw_input.startsWith("/")) {
            let audioData: string | Buffer = "";
            try {
                const publicPath = path.join(process.cwd(), "public");
                const filePath = path.join(publicPath, incident.raw_input);

                // Determine MIME type based on extension
                const ext = path.extname(incident.raw_input).toLowerCase();
                const mimeTypes: Record<string, string> = {
                    '.mp3': 'audio/mpeg',
                    '.wav': 'audio/wav',
                    '.ogg': 'audio/ogg',
                    '.webm': 'audio/webm',
                    '.m4a': 'audio/mp4',
                    '.flac': 'audio/flac'
                };
                const mimeType = mimeTypes[ext] || 'audio/mpeg';

                // Safety check for Vercel environments
                if (fs.existsSync(filePath)) {
                    audioData = fs.readFileSync(filePath).toString("base64");
                    contents.push({
                        inlineData: {
                            mimeType: mimeType,
                            data: audioData
                        }
                    });
                    console.log(`[TRIAGE] ✅ Attached audio file: ${filePath} (${mimeType})`);
                } else {
                    console.warn(`[Triage] Audio file missing at ${filePath}. Checking alternative paths...`);
                    // File not found in expected location - fail gracefully
                    throw new Error(`File not found: ${incident.raw_input}`);
                }
            } catch (error) {
                console.error("[Triage] Audio load error:", error);
                // Return a graceful fallback that doesn't 500 the page
                return {
                    id: incident.id,
                    priority: "MEDIUM", // Default safety
                    category: "UNCERTAIN",
                    reasoning_trace: "AUDIO FILE LOAD ERROR: The system could not access the raw audio feed for analysis. Manual review required.",
                    thought_signature: "ERROR-NO-SIG",
                    status: "TRIAGED"
                };
            }
        }

        // Helper for cinematic typing effect
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        console.log(`[TRIAGE] Sending request to Gemini (Stream)...`);
        console.log(`[TRIAGE] Payload (truncated):`, JSON.stringify(contents).substring(0, 500) + "...");

        const resultStream = await generateContentStreamWithRetry(ai.models, {
            model: MODELS.TRIAGE,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                tools: [{ googleSearch: {} }], // Enable Grounding for location fallback
                thinkingConfig: {
                    includeThoughts: true,
                    thinkingLevel: ThinkingLevel.HIGH
                },
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        priority: { type: Type.STRING },
                        category: { type: Type.STRING },
                        reasoning_trace: { type: Type.STRING },
                        display_reasoning: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "3 short telegraphic bullet points for HUD. Max 10 words each."
                        },
                        detected_language: { type: Type.STRING },
                        extracted_address: { type: Type.STRING },
                        extracted_lat: { type: Type.NUMBER },
                        extracted_lng: { type: Type.NUMBER },
                        requires_logistics: { type: Type.BOOLEAN },
                        suggested_asset_type: { type: Type.STRING },
                        location: {
                            type: Type.OBJECT,
                            properties: {
                                lat: { type: Type.NUMBER },
                                lng: { type: Type.NUMBER },
                                address: { type: Type.STRING }
                            }
                        },
                        location_source: { type: Type.STRING, enum: ["SPOKEN", "VISUAL_LANDMARK", "SIGNAL_TRIANGULATION", "MANUAL_TRACE_REQUIRED", "UNKNOWN"] },
                        manual_trace_required: { type: Type.BOOLEAN }
                    },
                    required: ["priority", "category", "reasoning_trace", "display_reasoning", "location_source"],
                },
            },
        });

        console.log(`[TRIAGE] Response stream started`);

        let fullText = "";
        let collectedThoughts = "";

        for await (const chunk of resultStream) {
            const parts = chunk.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
                if (part.thought) {
                    collectedThoughts += part.text;
                    if (onThought && part.text) {
                        // CINEMATIC SMOOTHING:
                        // Stream small chunks to force the UI to animate
                        const chunkText = part.text;
                        for (let i = 0; i < chunkText.length; i += 5) {
                            onThought(chunkText.slice(i, i + 5));
                            await delay(15);
                        }
                    }
                } else if (part.text) {
                    fullText += part.text;
                }
            }
        }

        if (!fullText || !fullText.trim()) {
            console.warn("[TRIAGE] Empty response from Gemini.");
            throw new Error("Empty response from Gemini (Triage Analysis Failed)");
        }

        const rawText = fullText;
        console.log(`[TRIAGE] Raw text: \n${rawText.substring(0, 500)}...`);

        // Extracted thoughts are now in collectedThoughts variable
        let extractedThoughts = collectedThoughts;

        let result;
        try {
            result = extractAndParseJSON(rawText);
        } catch (parseError: any) {
            console.error("[TRIAGE] JSON Parse Failed. Raw text:", rawText);
            throw new Error(`JSON Parse Failed: ${parseError.message}`);
        }

        // If we extracted genuine thoughts, use them for the "Glass Box" effect but don't overwrite the summary
        if (extractedThoughts.length > 5) {
            console.log("[TRIAGE] Captured internal monologue (thoughts)");
            // We prioritize the model's actual internal monologue if captured
            result.raw_thoughts = extractedThoughts.trim();
        } else {
            console.log("[TRIAGE] No separate thoughts captured, using reasoning_trace fallback");
            result.raw_thoughts = result.reasoning_trace || "Analysis process implicitly handled.";
        }

        // Generate Signed Thought Proof (using the robust fallback in gemini-client)
        const signature = generateThoughtSignature(result.raw_thoughts || result.reasoning_trace);

        console.log(`[TRIAGE] Parsed result: `, result);

        const responseObj: any = {
            priority: result.priority,
            category: result.category,
            reasoning_trace: result.reasoning_trace, // The concise summary from JSON
            display_reasoning: result.display_reasoning || [], // HUD-ready bullet points
            raw_thoughts: result.raw_thoughts,       // The deep thinking process
            thought_signature: signature,
            detected_language: result.detected_language,
            status: "TRIAGED",
            requires_logistics: result.requires_logistics,
            suggested_asset_type: result.suggested_asset_type,
            // These are now handled by the Map Forensics & Conflict block below
            // location_source: result.location_source,
            // manual_trace_required: result.manual_trace_required
        };

        // Map Forensics & Conflict
        responseObj.location_source = result.location_source;

        // Safety: If we have valid seed coordinates, we rarely genuinely need a manual trace unless there's a conflict.
        // If the AI flagged it but we have hard coordinates, suppress the flag so the map button remains clickable.
        const hasHardCoordinates = incident.location && typeof incident.location.lat === 'number' && incident.location.lat !== 0;
        if (hasHardCoordinates && result.manual_trace_required && !result.conflicting_location) {
            console.log("[TRIAGE] 🛡️ Suppressing 'Manual Trace' flag due to valid existing coordinates.");
            responseObj.manual_trace_required = false;
        } else {
            responseObj.manual_trace_required = result.manual_trace_required;
        }
        responseObj.location_ambiguity = result.location_ambiguity;

        if (result.conflicting_location) {
            responseObj.conflicting_location = result.conflicting_location;
        }

        if (result.location) {
            // ROBUST LOCATION MERGE STRATEGY
            // 1. Establish Baselines
            const seedLoc = incident.location;
            const aiLoc = result.location;

            const isSeedValid = seedLoc && typeof seedLoc.lat === 'number' && seedLoc.lat !== 0;
            const isAiValid = aiLoc && typeof aiLoc.lat === 'number' && aiLoc.lat !== 0;

            if (isAiValid) {
                // AI found a specific location with coordinates -> Trust it (it might be a correction)
                // But perform the address quality check from before
                const existingAddress = seedLoc?.address;
                const newAddress = aiLoc.address;

                if (existingAddress && (!newAddress || newAddress === "Unknown Address" || newAddress.includes("lat:") || newAddress.length < 5)) {
                    console.log(`[TRIAGE] Preserving existing address: "${existingAddress}" over new: "${newAddress}"`);
                    aiLoc.address = existingAddress;
                }

                responseObj.location = aiLoc;

            } else if (isSeedValid) {
                // AI returned a location object but with invalid/zero coords, but we have a good seed.
                // IGNORE the AI location entirely to protect the seed.
                console.log(`[TRIAGE] 🛡️ Ignoring AI location (Lat/Lng 0 or missing) in favor of valid Seed Location.`);
                // Do NOT set responseObj.location, letting the spread operator invoke the fallback/preservation
            } else {
                // Both are weak, but maybe AI found an address at least?
                if (aiLoc.address && aiLoc.address !== "Unknown" && aiLoc.address !== "Unknown Address") {
                    responseObj.location = aiLoc; // Accept better-than-nothing address
                }
            }
        } else if (result.extracted_address && result.extracted_lat) {
            // Fallback for older legacy field logic
            console.log(`[TRIAGE] LOCATION FOUND (fallback): ${result.extracted_address} (${result.extracted_lat}, ${result.extracted_lng})`);
            responseObj.location = {
                lat: result.extracted_lat,
                lng: result.extracted_lng,
                address: result.extracted_address
            };
        }

        // Attach Log Entries (These will be stripped by the stream handler but we return them)
        // Actually, Triage returns Partial<Incident>, it doesn't return the raw object with logs.
        // We need to pass these logs out via the onThought/Stream channel or modify the return type.
        // Since we can't easily change the return type without breaking the interface...
        // We will emit them as "audit_log" events via the stream if possible.
        // But `triageIncident` is just a function. The caller `api/coordinate/stream/route.ts` handles the stream.
        // So we should return them in the object, even if they aren't in Incident type?
        // No, Type safety.
        // Let's rely on the AI Generative Output to include them, and we need to pass them back.
        // I will return them in a temporary property property on Incident for now, or use a callback.

        // BETTER APPROACH:
        // The `triageIncident` returns `Partial<Incident>`.
        // I should add `audit_logs` to `Incident` interface temporarily? No.
        // I will add them to the `responseObj` as `_audit_logs` (casted) and the route will pick it up.
        (responseObj as any)._audit_logs = result.audit_log_entries;

        return responseObj;

    } catch (error: any) {
        console.error(`[TRIAGE] ========================================`);
        console.error(`[TRIAGE] ERROR analyzing incident: `, error.message);
        console.error(`[TRIAGE] Error name: `, error.name);
        console.error(`[TRIAGE] Full error: `, error);
        console.error(`[TRIAGE] ========================================`);

        return {
            priority: "HIGH",
            reasoning_trace: `Error in processing: ${error.message}. Defaulting to HIGH priority.`,
            status: "TRIAGED"
        };
    }
}
