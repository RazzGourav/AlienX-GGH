export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type SourceType = "text" | "transcript" | "image" | "audio" | "video" | "public_web_context";

export type ServiceCategory = "medical" | "police_traffic" | "police_crime" | "fire_rescue" | "disaster_response";

export interface CitizenProfile {
    google_id?: string;
    name: string;
    email: string;
    photo_url?: string;
    avatar?: string;
    phone?: string;
    emergency_contact?: string;
}

export interface CitizenReportPayload {
    id?: string;
    signal_type: "SOS" | "AUDIO" | "IMAGE" | "TEXT";
    citizen: CitizenProfile;
    location: {
        lat: number;
        lng: number;
        address?: string;
        accuracy?: number;
    };
    category_hint?: "CRIME_ATTACK" | "MEDICAL" | "FIRE" | "FLOOD_DISASTER" | "WOMEN_SAFETY" | "GENERAL_SOS";
    description?: string;
    media_base64?: string;
    media_mime_type?: string;
    timestamp: string;
    is_live_citizen: boolean;
}

export type ApprovalState = "draft" | "awaiting_review" | "approved_for_simulation" | "simulated_assigned" | "rejected" | "closed";

/**
 * PRD §9: Raw evidence source record.
 * Keeps raw input and interpreted facts separate.
 */
export interface ReportSource {
    source_id: string;
    incident_id?: string;
    source_type: SourceType;
    original_content: string; // Original text, audio URL, or image data
    received_at: string;
    language?: string; // "hi" | "en" | "mixed" | string
    reporter_label?: string; // e.g. "Bystander #1", "ERSS-112 Caller"
}

/**
 * PRD §9: Atomic extracted fact linked to supporting evidence.
 */
export interface ExtractedClaim {
    claim_id: string;
    source_id: string;
    fact_type: "hazard" | "injury" | "location" | "structural" | "time" | "general";
    claim_text: string;
    excerpt?: string; // Short verbatim quote or observation from source
    evidence_strength: "strong" | "partial" | "needs_review";
    validation_state: "unverified" | "corroborated" | "conflicted";
}

/**
 * PRD §9: Surfaced conflict across contradictory reports.
 */
export interface ConflictRecord {
    field: "location" | "injuries" | "severity" | "timing";
    description: string;
    variants: {
        source_id: string;
        value: string;
        label: string;
    }[];
    status: "unresolved" | "operator_resolved";
    resolved_value?: string;
}

/**
 * PRD §10: Deterministic service proposal with rule triggers.
 */
export interface ServiceProposal {
    service_category: ServiceCategory;
    rule_id: string;
    rationale: string;
    recommended_units: string[];
    operator_status: "proposed" | "approved" | "modified" | "rejected";
    matched_mock_unit_id?: string;
    estimated_distance_km?: number;
}

/**
 * PRD §8 & §12: Seeded simulated emergency station & resource.
 */
export interface MockStation {
    id: string;
    name: string;
    service_type: ServiceCategory;
    location: {
        lat: number;
        lng: number;
        address: string;
    };
    contact: string;
    jurisdiction: string;
    units: MockUnit[];
    is_simulated: true;
    watermark: string;
}

export interface MockUnit {
    unit_id: string;
    station_id: string;
    unit_name: string;
    unit_type: string; // e.g. "108 ALS Ambulance", "NDRF Inflatable Boat", "Fire Water Tender"
    service_category: ServiceCategory;
    status: "AVAILABLE" | "DISPATCHED" | "EN_ROUTE" | "ON_SCENE" | "MAINTENANCE";
    assigned_incident_id?: string | null;
    capabilities: string[];
    is_simulated: true;
}

/**
 * PRD §8 & §14: Chronological audit timeline event.
 */
export interface AuditTimelineEvent {
    event_id: string;
    incident_id: string;
    timestamp: string;
    event_type:
        | "REPORT_INGESTED"
        | "EXTRACTION_COMPLETE"
        | "DUPLICATE_LINKED"
        | "RULE_TRIGGERED"
        | "OPERATOR_EDIT"
        | "PROPOSAL_APPROVED"
        | "PROPOSAL_REJECTED"
        | "UNIT_DISPATCHED";
    actor: "COORDINATOR" | "TRIAGE" | "SURVEILLANCE" | "LOGISTICS" | "OPERATOR" | "SYSTEM";
    description: string;
    metadata?: Record<string, any>;
}

/**
 * Core Unified Incident Record (Supports both existing components and PRD §9 specifications)
 */
export interface Incident {
    id: string;
    type?: "AUDIO" | "VIDEO" | "TEXT" | "COMMAND" | "IMAGE";
    raw_input: string; // URL or Base64 or Text
    timestamp: string;
    location: {
        lat: number;
        lng: number;
        address?: string;
    };
    status: "PENDING" | "ANALYZING" | "TRIAGED" | "RESOLVED";

