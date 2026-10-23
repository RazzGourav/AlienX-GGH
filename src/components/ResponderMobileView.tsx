"use client";

import React, { useState } from "react";
import { useSimulationStore } from "@/lib/store";
import { type Incident } from "@/lib/types";
import {
    Truck,
    MapPin,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Radio,
    Shield,
    Volume2,
    X,
    Navigation,
    PhoneCall,
    Share2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ResponderMobileViewProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ResponderMobileView({ isOpen, onClose }: ResponderMobileViewProps) {
    const { incidents, updateIncident, addLog, mockStations } = useSimulationStore();

    // Select active dispatched or triaged incidents
    const activeIncidents = incidents.filter(i => i.status !== "RESOLVED").length > 0
        ? incidents.filter(i => i.status !== "RESOLVED")
        : incidents;
    const [selectedIdx, setSelectedIdx] = useState(0);

    if (!isOpen) return null;

    const safeIdx = Math.min(selectedIdx, Math.max(0, activeIncidents.length - 1));
    const currentIncident: Incident | undefined = activeIncidents[safeIdx] || incidents[0];

    const handleUpdateStatus = (status: "EN_ROUTE" | "ON_SCENE" | "RESOLVED") => {
        if (!currentIncident) return;
        updateIncident(currentIncident.id, {
            responder_status: status,
            status: status === "RESOLVED" ? "RESOLVED" : currentIncident.status,
        });
        addLog(`[FIELD UNIT] Unit updated ${currentIncident.id} status to: ${status}`);
    };

    const handleRequestBackup = () => {
        if (!currentIncident) return;
        updateIncident(currentIncident.id, {
            backup_requested: true,
            backup_requested_at: new Date().toISOString(),
        });
        addLog(`[FIELD ALERT] 🚨 Unit at ${currentIncident.id} requested IMMEDIATE BACKUP!`);
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 font-mono">
            {/* Mobile Device Frame */}
            <div className="w-full max-w-sm sm:max-w-md bg-zinc-950 border-2 border-emerald-500/40 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
                {/* Mobile Header / Signal Bar */}
                <div className="bg-zinc-900 border-b border-white/10 p-3 px-4 flex items-center justify-between text-xs shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-bold tracking-widest text-emerald-400 uppercase text-[10px]">
                            FIELD TACTICAL HUD
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-zinc-400 font-mono">ERSS-112 GRID</span>
                        <button
                            onClick={onClose}
                            className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Assigned Unit Identification */}
                <div className="bg-emerald-950/20 border-b border-emerald-500/20 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                            <Truck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-[11px] font-black text-white uppercase tracking-wider">
                                {currentIncident?.assigned_assets?.[0] || "108 ALS AMBULANCE UNIT-01"}
                            </div>
                            <div className="text-[9px] text-zinc-400">
                                Call Sign: ERSS-DL-EAGLE // Command Linked
                            </div>
                        </div>
                    </div>

                    <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded border uppercase",
                        currentIncident?.responder_status === "ON_SCENE"
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                            : currentIncident?.responder_status === "EN_ROUTE"
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    )}>
                        {currentIncident?.responder_status || "DISPATCHED"}
                    </span>
                </div>

                {/* Multi-Incident Switcher Bar */}
                {activeIncidents.length > 1 && (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900/90 border-b border-white/5 overflow-x-auto scrollbar-none">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold shrink-0">TASK:</span>
                        {activeIncidents.map((inc, idx) => (
                            <button
                                key={inc.id}
                                onClick={() => setSelectedIdx(idx)}
                                className={cn(
                                    "px-2 py-1 rounded text-[9px] font-mono font-bold shrink-0 transition-all",
                                    safeIdx === idx
                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm"
                                        : "bg-black/40 text-zinc-500 hover:text-zinc-300 border border-white/5"
                                )}
                            >
                                {inc.id}
                            </button>
                        ))}
                    </div>
                )}

                {/* Scrollable Incident Dossier */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {currentIncident ? (
                        <>
                            {/* Incident Target Header */}
                            <div className="p-3 bg-zinc-900/80 border border-white/10 rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                        INCIDENT: {currentIncident.id}
                                    </span>
                                    <span className={cn(
                                        "text-[9px] font-bold px-2 py-0.5 rounded",
                                        currentIncident.priority === "CRITICAL" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    )}>
                                        {currentIncident.priority || "HIGH"} PRIORITY
                                    </span>
                                </div>

                                <div className="text-white font-bold text-xs uppercase tracking-wide">
                                    {currentIncident.category?.replace(/_/g, " ") || "CIVILIAN DISTRESS CALL"}
                                </div>

                                <div className="text-[11px] text-zinc-300 flex items-start gap-1.5 pt-1">
                                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                                    <span>{currentIncident.location?.address || "Coordinates Transmitted"}</span>
                                </div>
                            </div>

                            {/* Raw Caller Voice / Text Transcript */}
                            <div className="p-3 bg-black/60 border border-white/10 rounded-lg space-y-1.5">
                                <div className="text-[9px] text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Volume2 className="w-3 h-3 text-cyan-400" />
                                    Caller Audio Transcript ({currentIncident.detected_language || "Hindi/English"})
                                </div>
                                <div className="text-[11px] font-sans text-cyan-200 leading-relaxed italic bg-cyan-950/20 p-2.5 rounded border border-cyan-500/20">
                                    "{currentIncident.raw_input}"
                                </div>
                            </div>

                            {/* Verified Factual Claims */}
                            <div className="space-y-1.5">
                                <div className="text-[9px] text-zinc-500 uppercase tracking-widest">
                                    AI Verified Triage Intel (PRD §9)
                                </div>
                                <div className="space-y-1 text-[10px]">
                                    {currentIncident.extracted_claims && currentIncident.extracted_claims.length > 0 ? (
                                        currentIncident.extracted_claims.map((claim, cIdx) => (
                                            <div key={cIdx} className="p-2 bg-zinc-900 border border-white/5 rounded flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                                                <div className="text-zinc-200 font-sans">
                                                    <strong>{claim.fact_type.toUpperCase()}:</strong> {claim.claim_text}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-2 bg-zinc-900 border border-white/5 rounded text-zinc-400 font-sans">
                                            {currentIncident.reasoning_trace?.split("\n")[0] || "Rapid rescue triage in progress."}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tactical Actions for Responder */}
                            <div className="pt-2 space-y-2">
                                <div className="text-[9px] text-zinc-500 uppercase tracking-widest">
                                    Field Disposition
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => handleUpdateStatus("EN_ROUTE")}
                                        className={cn(
                                            "p-2.5 rounded border font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all",
                                            currentIncident.responder_status === "EN_ROUTE"
                                                ? "bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/30"
                                                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700"
                                        )}
                                    >
                                        <Navigation className="w-3.5 h-3.5" />
                                        En Route
                                    </button>

                                    <button
                                        onClick={() => handleUpdateStatus("ON_SCENE")}
                                        className={cn(
                                            "p-2.5 rounded border font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all",
                                            currentIncident.responder_status === "ON_SCENE"
                                                ? "bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/30"
                                                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700"
                                        )}
                                    >
                                        <MapPin className="w-3.5 h-3.5" />
                                        On Scene
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <button
                                        onClick={handleRequestBackup}
                                        className={cn(
                                            "p-2.5 rounded border font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all",
                                            currentIncident.backup_requested
                                                ? "bg-red-600 text-white border-red-400 animate-pulse"
                                                : "bg-red-950/30 hover:bg-red-950/50 text-red-400 border-red-500/30"
                                        )}
                                    >
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        {currentIncident.backup_requested ? "Backup Dispatched" : "Request Backup"}
                                    </button>

                                    <button
                                        onClick={() => handleUpdateStatus("RESOLVED")}
                                        className="p-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                                        Resolve Event
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="py-20 text-center text-zinc-500 text-xs">
                            No active incident assigned to this mobile terminal.
                        </div>
                    )}
                </div>

                {/* Footer Watermark */}
                <div className="p-2 bg-zinc-900 border-t border-white/5 text-center text-[8px] text-zinc-600">
                    SIMULATED RESPONDER TERMINAL // RESQBHARAT ERSS-112 HACKATHON BUILD
                </div>
            </div>
        </div>
    );
}
