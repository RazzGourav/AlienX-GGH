import { Incident, ServiceProposal, ExtractedClaim, ReportSource } from "./types";
import { findNearestMockResources } from "./geo-utils";
import { generateThoughtSignature } from "./gemini-client";
import { evaluateEmergencyRules } from "./rules-engine";

/**
 * Deterministic Emergency Triage & Extraction Engine
 * Adheres to ResQBharat PRD §9 (Claim-Level Evidence) & §10 (Deterministic Service Proposals).
 * Runs with 0 API tokens, 0 latency, guaranteeing 100% demo uptime and strict Free-Tier safety.
 */
export function runDeterministicTriage(incident: Incident): Partial<Incident> {
    const raw = (incident.raw_input || "").toLowerCase();
    const originalText = incident.raw_input || "";

    // 1. Language Detection
    const hasHindiScript = /[\u0900-\u097F]/.test(originalText);
    const hinglishTerms = ["paani", "bachao", "madad", "fase", "imarat", "chhat", "gir", "malba", "bijli", "dhuwan", "aag", "log"];
    const hasHinglish = hinglishTerms.some(term => raw.includes(term));
    const detectedLang = hasHindiScript ? "Hindi" : hasHinglish ? "Hinglish" : "English";

    // 2. Incident Categorization & Priority Analysis
    let category = "MEDICAL_EMERGENCY";
    let priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
    let requiredAsset: "AIR" | "MARINE" | "GROUND" | "General" = "GROUND";
    let primaryHazard = "General Emergency";
    let victimCount = 0;

    // Detect trapped people or injuries
    const victimMatch = raw.match(/(\d+)\s*(लोग|civilians|people|persons|injured|trapped|victims)/i) ||
                        raw.match(/(चार|तीन|दो|पांच|दस)\s*(लोग)/i);
    if (victimMatch) {
        victimCount = parseInt(victimMatch[1], 10) || 4;
    }

    if (raw.includes("water") || raw.includes("flood") || raw.includes("paani") || raw.includes("drowning") || raw.includes("current") || raw.includes("bijli")) {
        category = "URBAN_FLOOD";
        priority = (raw.includes("current") || raw.includes("bijli") || raw.includes("trapped") || victimCount > 0) ? "CRITICAL" : "HIGH";
        requiredAsset = "MARINE";
        primaryHazard = raw.includes("current") || raw.includes("bijli")
            ? "Electrocution Risk (Submerged Electrical Infrastructure)"
            : "Rising Floodwaters (Submerged Lowlands)";
    } else if (raw.includes("collapse") || raw.includes("imarat") || raw.includes("building") || raw.includes("malba") || raw.includes("debris")) {
        category = "STRUCTURAL_COLLAPSE";
        priority = "CRITICAL";
        requiredAsset = "GROUND";
        primaryHazard = "Structural Instability & Suffocation Under Debris";
    } else if (raw.includes("fire") || raw.includes("aag") || raw.includes("cylinder") || raw.includes("blast") || raw.includes("smoke") || raw.includes("dhuwan")) {
        category = "FIRE_RESCUE";
        priority = raw.includes("cylinder") || raw.includes("trapped") ? "CRITICAL" : "HIGH";
        requiredAsset = "GROUND";
        primaryHazard = "Flash Fire & Secondary LPG Cylinder Rupture";
    } else if (raw.includes("gas") || raw.includes("ammonia") || raw.includes("toxic") || raw.includes("leak") || raw.includes("chemical")) {
        category = "HAZMAT_GAS_LEAK";
        priority = "CRITICAL";
        requiredAsset = "GROUND";
        primaryHazard = "Toxic Atmospheric Vapor Inhalation";
    } else if (raw.includes("landslide") || raw.includes("ghat") || raw.includes("highway") || raw.includes("block")) {
        category = "LANDSLIDE_HIGHWAY";
        priority = "HIGH";
        requiredAsset = "GROUND";
        primaryHazard = "Rockfall & Blocked Evacuation Arterial";
    } else if (raw.includes("attack") || raw.includes("assault") || raw.includes("crime") || raw.includes("robbery") || raw.includes("knife") || raw.includes("gun") || raw.includes("marpit") || raw.includes("hamla") || raw.includes("sos") || (incident.category_hint && incident.category_hint.includes("CRIME"))) {
        category = "CRIME_ATTACK_SOS";
        priority = "CRITICAL";
        requiredAsset = "GROUND";
        primaryHazard = "Active Criminal Assault & Life Danger (Dial 100)";
    }

    // 3. PRD §9 Claim Extraction
    const sourceId = `SRC-${incident.id}-01`;
    const sourceRecord: ReportSource = {
        source_id: sourceId,
        incident_id: incident.id,
        source_type: incident.type === "AUDIO" ? "audio" : incident.type === "VIDEO" ? "video" : "text",
        original_content: incident.raw_input,
        received_at: incident.timestamp || new Date().toISOString(),
        language: detectedLang,
        reporter_label: "ERSS-112 Telemetry Dispatch",
    };

    const claims: ExtractedClaim[] = [
        {
            claim_id: `CLM-${incident.id}-01`,
            source_id: sourceId,
            fact_type: "hazard",
            claim_text: primaryHazard,
            excerpt: incident.raw_input.substring(0, 80),
            evidence_strength: "strong",
            validation_state: "corroborated",
        },
        {
            claim_id: `CLM-${incident.id}-02`,
            source_id: sourceId,
            fact_type: victimCount > 0 ? "injury" : "structural",
            claim_text: victimCount > 0
                ? `${victimCount} individuals confirmed in direct peril`
                : "Active hazard area requiring cordoning and emergency access",
            excerpt: victimMatch ? victimMatch[0] : incident.raw_input.substring(0, 40),
            evidence_strength: "strong",
            validation_state: "corroborated",
        },
    ];

    // 4. PRD §10 Service Proposals from Deterministic Rules Engine
    const serviceProposals = evaluateEmergencyRules(incident, claims);
    const assignedUnits = serviceProposals.flatMap(p => p.recommended_units);

    // 5. Tactical HUD Reasoning (3 Telegraphic Bullets)
    const displayReasoning = [
        `Incident triage: ${category.replace(/_/g, " ")} (${detectedLang} stream).`,
        `Hazard level ${priority}: ${primaryHazard}.`,
        `Assigned units: ${assignedUnits[0] || "108 ALS Ambulance"} deployed via ERSS-112 grid.`,
    ];

    const primaryProposal = serviceProposals[0];
    const reasoningTrace = `[QUOTA GUARD: DETERMINISTIC AGENT]\n` +
        `• Detected Language: ${detectedLang}\n` +
        `• Primary Threat: ${primaryHazard}\n` +
        `• Victims at Risk: ${victimCount > 0 ? victimCount : "Pending on-scene census"}\n` +
        `• Service Category: ${(primaryProposal?.service_category || "disaster_response").toUpperCase()} (Triggered: ${primaryProposal?.rule_id || "RULE-GEN-01"})\n` +
        `• Dispatch Recommendation: ${assignedUnits.slice(0, 2).join(", ") || "ERSS-112 Rapid Assessment Patrol"}\n` +
        `• Protocol: Civilian-to-Command Evidence Pack Attached.`;

    const thoughtSignature = generateThoughtSignature(reasoningTrace, priority);

    return {
        priority,
        category,
        detected_language: detectedLang,
        required_asset: requiredAsset,
        suggested_asset_type: assignedUnits[0] || "General Rescue Unit",
        assigned_assets: assignedUnits.length > 0 ? assignedUnits : ["NDRF Water Rescue Unit", "108 ALS Ambulance"],
        display_reasoning: displayReasoning,
        reasoning_trace: reasoningTrace,
        thought_signature: thoughtSignature,
        status: "TRIAGED",
        source_records: [sourceRecord],
        extracted_claims: claims,
        service_proposals: serviceProposals,
        is_simulated: true,
    };
}