    // Enriched Fields from Agents
    priority?: Priority;
    category?: string;
    reasoning_trace?: string;
    display_reasoning?: string[]; // 3 concise HUD-ready bullet points
    coordinator_trace?: string; // Routing decisions
    thought_signature?: string; // Crypto-audit
    structural_damage?: string; // Surveillance
    flood_level?: string;      // Surveillance
    assigned_assets?: string[]; // Logistics
    mission_context?: string; // Narrative context
    people_safety?: string;
    extracted_address?: string; // Triage
    extracted_lat?: number;
    extracted_lng?: number;
    is_override?: boolean; // Voice of God
    command_intent?: string; // Voice of God
    requires_human_auth?: boolean; // Protocol Zero
    auth_status?: "PENDING" | "APPROVED" | "DENIED"; // Protocol Zero
    auth_timeout_at?: number; // Protocol Zero (Simulation Time target)
    grounding_queries?: string[]; // Google Search terms used
    required_asset?: 'AIR' | 'MARINE' | 'GROUND' | 'General';
    detected_language?: string;

    requires_logistics?: boolean; // Agentic Handoff
    suggested_asset_type?: string;

    // Live Citizen Report Fields
    citizen_reporter?: CitizenProfile;
    is_live_citizen?: boolean;
    citizen_media_preview?: string;
    category_hint?: string;

    // Responder Action Fields
    responder_status?: "PENDING" | "ACKNOWLEDGED" | "EN_ROUTE" | "ON_SCENE" | "RESOLVED";
    acknowledged_at?: string;         // ISO timestamp when acknowledged
    acknowledged_by?: string;         // Unit identifier (e.g., "MARINE-DELTA-01")
    backup_requested?: boolean;       // Flag for backup request
    backup_requested_at?: string;     // ISO timestamp when backup was requested
    verification_status?: "VERIFIED" | "UNVERIFIED" | "HISTORICAL" | "PENDING"; // Grounding check

    // Forensic Fields
    signal_metadata?: {
        cell_tower_id?: string;
        ip_address?: string;
        estimated_radius_meters?: number;
        gps_coords?: { lat: number; lng: number };
        cell_tower_address?: string;
        source?: string;
    };
    location_source?: "SPOKEN" | "VISUAL_LANDMARK" | "SIGNAL_TRIANGULATION" | "MANUAL_TRACE_REQUIRED" | "UNKNOWN" | "GPS_DEFAULT";
    manual_trace_required?: boolean;

    // Conflict Resolution
    location_ambiguity?: boolean;
    conflicting_location?: {
        address: string;
        lat: number;
        lng: number;
        source: string;
    } | null;

    // Voice Context Injection
    transcript_context?: string;

    // ==========================================
    // PRD §9 SPECIFICATIONS: EVIDENCE & COORDINATION
    // ==========================================
    source_ids?: string[];
    source_records?: ReportSource[];
    extracted_claims?: ExtractedClaim[];
    conflicts_list?: ConflictRecord[];
    uncertainties?: string[];
    reported_injuries?: {
        value: string | number;
        source_ids: string[];
    };
    hazards_list?: {
        value: string;
        source_ids: string[];
    }[];
    service_proposals?: ServiceProposal[];
    approval_state?: ApprovalState;
    timeline_events?: AuditTimelineEvent[];
    is_simulated?: boolean;
    duplicate_candidate_of?: string; // If matched as potential duplicate
    duplicate_candidates?: {
        incident_id: string;
        match_score: number;
        reasons: string[];
        status: "candidate" | "confirmed_merged" | "dismissed";
    }[];
}

export interface AgentAuditLog {
    agent: string;
    action: string;
    detail: string;
    timestamp: string;
}

export interface AgentResponse {
    success: boolean;
    data?: Partial<Incident>;
    error?: string;
}

export interface MissionReport {
    report_id: string;
    classification: "OFFICIAL" | "SECRET" | "TOP SECRET";
    incident_period: {
        start: string;
        end: string;
    };
    executive_summary: string;
    operational_metrics: {
        total_signals_processed: number;
        validated_incidents: number;
        critical_alerts: number;
        protocol_zero_interventions: number;
    };
    resource_deployment: {
        air_assets: number;
        marine_assets: number;
        ground_assets: number;
        total_deployments: number;
    };
    geographic_impact: string[];
    situational_assessment: string;
    generated_at: string;
    agent_audit_log?: AgentAuditLog[];
    timeline_events?: AuditTimelineEvent[];
    forensic_claims?: ExtractedClaim[];
    dispatched_manifest?: {
        unit_id: string;
        unit_name: string;
        service_category: string;
        incident_id: string;
        station_name: string;
    }[];
    incidents_log: {
        id: string;
        timestamp: string;
        type: string;
        priority: string;
        status: string;
        category: string;
        location: string;
        assets: string[];
        auth_status: string;
    }[];
}
