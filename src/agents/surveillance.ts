"use server";

import { ai } from "@/lib/gemini-client";
import { MODELS } from "@/lib/constants";
import { type Incident } from "@/lib/types";
import { ThinkingLevel, Type } from "@google/genai";
import fs from "fs";
import path from "path";
import { generateContentStreamWithRetry, extractAndParseJSON } from "@/lib/gemini-utils";

/**
 * PRD §3.3 Frame Sampling — Extracts frames at 2-second intervals from video files.
 * Uses ffmpeg via video-utils when available, falls back to sending full video blob.
 * This manages the Gemini token budget by sending discrete image frames instead of a full video.
 */
async function extractFramesAt2sIntervals(videoPath: string): Promise<{ data: string; mimeType: string }[]> {
    const frames: { data: string; mimeType: string }[] = [];
    try {
        const { extractFrame } = await import("@/lib/video-utils");
        const outputDir = path.join(process.cwd(), ".next", "surveillance_frames");
        
        // Sample frames at 0s, 2s, 4s, 6s, 8s (5 frames — enough for assessment without token bloat)
        const timestamps = ["00:00:00", "00:00:02", "00:00:04", "00:00:06", "00:00:08"];
        
        for (const ts of timestamps) {
            try {
                const framePath = await extractFrame(videoPath, outputDir, ts);
                if (fs.existsSync(framePath)) {
                    const frameData = fs.readFileSync(framePath).toString("base64");
                    frames.push({ data: frameData, mimeType: "image/jpeg" });
                    console.log(`[SURVEILLANCE] ✓ Frame sampled at ${ts}`);
                }
            } catch (frameErr) {
                // Some timestamps may be past end of video — that's OK
                console.log(`[SURVEILLANCE] Frame at ${ts} skipped (past end or error)`);
            }
        }
        
        console.log(`[SURVEILLANCE] Frame Sampling Complete: ${frames.length} frames extracted at 2s intervals (PRD §3.3)`);
    } catch (err) {
        console.warn(`[SURVEILLANCE] Frame sampling unavailable (ffmpeg not installed), falling back to full video mode`);
    }
    return frames;
}

