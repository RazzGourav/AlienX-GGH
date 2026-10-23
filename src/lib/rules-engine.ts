import { Incident, ServiceProposal, ServiceCategory, ExtractedClaim } from "./types";
import { findNearestMockResources } from "./geo-utils";

export interface EmergencyRuleDefinition {
    rule_id: string;
    rule_name: string;
    service_category: ServiceCategory;
    priority_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    description: string;
    appliesTo: (incident: Incident, claims?: ExtractedClaim[]) => {
        matches: boolean;
        confidence: number;
        rationale: string;
        matchedClaimIds?: string[];
    };
}

/**
 * Standard Indian Emergency Response Coordination Rules (PRD §10)
 * Deterministic triggers linking evidence to service dispatches.
 */
export const EMERGENCY_RULES: EmergencyRuleDefinition[] = [
    {
        rule_id: "RULE-POLICE-CRIME-01",
        rule_name: "Police Dial 100 Crime & Physical Assault Interception",
        service_category: "police_crime",
        priority_level: "CRITICAL",
        description: "Dispatches Dial 100 Police PCR Vans, Women Safety Flying Squads, and Tactical QRT units for physical attacks, armed robbery, violence, or SOS alerts.",
        appliesTo: (incident, claims = []) => {
            const raw = (incident.raw_input || "").toLowerCase();
            const categoryHint = (incident.category_hint || "").toLowerCase();
            
            const isCrimeHint = categoryHint.includes("crime") || categoryHint.includes("attack") || categoryHint.includes("women") || categoryHint.includes("sos");
            const isSOS = incident.type === "COMMAND" || raw.includes("sos") || raw.includes("help me") || raw.includes("bachao") || raw.includes("बचाओ");
            const hasViolence = raw.includes("attack") || raw.includes("assault") || raw.includes("marpit") || raw.includes("मारपीट") || raw.includes("hamla") || raw.includes("हमला");
            const hasWeapons = raw.includes("knife") || raw.includes("gun") || raw.includes("chaku") || raw.includes("goli") || raw.includes("weapon") || raw.includes("हथियार");
            const hasCrime = raw.includes("robbery") || raw.includes("thief") || raw.includes("chori") || raw.includes("molest") || raw.includes("threat") || raw.includes("kidnap");
            const hasWomenSafety = raw.includes("stalking") || raw.includes("women safety") || raw.includes("छेड़छाड़") || raw.includes("shakti");

            if (isCrimeHint || isSOS || hasViolence || hasWeapons || hasCrime || hasWomenSafety) {
                let threatDesc = "Citizen SOS distress signal";
                if (hasWeapons) threatDesc = "Armed violence & weapon threat";
                else if (hasWomenSafety) threatDesc = "Women safety emergency & harassment threat";
                else if (hasViolence) threatDesc = "Active physical assault and public violence";
                else if (hasCrime) threatDesc = "Robbery/criminal breach in progress";

                return {
                    matches: true,
                    confidence: 0.98,
                    rationale: `${threatDesc} confirmed. Dispatching Dial 100 PCR Mobile Van and Quick Reaction Team (QRT) for immediate armed interception.`,
                };
            }

            return { matches: false, confidence: 0, rationale: "" };
        },
    },
    {
        rule_id: "RULE-MED-01",
        rule_name: "Critical Trauma & Trapped Victim Dispatch",
        service_category: "medical",
        priority_level: "CRITICAL",
        description: "Dispatches 108 Advanced Life Support ambulances and Trauma Center notifications when injuries or trapped casualties are confirmed.",
        appliesTo: (incident, claims = []) => {
            const raw = (incident.raw_input || "").toLowerCase();
            const injuryClaim = claims.find(c => c.fact_type === "injury");
            
            const hasTrapped = raw.includes("trapped") || raw.includes("दबे") || raw.includes("fase") || raw.includes("मलबे");
            const hasInjured = raw.includes("injured") || raw.includes("ghayal") || raw.includes("घायल") || raw.includes("victim") || Boolean(injuryClaim);
            const hasCasualties = /\b(\d+)\s*(people|civilians|log|लोग|injured|trapped|victims)\b/i.test(raw);
            const hasToxic = raw.includes("gas") || raw.includes("ammonia") || raw.includes("toxic") || raw.includes("suffocat");

            if (hasTrapped || hasInjured || hasCasualties || hasToxic) {
                const countMatch = raw.match(/\b(\d+)\s*(people|civilians|log|लोग|injured|trapped|victims)\b/i);
                const countText = countMatch ? `${countMatch[1]} casualties/trapped victims` : "uncounted casualties";
                return {
                    matches: true,
                    confidence: 0.95,
                    rationale: `Direct medical threat confirmed (${countText}). Initiating 108 ALS triage and District Trauma Center standby.`,
                    matchedClaimIds: injuryClaim ? [injuryClaim.claim_id] : [],
                };
            }

            return { matches: false, confidence: 0, rationale: "" };
        },
    },
    {
        rule_id: "RULE-FIRE-01",
        rule_name: "Structural Collapse & Fire Suppression Cordon",
        service_category: "fire_rescue",
        priority_level: "CRITICAL",
        description: "Dispatches Fire Water Tenders, hydraulic aerial platforms, and heavy rescue cutters for building collapse or fire escalation.",
        appliesTo: (incident, claims = []) => {
            const raw = (incident.raw_input || "").toLowerCase();
            const hazardClaim = claims.find(c => c.fact_type === "hazard");
            const structClaim = claims.find(c => c.fact_type === "structural");

            const isFire = raw.includes("fire") || raw.includes("aag") || raw.includes("आग") || raw.includes("smoke") || raw.includes("cylinder") || raw.includes("blast");
            const isCollapse = raw.includes("collapse") || raw.includes("गिर") || raw.includes("building") || raw.includes("debris") || raw.includes("malba") || raw.includes("मलबे");

            if (isFire || isCollapse) {
                const hazardText = isFire && isCollapse
                    ? "Building collapse accompanied by active fire hazard"
                    : isFire
                    ? "Active fire and secondary LPG cylinder rupture hazard"
                    : "Structural slab collapse requiring heavy hydraulic search and extraction";

                return {
                    matches: true,
                    confidence: 0.96,
                    rationale: `${hazardText}. Mobilizing Fire Service heavy rescue tender and concrete cutters.`,
                    matchedClaimIds: [
                        ...(hazardClaim ? [hazardClaim.claim_id] : []),
                        ...(structClaim ? [structClaim.claim_id] : [])
                    ],
                };
            }

            return { matches: false, confidence: 0, rationale: "" };
        },
    },
    {
        rule_id: "RULE-DISASTER-01",
        rule_name: "Flood & Mass Amphibious Evacuation",
        service_category: "disaster_response",
        priority_level: "HIGH",
        description: "Deploys NDRF/SDRF inflatable boats and swift water rescue units for urban flooding and river submergence.",
        appliesTo: (incident, claims = []) => {
            const raw = (incident.raw_input || "").toLowerCase();
            const hazardClaim = claims.find(c => c.fact_type === "hazard");

            const isFlood = raw.includes("flood") || raw.includes("paani") || raw.includes("पानी") || raw.includes("water") || raw.includes("submerged") || raw.includes("drowning");

            if (isFlood) {
                const hasElectrocution = raw.includes("current") || raw.includes("bijli") || raw.includes("transformer") || raw.includes("तार");
                const hazardText = hasElectrocution
                    ? "Severe urban flooding with submerged live electrical infrastructure (Electrocution Risk)"
                    : "Rising water levels threatening residential cluster";

                return {
                    matches: true,
                    confidence: 0.94,
                    rationale: `${hazardText}. Deploying NDRF Inflatable Boats and swift-water rescue teams.`,
                    matchedClaimIds: hazardClaim ? [hazardClaim.claim_id] : [],
                };
            }

            return { matches: false, confidence: 0, rationale: "" };
        },
    },
    {
        rule_id: "RULE-TRAFFIC-02",
        rule_name: "Arterial Blockage & Green Corridor Enforcement",
        service_category: "police_traffic",
        priority_level: "MEDIUM",
        description: "Engages Traffic Police to establish emergency cordons, clear arterials, and maintain green corridors for responder access.",
        appliesTo: (incident) => {
            const raw = (incident.raw_input || "").toLowerCase();

            const isBlockage = raw.includes("block") || raw.includes("stand") || raw.includes("jam") || raw.includes("road") || raw.includes("highway") || raw.includes("flyover") || raw.includes("chowk");
            const isHighPriority = incident.priority === "CRITICAL" || incident.priority === "HIGH";

            if (isBlockage || isHighPriority) {
                return {
                    matches: true,
                    confidence: 0.90,
                    rationale: `Emergency access route maintenance required. Deploying Traffic Police PCR units for perimeter perimeter cordon and green corridor facilitation.`,
                };
            }

            return { matches: false, confidence: 0, rationale: "" };
        },
    },
];

