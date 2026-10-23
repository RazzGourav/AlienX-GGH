"use client";

import { useEffect, useRef } from "react";
import { useSimulationStore } from "@/lib/store";
import { Incident } from "@/lib/types";

export function useLiveCitizenFeed() {
    const { 
        isLiveCitizenMode, 
        addIncident, 
        addLog, 
        showNotification, 
        setActiveMapCenter,
        setFocusedIncidentId 
    } = useSimulationStore();

    const lastPolledTimeRef = useRef<number>(Date.now());
    const ingestedIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Sync server-side mode on toggle
        const syncServerMode = async () => {
            try {
                const targetMode = isLiveCitizenMode ? "ACTIVE" : "ISOLATED";
                await fetch(`/api/signals/live?set_mode=${targetMode}`);
                console.log(`[CITIZEN HOOK] Synced live ingestion mode: ${targetMode}`);
            } catch (e) {
                console.warn("[CITIZEN HOOK] Could not sync server mode", e);
            }
        };

        syncServerMode();

        // If isolated mode is active, do not poll live signals (guarantee clean simulation demo)
        if (!isLiveCitizenMode) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/signals/live?since=${lastPolledTimeRef.current}`);
                if (!res.ok) return;

                const data = await res.json();
                if (data.signals && Array.isArray(data.signals) && data.signals.length > 0) {
                    for (const signal of data.signals as Incident[]) {
                        if (!ingestedIdsRef.current.has(signal.id)) {
                            ingestedIdsRef.current.add(signal.id);
                            lastPolledTimeRef.current = Math.max(
                                lastPolledTimeRef.current,
                                new Date(signal.timestamp).getTime()
                            );

                            console.log(`[CITIZEN HOOK] Ingesting live signal: ${signal.id}`);
                            addIncident(signal);
                            setFocusedIncidentId(signal.id);

                            const citizenName = signal.citizen_reporter?.name || "Citizen";
                            const isSOS = signal.category_hint === "GENERAL_SOS" || signal.id.includes("SOS");

                            addLog(`[LIVE CITIZEN] 🚨 Distress Signal Ingested: ${signal.id} (${citizenName})`);
                            showNotification(
                                isSOS 
                                    ? `🚨 CITIZEN SOS HIGH ALERT: ${citizenName}!` 
                                    : `📡 Real-Time Distress: ${citizenName}`,
                                isSOS ? "error" : "info"
                            );

                            // Fly map to citizen's GPS coordinates
                            if (signal.location?.lat && signal.location?.lng) {
                                setActiveMapCenter({
                                    lat: signal.location.lat,
                                    lng: signal.location.lng,
                                    zoom: 15,
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                // Silently handle polling disconnect
            }
        }, 1500);

        return () => clearInterval(interval);
    }, [isLiveCitizenMode, addIncident, addLog, showNotification, setActiveMapCenter, setFocusedIncidentId]);
}