// The Surveillance Agent analyzes drone footage (frames or videos) to assess damage.
export async function analyzeSurveillance(incident: Incident, onThought?: (thought: string) => void): Promise<Partial<Incident>> {
    if (!process.env.GEMINI_API_KEY) {
        console.error("[SURVEILLANCE] GEMINI_API_KEY missing. Cannot proceed with Live Analysis.");
        return {
            flood_level: "Unknown",
            structural_damage: "Unknown",
            reasoning_trace: "System Offline: No AI API Key provided. Live analysis unavailable.",
            display_reasoning: ["System Offline", "API Key Missing", "Check Config"],
            category: "SYSTEM_OFFLINE",
            priority: "LOW",
            status: "TRIAGED"
        };
    }
    console.log(`[SURVEILLANCE] ========================================`);
    console.log(`[SURVEILLANCE] Analyzing drone footage for incident ${incident.id}...`);
    console.log(`[SURVEILLANCE] Using model: ${MODELS.SURVEILLANCE}`);

    // Load the actual video/media file for analysis
    let mediaData = "";
    let mimeType = "video/mp4"; // Default
    let sampledFrames: { data: string; mimeType: string }[] = [];
    let isVideoInput = false;

    if (incident.raw_input.startsWith("/")) {
        const filePath = path.join(process.cwd(), "public", incident.raw_input);
        if (fs.existsSync(filePath)) {
            const fileExtension = path.extname(filePath).toLowerCase();
            const fileData = fs.readFileSync(filePath);
            mediaData = fileData.toString("base64");

            // Map extensions to MIME types
            if (fileExtension === ".mov") {
                mimeType = "video/quicktime";
                isVideoInput = true;
            } else if (fileExtension === ".mp4") {
                mimeType = "video/mp4";
                isVideoInput = true;
            } else if (fileExtension === ".jpg" || fileExtension === ".jpeg") {
                mimeType = "image/jpeg";
            } else if (fileExtension === ".png") {
                mimeType = "image/png";
            }

            console.log(`[SURVEILLANCE] Loaded media: ${filePath} (${(fileData.length / 1024 / 1024).toFixed(2)} MB)`);

            // PRD §3.3: Frame Sampling at 2-second intervals for video inputs
            if (isVideoInput) {
                console.log(`[SURVEILLANCE] PRD §3.3: Attempting frame sampling (1 frame/2s)...`);
                sampledFrames = await extractFramesAt2sIntervals(filePath);
            }
        } else {
            console.error(`[SURVEILLANCE] File not found: ${filePath}`);
            throw new Error(`Video file not found at path: ${incident.raw_input}`);
        }
    } else {
        mediaData = incident.raw_input.replace(/^data:video\/\w+;base64,/, "");
    }

    const systemInstruction = `
    You are an AI Surveillance Officer for ResQBharat — India's Autonomous Emergency Intelligence System.
    You are analyzing simulated drone video streams, CCTV feeds, and photographic evidence from disaster zones across India.

    ANALYSIS TASKS:
    1. VISUAL FORENSICS & GEOSPATIAL CLUES:
       - If coordinates are MISSING or uncertain, analyze video frames for visual landmarks: Indian street signboards, highway markers (NH/SH), Hindi/regional signage, state transport buses, riverbanks (Yamuna, Mithi, Ganga), bridge structures, or prominent architectural features.
       - Use Google Search Grounding (if available) to corroborate visual landmarks with real-world Indian coordinates.
       - Output the inferred location in 'extracted_address', 'extracted_lat', 'extracted_lng'.
       - Set 'location_source' to "VISUAL_LANDMARK".
    
    2. DAMAGE & FLOOD SEVERITY ASSESSMENT:
       - Estimate flood inundation depth against physical references (tire level = 0.5m, waist level = 1m, first floor ceiling = 3m+).
       - Evaluate structural integrity (partial facade collapse, compromised load-bearing pillars, roof washouts).
       - Identify trapped or stranded citizens on rooftops, balconies, or stranded vehicles.

    3. AUTHENTICITY & RECIRCULATION CHECK:
       - Scrutinize visual indicators of outdated, sensationalized, or re-circulated social media video (e.g. past monsoon timestamps, mismatched seasons/weather, foreign vehicle models).
       - If suspected to be fake, historical, or unrelated to the current disaster event, set is_authentic = false and priority = LOW.

    4. TACTICAL HUD BULLETS (3 BULLETS):
       - Generate exactly 3 telegraphic bullet points (MAX 10 words each) for the Tactical Commander HUD.
       - Format: Damage Assessment • Threat Level • Recommended Unit.
       - Example:
         • "Yamuna water level breaching ring road parapet"
         • "Inundation reaching 1.8m — 6 civilians stranded"
         • "Deploy NDRF motorboat team for immediate evacuation"

    USER OVERRIDE PROTOCOL:
    - If user context includes verified location updates, prioritize verified ground truth and reflect in extracted location fields.
    
    PRIORITY BRAKE:
    - Fakes / unverified viral clips: LOW priority.
    - Plausible but unconfirmed visuals: MEDIUM priority, request field reconnaissance.
    - Verified life-threatening danger visible in real-time frames: CRITICAL priority.
    `;

    const userPrompt = `
    TACTICAL CONTEXT:
    ID: ${incident.id}
    Location: ${incident.location.address}
    Description/Alert: ${incident.mission_context || "N/A"}
    
    Analyze the attached media feed.
    `;

    // RETRY WRAPPER
    let lastError: any;
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[SURVEILLANCE] Sending request to Gemini (Stream) - Attempt ${attempt}/${MAX_RETRIES}...`);

            // PRD §3.3: Use sampled frames when available, otherwise send full video blob
            let contents: any[];
            if (sampledFrames.length > 0) {
                console.log(`[SURVEILLANCE] Using ${sampledFrames.length} sampled frames (PRD §3.3 Frame Sampling active)`);
                contents = [
                    { text: userPrompt },
                    ...sampledFrames.map((frame, idx) => ({
                        inlineData: {
                            mimeType: frame.mimeType,
                            data: frame.data
                        }
                    }))
                ];
            } else {
                console.log(`[SURVEILLANCE] Using full video blob (frame sampling not available)`);
                contents = [
                    { text: userPrompt },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: mediaData
                        }
                    }
                ];
            }

            const resultStream = await generateContentStreamWithRetry(ai.models, {
                model: MODELS.SURVEILLANCE,
                contents: contents,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            flood_level: { type: Type.STRING },
                            structural_damage: { type: Type.STRING },
                            people_count_estimate: { type: Type.NUMBER },
                            reasoning_trace: { type: Type.STRING },
                            display_reasoning: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: "3 short telegraphic bullet points for HUD. Max 10 words each."
                            },
                            extracted_address: { type: Type.STRING, description: "Identified visual landmark address or null." },
                            extracted_lat: { type: Type.NUMBER },
                            extracted_lng: { type: Type.NUMBER },
                            category: { type: Type.STRING },
                            people_safety: { type: Type.STRING },
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
                            location_source: { type: Type.STRING, enum: ["VISUAL_LANDMARK", "UNKNOWN"] },
                            is_authentic: { type: Type.BOOLEAN },
                            priority: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }
                        },
                        required: ["flood_level", "structural_damage", "reasoning_trace", "display_reasoning", "category", "requires_logistics", "is_authentic", "priority"],
                    },
                    tools: [{ googleSearch: {} }],
                    thinkingConfig: {
                        includeThoughts: true,
                        thinkingLevel: ThinkingLevel.HIGH
                    }
                },
            });

            // Helper for cinematic typing effect
            const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

            let fullText = "";
            let collectedThoughts = "";

            for await (const chunk of resultStream) {
                const parts = chunk.candidates?.[0]?.content?.parts || [];
                for (const part of parts) {
                    if (part.thought) {
                        collectedThoughts += part.text;
                        if (onThought && part.text) {
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
                console.warn(`[SURVEILLANCE] Empty response from Gemini (Attempt ${attempt}).`);
                if (attempt < MAX_RETRIES) {
                    await new Promise(r => setTimeout(r, 2000 * attempt)); // Backoff
                    continue; // Retry
                }
                throw new Error("Empty response from Gemini (Video Analysis Failed)");
            }

            console.log(`[SURVEILLANCE] Raw text: ${fullText.substring(0, 200)}...`);

            let result;
            try {
                result = extractAndParseJSON(fullText);
            } catch (e: any) {
                console.error(`[SURVEILLANCE] JSON Parsing failed:`, e.message);
                if (attempt < MAX_RETRIES) continue; // Retry on malformed JSON
                throw new Error(`Failed to parse surveillance response: ${e.message}`);
            }

            // Store raw thoughts in custom field
            (result as any).raw_thoughts = collectedThoughts.trim() || result.reasoning_trace;

            console.log(`[SURVEILLANCE] Result for ${incident.id}: Flood ${result.flood_level}, Damage: ${result.structural_damage}`);

            // Primary source: AI determined priority
            let calculatedPriority = (result.priority || "LOW").toUpperCase();

            // Safety override: If AI flagged as fake, force LOW
            if (result.is_authentic === false) {
                console.log(`[SURVEILLANCE] 🛡️ AUTHENTICITY CHECK FAILED. Downgrading to LOW.`);
                calculatedPriority = "LOW";
            }

            // Secondary verification: Human Factor
            if (result.is_authentic !== false) {
                const peopleCount = result.people_count_estimate || 0;
                const safety = (result.people_safety || "").toLowerCase();

                if (peopleCount > 0) {
                    if (safety.includes("danger") || safety.includes("trapped") || safety.includes("injured") || safety.includes("critical")) {
                        calculatedPriority = "CRITICAL";
                    } else if (calculatedPriority === "LOW") {
                        calculatedPriority = "MEDIUM";
                        result.requires_logistics = true;
                        result.suggested_asset_type = "RECON_DRONE";
                    }
                }
            }

            console.log(`[SURVEILLANCE] Assigned Priority: ${calculatedPriority}`);
            console.log(`[SURVEILLANCE] ========================================`);

            const responseObj: Partial<Incident> = {
                flood_level: result.flood_level,
                structural_damage: result.structural_damage,
                reasoning_trace: result.reasoning_trace,
                display_reasoning: result.display_reasoning || [], // HUD-ready bullet points
                category: result.category || "Surveillance Alert",
                priority: calculatedPriority as any,
                status: "TRIAGED",
                requires_logistics: result.requires_logistics,
                suggested_asset_type: result.suggested_asset_type,
                people_safety: result.people_safety,
                location_source: result.location_source
            };

            if (result.extracted_address && result.extracted_lat && result.extracted_lng) {
                console.log(`[SURVEILLANCE] 📍 VISUAL FORENSICS SUCCESS: Found ${result.extracted_address}`);
                responseObj.location = {
                    lat: result.extracted_lat,
                    lng: result.extracted_lng,
                    address: result.extracted_address
                };
            }

            return responseObj;

        } catch (error: any) {
            console.error(`[SURVEILLANCE] Error analyzing frame (Attempt ${attempt}):`, error.message);
            lastError = error;
            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 2000 * attempt));
            }
        }
    }

    // FINAL FALLBACK after retries fail
    console.error(`[SURVEILLANCE] All attempts failed.`);
    return {
        flood_level: "Unknown",
        structural_damage: `Analysis Failed: ${lastError?.message || "Unknown error"}`,
        reasoning_trace: `Error: ${lastError?.message}. Video could not be processed.`
    };
}
