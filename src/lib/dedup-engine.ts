import { Incident, ConflictRecord } from "./types";
import { calculateHaversineDistanceKm } from "./geo-utils";

export interface DuplicateCandidateMatch {
    incident_id: string;
    target_incident: Incident;
    match_score: number; // 0.0 to 1.0
    reasons: string[];
    status: "candidate" | "confirmed_merged" | "dismissed";
}

export interface DedupAnalysisResult {
    is_potential_duplicate: boolean;
    primary_candidate_id?: string;
    candidate_matches: DuplicateCandidateMatch[];
    conflicts: ConflictRecord[];
}

// Distance threshold for local emergencies (500 meters)
export const DEDUP_DISTANCE_THRESHOLD_KM = 0.5;

// Time threshold in seconds (15 minutes = 900 seconds)
export const DEDUP_TIME_WINDOW_SECONDS = 900;

/**
 * Extracts key landmark and location words for textual similarity
 */
function extractKeywords(text: string): Set<string> {
    const stopWords = new Set(["the", "and", "near", "pass", "mein", "hai", "ko", "se", "par", "ke", "ki", "ka", "emergency", "help", "madad", "please"]);
    const words = (text || "")
        .toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));
    return new Set(words);
}

/**
 * Calculates Jaccard similarity between two sets of words
 */
function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
        if (setB.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
}

/**
 * Detects contradictory claims between two related incident reports (PRD §9).
 */
export function detectConflicts(
    primary: Incident,
    candidate: Incident
): ConflictRecord[] {
    const conflicts: ConflictRecord[] = [];

    // 1. Injury / Victim Count Discrepancy
    const extractCount = (str: string): number | null => {
        const m = str.match(/\b(\d+)\s*(people|civilians|log|लोग|injured|trapped|victims)\b/i);
        return m ? parseInt(m[1], 10) : null;
    };

    const countA = extractCount(primary.raw_input || "");
    const countB = extractCount(candidate.raw_input || "");

    if (countA !== null && countB !== null && countA !== countB) {
        conflicts.push({
            field: "injuries",
            description: `Victim count discrepancy between reports: ${countA} vs ${countB}`,
            status: "unresolved",
            variants: [
                {
                    source_id: `SRC-${primary.id}`,
                    value: `${countA} victims`,
                    label: `Initial report (${primary.id})`,
                },
                {
                    source_id: `SRC-${candidate.id}`,
                    value: `${countB} victims`,
                    label: `Corroborating report (${candidate.id})`,
                },
            ],
        });
    }

    // 2. Priority / Severity Discrepancy
    if (primary.priority && candidate.priority && primary.priority !== candidate.priority) {
        const priorityRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const diff = Math.abs((priorityRank[primary.priority] || 0) - (priorityRank[candidate.priority] || 0));
        if (diff >= 2) {
            conflicts.push({
                field: "severity",
                description: `Severity assessment gap: ${primary.priority} vs ${candidate.priority}`,
                status: "unresolved",
                variants: [
                    {
                        source_id: `SRC-${primary.id}`,
                        value: primary.priority,
                        label: `Initial classification`,
                    },
                    {
                        source_id: `SRC-${candidate.id}`,
                        value: candidate.priority,
                        label: `New signal classification`,
                    },
                ],
            });
        }
    }

    // 3. Location Landmark Discrepancy
    const addrA = primary.location?.address || "";
    const addrB = candidate.location?.address || "";
    if (addrA && addrB && addrA.toLowerCase() !== addrB.toLowerCase()) {
        const dist = (primary.location && candidate.location)
            ? calculateHaversineDistanceKm(primary.location.lat, primary.location.lng, candidate.location.lat, candidate.location.lng)
            : 0;

        if (dist > 0.2) {
            conflicts.push({
                field: "location",
                description: `Differing spoken landmark addresses separated by ~${dist} km`,
                status: "unresolved",
                variants: [
                    {
                        source_id: `SRC-${primary.id}`,
                        value: addrA,
                        label: `Reported location A`,
                    },
                    {
                        source_id: `SRC-${candidate.id}`,
                        value: addrB,
                        label: `Reported location B`,
                    },
                ],
            });
        }
    }

    return conflicts;
}

