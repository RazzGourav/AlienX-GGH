import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
    type Incident,
    type MissionReport,
    type AgentAuditLog,
    type MockStation,
    type ServiceProposal,
    type AuditTimelineEvent,
    type ConflictRecord,
} from "./types";
import mockStationsData from "@/data/mock_stations.json";

interface SimulationState {
    time: number;
    isPlaying: boolean;
    incidents: Incident[];
    logs: string[];
    agentAuditLogs: AgentAuditLog[]; // Detailed Audit Trail
    mockStations: MockStation[];

    setTime: (time: number) => void;
    incrementTime: () => void;
    setIsPlaying: (isPlaying: boolean) => void;
    addIncident: (incident: Incident) => void;
    updateIncident: (id: string, updates: Partial<Incident>) => void;
    addLog: (log: string) => void;
    addAgentAuditLog: (log: AgentAuditLog) => void;
    isMockMode: boolean;
    setIsMockMode: (isMockMode: boolean) => void;
    focusedIncidentId: string | null;
    setFocusedIncidentId: (id: string | null) => void;
    notification: { message: string; type: "error" | "success" | "info" } | null;
    showNotification: (message: string, type?: "error" | "success" | "info") => void;
    isMicAuthorized: boolean;
    setIsMicAuthorized: (authorized: boolean) => void;
    report: MissionReport | null;
    setReport: (report: MissionReport | null) => void;
    isMissionComplete: boolean;
    setIsMissionComplete: (complete: boolean) => void;

    isReportOpen: boolean;
    setIsReportOpen: (isOpen: boolean) => void;

    isGeneratingReport: boolean;
    setIsGeneratingReport: (isGenerating: boolean) => void;

    rawThinkingProcess: string | null;
    setRawThinkingProcess: (content: string | null) => void;

    activeAgent: string | null;
    setActiveAgent: (agent: string | null) => void;
    activeModel: string | null;
    setActiveModel: (model: string | null) => void;

    // Voice Processing State
    isVoiceProcessing: boolean;
    setIsVoiceProcessing: (isProcessing: boolean) => void;

    activeAbortController: AbortController | null;
    setActiveAbortController: (controller: AbortController | null) => void;

    isContinuousMode: boolean;
    setIsContinuousMode: (isContinuousMode: boolean) => void;

    // Real-Time Citizen Ingestion Mode (Isolated from simulation when false)
    isLiveCitizenMode: boolean;
    setIsLiveCitizenMode: (isLiveCitizenMode: boolean) => void;

    // Spotlight Protocol: Parallel processing state
    spotlightId: string | null;
    setSpotlightId: (id: string | null) => void;
    processingBatch: string[];
    setProcessingBatch: (ids: string[]) => void;

    // Active Scenario & Map Center
    activeScenarioId: string | null;
    setActiveScenarioId: (id: string | null) => void;
    activeMapCenter: { lat: number; lng: number; zoom?: number } | null;
    setActiveMapCenter: (center: { lat: number; lng: number; zoom?: number } | null) => void;

    // ==========================================
    // PRD §10 & §12: DISPATCHER ACTIONS
    // ==========================================
    approveServiceProposal: (incidentId: string, ruleId: string) => void;
    rejectServiceProposal: (incidentId: string, ruleId: string, rationale?: string) => void;
    modifyServiceProposal: (incidentId: string, ruleId: string, customUnits: string[]) => void;
    mergeDuplicateIncidents: (primaryId: string, duplicateId: string) => void;
    resolveConflict: (incidentId: string, field: string, resolvedValue: string) => void;

    // Reset function to clear state
    resetSimulation: () => void;
}

// Initial State for resets
const initialState = {
    time: 0,
    isPlaying: false,
    incidents: [] as Incident[],
    logs: [] as string[],
    mockStations: mockStationsData as unknown as MockStation[],
    isMockMode: false,
    focusedIncidentId: null,
    notification: null,
    isMicAuthorized: false,
    report: null,
    isMissionComplete: false,
    isReportOpen: false,
    isGeneratingReport: false,
    rawThinkingProcess: null,
    agentAuditLogs: [] as AgentAuditLog[],
    activeAgent: null,
    activeModel: null,
    isVoiceProcessing: false,
    activeAbortController: null,
    spotlightId: null,
    processingBatch: [] as string[],
    isContinuousMode: false,
    isLiveCitizenMode: false,
    activeScenarioId: "ALL_INDIA" as string | null,
    activeMapCenter: { lat: 21.7679, lng: 78.8718, zoom: 5 } as { lat: number; lng: number; zoom?: number } | null,
};