/**
 * Evaluates an incident against all deterministic emergency rules.
 * PRD §10: Generates evidence-linked service proposals matched with seeded Indian mock units.
 */
export function evaluateEmergencyRules(
    incident: Incident,
    claims: ExtractedClaim[] = []
): ServiceProposal[] {
    const proposals: ServiceProposal[] = [];
    const lat = incident.location?.lat || 28.6139;
    const lng = incident.location?.lng || 77.2090;

    for (const rule of EMERGENCY_RULES) {
        const match = rule.appliesTo(incident, claims);
        if (match.matches) {
            // Find nearest mock units matching the rule's service category
            const nearest = findNearestMockResources(lat, lng, rule.service_category, 2);
            const recommendedUnits = nearest.length > 0
                ? nearest.map(n => `${n.unit.unit_name} (${n.distance_label})`)
                : [
                    rule.service_category === "medical" ? "108 ALS Ambulance (Simulated Est.)" :
                    rule.service_category === "fire_rescue" ? "City Fire Water Tender (Simulated Est.)" :
                    rule.service_category === "disaster_response" ? "NDRF Rescue Boat (Simulated Est.)" :
                    rule.service_category === "police_crime" ? "Dial 100 Police PCR Van (Simulated Est.)" :
                    "Traffic Police PCR Unit (Simulated Est.)"
                ];

            proposals.push({
                service_category: rule.service_category,
                rule_id: rule.rule_id,
                rationale: match.rationale,
                recommended_units: recommendedUnits,
                operator_status: "proposed",
                matched_mock_unit_id: nearest[0]?.unit.unit_id,
                estimated_distance_km: nearest[0]?.distance_km || 1.8,
            });
        }
    }

    // Default proposal if no specific rule matched
    if (proposals.length === 0) {
        const fallbackCategory: ServiceCategory = "disaster_response";
        const nearest = findNearestMockResources(lat, lng, fallbackCategory, 1);
        proposals.push({
            service_category: fallbackCategory,
            rule_id: "RULE-GEN-01",
            rationale: "General emergency triage assessment. Standard ERSS-112 reconnaissance deployed.",
            recommended_units: nearest.length > 0 ? [`${nearest[0].unit.unit_name} (${nearest[0].distance_label})`] : ["ERSS 112 Rapid Assessment Patrol"],
            operator_status: "proposed",
            matched_mock_unit_id: nearest[0]?.unit.unit_id,
            estimated_distance_km: nearest[0]?.distance_km || 2.0,
        });
    }

    return proposals;
}