/**
 * Evaluates an incoming incident against existing active incidents to identify potential duplicates.
 * Implements PRD §10: Spatio-temporal candidate deduplication.
 */
export function evaluateDuplicateCandidates(
    incomingIncident: Incident,
    existingIncidents: Incident[]
): DedupAnalysisResult {
    const candidateMatches: DuplicateCandidateMatch[] = [];
    let detectedConflicts: ConflictRecord[] = [];

    const inLat = incomingIncident.location?.lat;
    const inLng = incomingIncident.location?.lng;
    const inKeywords = extractKeywords(incomingIncident.raw_input + " " + (incomingIncident.location?.address || ""));

    // Parse incoming timestamp
    const inTime = typeof incomingIncident.timestamp === "number"
        ? incomingIncident.timestamp
        : new Date(incomingIncident.timestamp || Date.now()).getTime() / 1000;

    for (const existing of existingIncidents) {
        // Skip self
        if (existing.id === incomingIncident.id) continue;

        // Skip resolved incidents
        if (existing.status === "RESOLVED") continue;

        const exLat = existing.location?.lat;
        const exLng = existing.location?.lng;

        if (inLat === undefined || inLng === undefined || exLat === undefined || exLng === undefined) {
            continue;
        }

        // 1. Distance Calculation (Haversine)
        const distanceKm = calculateHaversineDistanceKm(inLat, inLng, exLat, exLng);
        const distanceThreshold = (incomingIncident.category === "URBAN_FLOOD" || existing.category === "URBAN_FLOOD") ? 1.5 : DEDUP_DISTANCE_THRESHOLD_KM;

        if (distanceKm > distanceThreshold) {
            continue; // Too far to be duplicate
        }

        // 2. Temporal Distance Calculation
        const exTime = typeof existing.timestamp === "number"
            ? existing.timestamp
            : new Date(existing.timestamp || Date.now()).getTime() / 1000;
        const timeDiffSeconds = Math.abs(inTime - exTime);

        // 3. Category & Text Similarity
        const exKeywords = extractKeywords(existing.raw_input + " " + (existing.location?.address || ""));
        const textSimilarity = calculateJaccardSimilarity(inKeywords, exKeywords);

        const categoryMatch = (incomingIncident.category && existing.category && incomingIncident.category === existing.category);

        // 4. Weighted Match Score
        // Distance weight: 40%, Time weight: 25%, Category weight: 20%, Text overlap: 15%
        const distanceScore = Math.max(0, 1 - distanceKm / distanceThreshold);
        const timeScore = Math.max(0, 1 - Math.min(timeDiffSeconds, DEDUP_TIME_WINDOW_SECONDS) / DEDUP_TIME_WINDOW_SECONDS);
        const categoryScore = categoryMatch ? 1.0 : 0.3;
        const score = (distanceScore * 0.40) + (timeScore * 0.25) + (categoryScore * 0.20) + (textSimilarity * 0.15);

        if (score >= 0.55) {
            const reasons: string[] = [
                `Proximity: ~${distanceKm} km apart (within ${distanceThreshold} km cluster threshold)`,
                `Temporal: Logged within ${Math.round(timeDiffSeconds)}s of original signal`,
            ];

            if (categoryMatch) {
                reasons.push(`Incident category match: ${existing.category}`);
            }
            if (textSimilarity > 0.1) {
                reasons.push(`Common landmark/keyword patterns detected`);
            }

            candidateMatches.push({
                incident_id: existing.id,
                target_incident: existing,
                match_score: Math.round(score * 100) / 100,
                reasons,
                status: "candidate",
            });

            // Surface any conflicting data
            const conflicts = detectConflicts(existing, incomingIncident);
            if (conflicts.length > 0) {
                detectedConflicts = detectedConflicts.concat(conflicts);
            }
        }
    }

    // Sort candidates by match score descending
    candidateMatches.sort((a, b) => b.match_score - a.match_score);

    const isPotentialDuplicate = candidateMatches.length > 0;
    const primaryCandidateId = isPotentialDuplicate ? candidateMatches[0].incident_id : undefined;

    return {
        is_potential_duplicate: isPotentialDuplicate,
        primary_candidate_id: primaryCandidateId,
        candidate_matches: candidateMatches,
        conflicts: detectedConflicts,
    };
}