export const useSimulationStore = create<SimulationState>()(
    persist(
        (set, get) => ({
            ...initialState,
            isContinuousMode: initialState.isContinuousMode,
            setIsContinuousMode: (isContinuousMode) => set({ isContinuousMode }),
            isLiveCitizenMode: initialState.isLiveCitizenMode,
            setIsLiveCitizenMode: (isLiveCitizenMode) => set({ isLiveCitizenMode }),
            agentAuditLogs: initialState.agentAuditLogs,
            activeScenarioId: initialState.activeScenarioId,
            setActiveScenarioId: (id) => set({ activeScenarioId: id }),
            activeMapCenter: initialState.activeMapCenter,
            setActiveMapCenter: (center) => set({ activeMapCenter: center }),

            setTime: (time) => set({ time }),
            incrementTime: () => set((state) => ({ time: state.time + 1 })),
            setIsPlaying: (isPlaying) => set((state) => {
                if (!isPlaying && state.isPlaying) {
                    if (state.activeAbortController) {
                        state.activeAbortController.abort();
                    }
                    return {
                        isPlaying: false,
                        activeAbortController: null,
                        rawThinkingProcess: null,
                        activeAgent: null,
                        activeModel: null,
                        spotlightId: null,
                        processingBatch: [],
                        isVoiceProcessing: false,
                    };
                }
                return { isPlaying };
            }),

            resetSimulation: () => {
                const state = get();
                if (state.activeAbortController) {
                    state.activeAbortController.abort();
                }
                set({
                    ...initialState,
                    isPlaying: false,
                    time: 0,
                    incidents: [],
                    logs: ["[0s] Simulation Reset by Commander. Ready for new scenario."],
                    spotlightId: null,
                    processingBatch: [],
                    rawThinkingProcess: null,
                    activeAgent: null,
                    activeModel: null,
                    report: null,
                    isMissionComplete: false,
                    isGeneratingReport: false,
                });
            },

            addIncident: (incident) => set((state) => ({
                incidents: [...state.incidents, incident],
                logs: [...state.logs, `[${state.time}s] New Signal: ${incident.id}`]
            })),

            updateIncident: (id, updates) => set((state) => ({
                incidents: state.incidents.map((inc) =>
                    inc.id === id ? { ...inc, ...updates } : inc
                )
            })),

            addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),

            addAgentAuditLog: (log) => set((state) => {
                const logs = [...state.agentAuditLogs, log];
                return { agentAuditLogs: logs.slice(-100) };
            }),

            setIsMockMode: (isMockMode) => set({ isMockMode }),
            setFocusedIncidentId: (id) => set({ focusedIncidentId: id }),
            showNotification: (message, type = "info") => {
                set({ notification: { message, type } });
                setTimeout(() => set({ notification: null }), 4000);
            },
            setIsMicAuthorized: (authorized) => set({ isMicAuthorized: authorized }),
            setReport: (report) => set({ report }),
            setIsMissionComplete: (complete) => set({ isMissionComplete: complete }),
            setIsReportOpen: (isOpen) => set({ isReportOpen: isOpen }),
            setIsGeneratingReport: (isGenerating) => set({ isGeneratingReport: isGenerating }),
            setRawThinkingProcess: (content) => set({ rawThinkingProcess: content }),
            setActiveAgent: (agent) => set({ activeAgent: agent }),
            setActiveModel: (model) => set({ activeModel: model }),
            setIsVoiceProcessing: (isProcessing) => set({ isVoiceProcessing: isProcessing }),
            setActiveAbortController: (controller) => set({ activeAbortController: controller }),
            setSpotlightId: (id) => set({ spotlightId: id }),
            setProcessingBatch: (ids) => set({ processingBatch: ids }),

            // ==========================================
            // PRD §10 & §12: DISPATCHER PROPOSAL ACTIONS
            // ==========================================
            approveServiceProposal: (incidentId: string, ruleId: string) => {
                const state = get();
                const incident = state.incidents.find(i => i.id === incidentId);
                if (!incident) return;

                let matchedUnitId: string | undefined;

                const updatedProposals = (incident.service_proposals || []).map(p => {
                    if (p.rule_id === ruleId) {
                        matchedUnitId = p.matched_mock_unit_id;
                        return { ...p, operator_status: "approved" as const };
                    }
                    return p;
                });

                // Update unit status in mockStations from AVAILABLE to DISPATCHED
                const updatedStations = state.mockStations.map(station => ({
                    ...station,
                    units: station.units.map(unit => {
                        if (matchedUnitId && unit.unit_id === matchedUnitId) {
                            return {
                                ...unit,
                                status: "DISPATCHED" as const,
                                assigned_incident_id: incidentId,
                            };
                        }
                        return unit;
                    })
                }));

                const approvalEvent: AuditTimelineEvent = {
                    event_id: `EVT-AUTH-${Date.now()}`,
                    incident_id: incidentId,
                    timestamp: new Date().toISOString(),
                    event_type: "PROPOSAL_APPROVED",
                    actor: "OPERATOR",
                    description: `Dispatcher approved dispatch proposal [${ruleId}]. Unit ${matchedUnitId || "assigned"} transitioned to DISPATCHED.`,
                };

                const timeline = [...(incident.timeline_events || []), approvalEvent];

                set({
                    mockStations: updatedStations,
                    incidents: state.incidents.map(inc =>
                        inc.id === incidentId
                            ? {
                                ...inc,
                                service_proposals: updatedProposals,
                                timeline_events: timeline,
                                approval_state: "approved_for_simulation",
                            }
                            : inc
                    ),
                    logs: [...state.logs, `[${state.time}s] [DISPATCH APPROVED] ${ruleId} -> ${matchedUnitId || "En Route"}`]
                });
            },

            rejectServiceProposal: (incidentId: string, ruleId: string, rationale?: string) => {
                const state = get();
                const incident = state.incidents.find(i => i.id === incidentId);
                if (!incident) return;

                const updatedProposals = (incident.service_proposals || []).map(p => {
                    if (p.rule_id === ruleId) {
                        return {
                            ...p,
                            operator_status: "rejected" as const,
                            rationale: rationale ? `${p.rationale} [REJECTED BY OPERATOR: ${rationale}]` : p.rationale,
                        };
                    }
                    return p;
                });

                const rejectEvent: AuditTimelineEvent = {
                    event_id: `EVT-REJ-${Date.now()}`,
                    incident_id: incidentId,
                    timestamp: new Date().toISOString(),
                    event_type: "PROPOSAL_REJECTED",
                    actor: "OPERATOR",
                    description: `Dispatcher declined proposal [${ruleId}]. ${rationale || "Operational veto."}`,
                };

                set({
                    incidents: state.incidents.map(inc =>
                        inc.id === incidentId
                            ? {
                                ...inc,
                                service_proposals: updatedProposals,
                                timeline_events: [...(inc.timeline_events || []), rejectEvent],
                            }
                            : inc
                    ),
                    logs: [...state.logs, `[${state.time}s] [DISPATCH REJECTED] ${ruleId}`]
                });
            },

            modifyServiceProposal: (incidentId: string, ruleId: string, customUnits: string[]) => {
                const state = get();
                const incident = state.incidents.find(i => i.id === incidentId);
                if (!incident) return;

                const updatedProposals = (incident.service_proposals || []).map(p => {
                    if (p.rule_id === ruleId) {
                        return {
                            ...p,
                            recommended_units: customUnits,
                            operator_status: "modified" as const,
                        };
                    }
                    return p;
                });

                set({
                    incidents: state.incidents.map(inc =>
                        inc.id === incidentId
                            ? { ...inc, service_proposals: updatedProposals }
                            : inc
                    ),
                    logs: [...state.logs, `[${state.time}s] [DISPATCH MODIFIED] ${ruleId} units updated by operator.`]
                });
            },

            mergeDuplicateIncidents: (primaryId: string, duplicateId: string) => {
                const state = get();
                const primary = state.incidents.find(i => i.id === primaryId);
                const duplicate = state.incidents.find(i => i.id === duplicateId);
                if (!primary || !duplicate) return;

                // Merge sources and claims
                const mergedSources = [
                    ...(primary.source_records || []),
                    ...(duplicate.source_records || []),
                ];
                const mergedClaims = [
                    ...(primary.extracted_claims || []),
                    ...(duplicate.extracted_claims || []),
                ];

                const mergeEvent: AuditTimelineEvent = {
                    event_id: `EVT-MERGE-${Date.now()}`,
                    incident_id: primaryId,
                    timestamp: new Date().toISOString(),
                    event_type: "DUPLICATE_LINKED",
                    actor: "OPERATOR",
                    description: `Operator merged duplicate signal [${duplicateId}] into primary incident [${primaryId}]. Evidence consolidated.`,
                };

                // Update duplicate candidates list on primary
                const updatedCandidates = (primary.duplicate_candidates || []).map(c =>
                    c.incident_id === duplicateId ? { ...c, status: "confirmed_merged" as const } : c
                );

                set({
                    incidents: state.incidents.map(inc => {
                        if (inc.id === primaryId) {
                            return {
                                ...inc,
                                source_records: mergedSources,
                                extracted_claims: mergedClaims,
                                duplicate_candidates: updatedCandidates,
                                timeline_events: [...(inc.timeline_events || []), mergeEvent],
                            };
                        }
                        if (inc.id === duplicateId) {
                            return {
                                ...inc,
                                status: "RESOLVED" as const,
                                reasoning_trace: `[CLUSTER MERGED] Evidence consolidated into primary incident ${primaryId}.`,
                                duplicate_candidate_of: primaryId,
                            };
                        }
                        return inc;
                    }),
                    logs: [...state.logs, `[${state.time}s] [CLUSTER MERGED] ${duplicateId} merged into ${primaryId}`]
                });
            },

            resolveConflict: (incidentId: string, field: string, resolvedValue: string) => {
                const state = get();
                const incident = state.incidents.find(i => i.id === incidentId);
                if (!incident) return;

                const updatedConflicts = (incident.conflicts_list || []).map(c =>
                    c.field === field
                        ? { ...c, status: "operator_resolved" as const, resolved_value: resolvedValue }
                        : c
                );

                const conflictEvent: AuditTimelineEvent = {
                    event_id: `EVT-CONF-${Date.now()}`,
                    incident_id: incidentId,
                    timestamp: new Date().toISOString(),
                    event_type: "OPERATOR_EDIT",
                    actor: "OPERATOR",
                    description: `Operator resolved factual conflict on [${field}]: Set to "${resolvedValue}".`,
                };

                set({
                    incidents: state.incidents.map(inc =>
                        inc.id === incidentId
                            ? {
                                ...inc,
                                conflicts_list: updatedConflicts,
                                timeline_events: [...(inc.timeline_events || []), conflictEvent],
                            }
                            : inc
                    ),
                    logs: [...state.logs, `[${state.time}s] [CONFLICT RESOLVED] ${field} set to "${resolvedValue}"`]
                });
            },
        }),
        {
            name: "resqbharat-simulation-store",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                time: state.time,
                isPlaying: state.isPlaying,
                incidents: state.incidents,
                logs: state.logs,
                agentAuditLogs: state.agentAuditLogs,
                isMockMode: state.isMockMode,
                isMissionComplete: state.isMissionComplete,
                report: state.report,
                isContinuousMode: state.isContinuousMode,
                isLiveCitizenMode: state.isLiveCitizenMode,
            }),
        }
    )
);

// Cross-Tab Synchronization
if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
        if (event.key === "resqbharat-simulation-store" && event.newValue) {
            try {
                const newState = JSON.parse(event.newValue);
                const currentState = useSimulationStore.getState();

                const hasChanges =
                    newState.state?.time !== currentState.time ||
                    JSON.stringify(newState.state?.incidents) !== JSON.stringify(currentState.incidents) ||
                    newState.state?.isMissionComplete !== currentState.isMissionComplete;

                if (hasChanges) {
                    setTimeout(() => {
                        useSimulationStore.setState({
                            time: newState.state?.time ?? currentState.time,
                            isPlaying: newState.state?.isPlaying ?? currentState.isPlaying,
                            incidents: newState.state?.incidents ?? currentState.incidents,
                            logs: newState.state?.logs ?? currentState.logs,
                            isMockMode: newState.state?.isMockMode ?? currentState.isMockMode,
                            isMissionComplete: newState.state?.isMissionComplete ?? currentState.isMissionComplete,
                            report: newState.state?.report ?? currentState.report,
                        });
                    }, 0);
                }
            } catch (e) {
                console.warn("[STORE] Failed to parse cross-tab sync data", e);
            }
        }
    });
}
