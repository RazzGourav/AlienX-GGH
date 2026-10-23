"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSimulationStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MODELS } from "@/lib/constants";
import { Mic, Target, Loader2, CheckCircle, XCircle, Shield, Activity, Eye, Truck, Cpu, Layers } from "lucide-react";
import { ServiceProposalPanel } from "./ServiceProposalPanel";

// Custom Markdown-lite formatter
function FormattedReasoningDisplay({ text }: { text: string }) {
    if (!text) return null;

    // View Layer Clean: Remove unwanted artifacts
    const cleanText = text
        .replace(/Show Less/gi, "") // Cleaning user reported artifact
        .trim();

    return (
        <div className="space-y-2">
            {cleanText.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-1" />; // Spacer

                // Separator
                if (trimmed === '---') {
                    return <hr key={i} className="border-zinc-800 my-2" />;
                }

                // Headers
                // Warnings
                if (trimmed.startsWith('⚠️') || trimmed.includes('[STREAM ERROR]')) {
                    return <div key={i} className="text-amber-400 bg-amber-950/30 p-2 rounded border border-amber-900/50 text-[10px] font-bold shadow-sm">{trimmed}</div>;
                }

                // Explicit Header (###) OR Implicit Header (Short first line)
                const isExplicitHeader = trimmed.startsWith('#');
                const isImplicitHeader = (i === 0 && trimmed.length < 50 && !trimmed.includes(':') && !trimmed.endsWith('.')) || (trimmed.includes('Analysis') && !trimmed.includes(':') && trimmed.length < 50);

                if (isExplicitHeader || isImplicitHeader) {
                    const cleanHeader = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
                    return <h3 key={i} className="text-cyan-400 font-bold uppercase text-[10px] tracking-widest mt-3 mb-2 border-b border-cyan-500/20 pb-1">{cleanHeader}</h3>;
                }

                // List Items (Numeric or Bullet)
                const isList = /^\d+\./.test(trimmed) || trimmed.startsWith('- ') || trimmed.startsWith('* ');

                // Bold Parsing (Robust) - Handles **text**
                const parts = trimmed.split(/(\*\*.*?\*\*)/g);

                return (
                    <div key={i} className={cn("text-[10px] leading-relaxed text-zinc-300/90 py-0.5", isList && "pl-2.5 ml-1 mt-1 bg-zinc-900/40 border border-white/5 rounded-md")}>
                        {parts.map((part, j) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                const content = part.slice(2, -2);
                                return <span key={j} className="text-cyan-200 font-bold">{content}</span>;
                            }
                            return <span key={j}>{part}</span>;
                        })}
                    </div>
                );
            })}
        </div>
    );
}

function TypewriterText({ text, speed = 20 }: { text: string; speed?: number }) {
    const [displayText, setDisplayText] = useState("");
    const [isComplete, setIsComplete] = useState(false);
    const previousTextRef = useRef<string>("");
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Only reset if the text has actually changed
        if (previousTextRef.current === text) {
            return;
        }

        previousTextRef.current = text;

        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Reset state for new text
        setDisplayText("");
        setIsComplete(false);

        if (!text) {
            setIsComplete(true);
            return;
        }

        let index = 0;

        intervalRef.current = setInterval(() => {
            if (index < text.length) {
                setDisplayText(text.substring(0, index + 1));
                index++;
            } else {
                setIsComplete(true);
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }
        }, speed);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [text, speed]);

    return (
        <span className="whitespace-pre-wrap">
            {displayText}
            {!isComplete && <span className="animate-pulse">▌</span>}
        </span>
    );
}

export function ReasoningLog({ className }: { className?: string }) {
    const {
        logs,
        incidents,
        isGeneratingReport,
        isMissionComplete,
        rawThinkingProcess,
        activeAgent,
        activeModel,
        isVoiceProcessing,
        spotlightId,
        processingBatch,
        updateIncident,
        time
    } = useSimulationStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    const thoughtsRef = useRef<HTMLDivElement>(null);
    const [displayLogs, setDisplayLogs] = useState<string[]>([]);

    useEffect(() => {
        setDisplayLogs(logs.slice(-15));
        // Auto-scroll to bottom
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);



    // Check if there's an incident currently being analyzed (prioritize spotlight), or fallback to first pending
    const pendingIncident = (spotlightId ? incidents.find(i => i.id === spotlightId) : null) ||
        incidents.find(i => i.status === "ANALYZING") ||
        incidents.find(i => i.status === "PENDING");

    // Get spotlight incident and background incidents from batch
    const heroIncident = spotlightId ? incidents.find(i => i.id === spotlightId) : null;

    // PROTOCOL ZERO: Check for blocking authorization events
    const activeAuthIncident = incidents.find(i => i.auth_status === "PENDING");

    // Find the latest active incident with a reasoning trace
    // PRIORITY: Active Auth Incident -> Latest processed incident
    const latestTriaged = activeAuthIncident || incidents
        .slice()
        .reverse()
        .find(i => i.reasoning_trace && (i.status === "TRIAGED" || i.status === "RESOLVED" || i.status === "ANALYZING"));

    // Show only background incidents (exclude Hero since it's shown in AI Reasoning)
    const backgroundIncidents = processingBatch
        .filter(id => id !== spotlightId)
        .map(id => incidents.find(i => i.id === id))
        .filter(Boolean);
    const isParallelProcessing = processingBatch.length > 1;

    // Multi-Agent Live State Tracking
    const isPlaying = useSimulationStore(state => state.isPlaying);
    const activeWorkers = processingBatch.map(id => incidents.find(i => i.id === id)).filter(Boolean);

    // Dynamic state computation for each agent in the orchestration pipeline
    const isCoordinatorActive = isPlaying && (activeWorkers.length > 0 || isVoiceProcessing || pendingIncident !== null);
    const isTriageActive = isPlaying && (activeWorkers.some(i => i?.type === "AUDIO" || i?.type === "TEXT" || (i?.raw_input && !i.raw_input.endsWith(".mp4") && !i.raw_input.endsWith(".mov"))) || activeAgent === "Triage Agent");
    const isSurveillanceActive = isPlaying && (activeWorkers.some(i => i?.type === "VIDEO" || (i?.raw_input && (i.raw_input.endsWith(".mp4") || i.raw_input.endsWith(".mov")))) || activeAgent === "Surveillance Agent");
    const isLogisticsActive = isPlaying && (activeWorkers.some(i => i?.requires_logistics || (i?.service_proposals && i.service_proposals.length > 0)) || activeAgent === "Logistics Agent");

    const getAssignedAgent = (inc: any) => {
        const input = (inc.raw_input || "").toLowerCase();
        if (inc.type === "VIDEO" || input.endsWith(".mp4") || input.endsWith(".mov")) {
            return { name: "Surveillance", icon: Eye, color: "text-amber-400 border-amber-500/30 bg-amber-500/10" };
        }
        if (inc.requires_logistics || (inc.service_proposals && inc.service_proposals.length > 0)) {
            return { name: "Logistics", icon: Truck, color: "text-purple-400 border-purple-500/30 bg-purple-500/10" };
        }
        return { name: "Triage", icon: Activity, color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" };
    };

    // Auto-scroll thoughts
    useEffect(() => {
        if (thoughtsRef.current) {
            thoughtsRef.current.scrollTop = thoughtsRef.current.scrollHeight;
        }
    }, [rawThinkingProcess, latestTriaged, pendingIncident, displayLogs]);

    return (
        <div className={cn("flex flex-col gap-2 p-4 bg-zinc-950 border border-zinc-800 rounded-lg h-full font-mono text-xs", className)}>
            {/* MULTI-AGENT MATRIX HUD: Live Concurrent Agent Operations */}
            <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-black/60 border border-white/10 rounded-lg shrink-0">
                {/* 1. Coordinator Agent */}
                <div className={cn(
                    "p-1.5 rounded border transition-all flex flex-col justify-between",
                    isCoordinatorActive 
                        ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.15)]" 
                        : "border-white/5 bg-white/[0.02] opacity-60"
                )}>
                    <div className="flex items-center justify-between">
                        <span className="text-[8.5px] font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" /> COORDINATOR
                        </span>
                        <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isCoordinatorActive ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
                        )} />
                    </div>
                    <div className="text-[8px] text-zinc-300 font-bold truncate mt-0.5">
                        {isCoordinatorActive ? "ROUTING SIGNALS" : "STANDBY"}
                    </div>
                    <div className="text-[7px] text-zinc-500 font-mono">Gemini 3 Flash</div>
                </div>

                {/* 2. Triage Agent */}
                <div className={cn(
                    "p-1.5 rounded border transition-all flex flex-col justify-between",
                    isTriageActive 
                        ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.15)]" 
                        : "border-white/5 bg-white/[0.02] opacity-60"
                )}>
                    <div className="flex items-center justify-between">
                        <span className="text-[8.5px] font-bold tracking-wider text-cyan-400 flex items-center gap-1">
                            <Activity className="w-2.5 h-2.5" /> TRIAGE
                        </span>
                        <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isTriageActive ? "bg-cyan-400 animate-pulse" : "bg-zinc-600"
                        )} />
                    </div>
                    <div className="text-[8px] text-zinc-300 font-bold truncate mt-0.5">
                        {isTriageActive ? "AUDIO/TEXT REASON" : "STANDBY"}
                    </div>
                    <div className="text-[7px] text-zinc-500 font-mono">Flash (Thinking)</div>
                </div>

                {/* 3. Surveillance Agent */}
                <div className={cn(
                    "p-1.5 rounded border transition-all flex flex-col justify-between",
                    isSurveillanceActive 
                        ? "border-amber-500/50 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.15)]" 
                        : "border-white/5 bg-white/[0.02] opacity-60"
                )}>
                    <div className="flex items-center justify-between">
                        <span className="text-[8.5px] font-bold tracking-wider text-amber-400 flex items-center gap-1">
                            <Eye className="w-2.5 h-2.5" /> SURVEILLANCE
                        </span>
                        <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isSurveillanceActive ? "bg-amber-400 animate-pulse" : "bg-zinc-600"
                        )} />
                    </div>
                    <div className="text-[8px] text-zinc-300 font-bold truncate mt-0.5">
                        {isSurveillanceActive ? "DRONE 2S SAMPLES" : "STANDBY"}
                    </div>
                    <div className="text-[7px] text-zinc-500 font-mono">Gemini 3 Pro</div>
                </div>

                {/* 4. Logistics Agent */}
                <div className={cn(
                    "p-1.5 rounded border transition-all flex flex-col justify-between",
                    isLogisticsActive 
                        ? "border-purple-500/50 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.15)]" 
                        : "border-white/5 bg-white/[0.02] opacity-60"
                )}>
                    <div className="flex items-center justify-between">
                        <span className="text-[8.5px] font-bold tracking-wider text-purple-400 flex items-center gap-1">
                            <Truck className="w-2.5 h-2.5" /> LOGISTICS
                        </span>
                        <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isLogisticsActive ? "bg-purple-400 animate-pulse" : "bg-zinc-600"
                        )} />
                    </div>
                    <div className="text-[8px] text-zinc-300 font-bold truncate mt-0.5">
                        {isLogisticsActive ? "108/FIRE DISPATCH" : "STANDBY"}
                    </div>
                    <div className="text-[7px] text-zinc-500 font-mono">Grounding API</div>
                </div>
            </div>

            {/* Header and logs */}
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 mb-1">
                <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <h3 className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">System Activity</h3>
                <span className="ml-auto text-[8.5px] text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded">
                    {logs.length} entries
                </span>
            </div>

            {/* Activity Log */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 min-h-[70px] max-h-[220px]">
                {displayLogs.length === 0 ? (
                    <div className="text-zinc-600 text-center py-4 animate-pulse">
                        Initializing system...
                    </div>
                ) : (
                    displayLogs.map((log, i) => (
                        <div
                            key={i}
                            className="text-zinc-500 flex items-start gap-2 py-0.5 hover:bg-zinc-900/30 px-1 rounded transition-colors"
                        >
                            <span className="text-emerald-500/40 shrink-0">›</span>
                            <span className="break-all">{log}</span>
                        </div>
                    ))
                )}
            </div>

            {/* ============================================================ */}
            {/* PARALLEL PROCESSING: Background Tasks with Agent Badges       */}
            {/* ============================================================ */}
            {isParallelProcessing && backgroundIncidents.length > 0 && (
                <div className="border-t border-zinc-700/50 pt-2 mt-1">
                    <div className="flex items-center gap-2 mb-1.5">
                        <Target className="w-3 h-3 text-cyan-400 animate-pulse" />
                        <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest">
                            Parallel Agent Workers
                        </span>
                        <span className="ml-auto text-[8.5px] text-zinc-400 bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.2 rounded font-mono">
                            {processingBatch.length} ACTIVE
                        </span>
                    </div>
                    <div className="space-y-1 max-h-[85px] overflow-y-auto custom-scrollbar pr-1">
                        {backgroundIncidents.map((incident) => {
                            if (!incident) return null;
                            const agentTag = getAssignedAgent(incident);
                            const AgentIcon = agentTag.icon;

                            return (
                                <div key={incident.id} className="flex items-center gap-2 bg-zinc-900/60 rounded px-2 py-1 border border-zinc-800">
                                    {incident.status === "ANALYZING" ? (
                                        <Loader2 className="w-3 h-3 text-yellow-500 animate-spin shrink-0" />
                                    ) : (
                                        <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                                    )}
                                    <span className="text-[8.5px] text-zinc-300 font-mono font-bold">
                                        {incident.id}
                                    </span>
                                    <span className={cn(
                                        "text-[7.5px] px-1.5 py-0.5 rounded border font-mono font-bold flex items-center gap-1",
                                        agentTag.color
                                    )}>
                                        <AgentIcon className="w-2.5 h-2.5" />
                                        {agentTag.name}
                                    </span>
                                    <span className={cn(
                                        "ml-auto text-[7.5px] px-1 py-0.5 rounded font-mono",
                                        incident.status === "ANALYZING" && "bg-yellow-500/20 text-yellow-400",
                                        incident.status === "TRIAGED" && "bg-emerald-500/20 text-emerald-400"
                                    )}>
                                        {incident.status}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* AI Reasoning Trace - "Glass Box" Visualization */}
            {isGeneratingReport ? (
                <div className="mt-auto border-t border-zinc-800 pt-3">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse [animation-delay:200ms]" />
                            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse [animation-delay:400ms]" />
                        </div>
                        <h4 className="text-purple-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">
                            Generating Mission Report...
                        </h4>
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-[9px] text-zinc-500 font-mono">
                                MODEL: {MODELS.REASONING}
                            </span>
                        </div>
                    </div>
                    <div className="bg-zinc-900/50 p-3 rounded-lg border border-purple-500/20 text-[10px] text-purple-300/70 italic animate-pulse">
                        &gt; Conducting full audit of mission log...
                        <br />
                        &gt; Analyzing critical events...
                        <br />
                        &gt; Compiling chain of custody...
                    </div>
                </div>
            ) : ((latestTriaged || pendingIncident) && !isMissionComplete) || isVoiceProcessing ? (
                <div className="mt-auto border-t border-zinc-800 pt-3">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                            {/* Unified Pulse Indicators */}
                            {isVoiceProcessing ? (
                                <>
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse delay-75" />
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse delay-150" />
                                </>
                            ) : (
                                <>
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                                </>
                            )}
                        </div>
                        <h4 className={cn(
                            "font-bold uppercase text-[10px] tracking-widest",
                            isVoiceProcessing ? "text-amber-400 animate-pulse" : "text-zinc-300"
                        )}>
                            {isVoiceProcessing
                                ? "VOICE INTERPRETER ACTIVE"
                                : (pendingIncident ? (activeAgent || "Coordinator Active") : "AI Reasoning Trace")
                            }
                        </h4>
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-[9px] text-zinc-500 font-mono">
                                {pendingIncident
                                    ? (activeModel || MODELS.COORDINATOR)
                                    : (latestTriaged?.type === "VIDEO" ? MODELS.SURVEILLANCE : MODELS.TRIAGE)}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                {pendingIncident?.id || latestTriaged?.id}
                            </span>
                        </div>
                    </div>

                    <div className={cn(
                        "p-3 rounded-lg border relative overflow-hidden transition-colors duration-300",
                        isVoiceProcessing
                            ? "bg-amber-950/10 border-amber-500/30"
                            : "bg-gradient-to-br from-zinc-900/80 to-zinc-950 border-zinc-800"
                    )}>

                        {/* DECORATIVE BACKGROUND FOR VOICE */}
                        {isVoiceProcessing && (
                            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                                <div className="flex gap-0.5 h-8 items-end">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="w-1 bg-amber-500 rounded-t animate-music-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* USER COMMAND HEADER */}
                        {(pendingIncident?.is_override || pendingIncident?.transcript_context) && (
                            <div className="mb-3 pb-2 border-b border-white/5">
                                <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                                    Live User Command
                                </div>
                                <div className="text-cyan-300 font-mono text-[11px] leading-relaxed italic bg-cyan-950/20 border border-cyan-500/20 rounded-md px-2.5 py-1.5">
                                    "{pendingIncident.transcript_context || pendingIncident.command_intent || pendingIncident.raw_input}"
                                </div>
                            </div>
                        )}

                        <div ref={thoughtsRef} className="text-cyan-400/90 text-[11px] leading-relaxed h-[200px] overflow-y-auto space-y-3 custom-scrollbar">
                            {pendingIncident && (
                                <div className="animate-pulse flex flex-col gap-2">
                                    {/* Show rawThinkingProcess for Hero (whether single or parallel) */}
                                    {rawThinkingProcess ? (
                                        <div className="font-mono text-[10px] text-cyan-300 whitespace-pre-wrap">
                                            {rawThinkingProcess}
                                            <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse align-middle"></span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="h-2 w-3/4 bg-zinc-800 rounded"></div>
                                            <div className="h-2 w-1/2 bg-zinc-800 rounded"></div>
                                            <div className="text-[10px] text-zinc-500 italic mt-2">
                                                [{activeAgent?.toUpperCase() || "COORDINATOR"}] Analyzing signal...
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Show the latest finalized reasoning even if analyzing a new command for same event */}
                            {(latestTriaged && (!pendingIncident || isVoiceProcessing || pendingIncident.id === latestTriaged.id)) && (
                                <>
                                    {latestTriaged.coordinator_trace && (
                                        <div className="border border-amber-500/20 px-2.5 py-1.5 bg-amber-500/5 rounded-md">
                                            <span className="text-amber-400 font-bold uppercase text-[9px] block mb-1">Coordinator Routing</span>
                                            <span className="text-zinc-300 italic text-[10px]">
                                                {latestTriaged.coordinator_trace}
                                            </span>
                                        </div>
                                    )}
                                    {latestTriaged.assigned_assets && latestTriaged.assigned_assets.length > 0 && (
                                        <div className="border border-emerald-500/20 px-2.5 py-1.5 bg-emerald-500/5 rounded-md">
                                            <span className="text-emerald-400 font-bold uppercase text-[9px] block mb-1">Logistics: Grounded Deployment</span>
                                            <span className="text-zinc-300 text-[10px]">
                                                Search-Grounding confirmed conditions. Deploying: <span className="text-emerald-400 font-bold">{latestTriaged.assigned_assets.join(", ")}</span>
                                            </span>
                                        </div>
                                    )}
                                    {latestTriaged.grounding_queries && latestTriaged.grounding_queries.length > 0 && (
                                        <div className="border border-blue-500/20 px-2.5 py-1.5 bg-blue-500/5 rounded-md">
                                            <span className="text-blue-400 font-bold uppercase text-[9px] block mb-1 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                                                INTEL: LIVE GROUNDING SOURCE
                                            </span>
                                            <div className="space-y-1 mt-1">
                                                {latestTriaged.grounding_queries.map((query, idx) => (
                                                    <div key={idx} className="text-blue-300/80 text-[9px] flex items-center gap-1">
                                                        <span className="opacity-50 text-[10px]">🔍</span>
                                                        <span className="italic">"{query}"</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        {/* 1. Tactical Analysis (Primary) */}
                                        <div>
                                            {(() => {
                                                const parts = (latestTriaged.reasoning_trace || "").split('[COMMAND OVERRIDE]:');
                                                const technicalTrace = parts[0].trim();
                                                return <FormattedReasoningDisplay text={technicalTrace || "Initial signal analysis was preempted by high-priority System Commander override."} />;
                                            })()}
                                        </div>

                                        {/* 2. Override Analysis (Secondary) */}
                                        {(latestTriaged.reasoning_trace || "").includes('[COMMAND OVERRIDE]:') && (
                                            <div className="mt-4 pt-3 border-t border-amber-500/20 bg-amber-950/5 p-3 rounded-lg border border-amber-500/10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Mic className="w-3.5 h-3.5 text-amber-500" />
                                                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Commander Override Analysis</span>
                                                </div>
                                                <div className="text-[11px] leading-relaxed text-zinc-300 font-mono italic">
                                                    {(() => {
                                                        const parts = (latestTriaged.reasoning_trace || "").split('[COMMAND OVERRIDE]:');
                                                        return parts[1]?.trim() || "Directive successfully merged.";
                                                    })()}
                                                </div>
                                            </div>
                                        )}

                                        {/* 3. Protocol Zero Sanction (Tertiary) */}
                                        {(latestTriaged.reasoning_trace || "").includes('[PROTOCOL ZERO SANCTIONED]:') && (
                                            <div className="mt-4 pt-3 border-t border-red-500/20 bg-red-950/5 p-3 rounded-lg border border-red-500/10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Target className="w-3.5 h-3.5 text-red-500" />
                                                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Protocol Zero Sanctioned</span>
                                                </div>
                                                <div className="text-[11px] leading-relaxed text-zinc-300 font-mono italic">
                                                    {(() => {
                                                        const parts = (latestTriaged.reasoning_trace || "").split('[PROTOCOL ZERO SANCTIONED]:');
                                                        return parts[1]?.trim() || "Action Authorized.";
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Signature Footer or Auth Action */}
                    {(!pendingIncident && latestTriaged?.auth_status === "PENDING") ? (
                        <div className="mt-4 pt-3 border-t border-red-500/30 bg-red-950/10 p-3 rounded-lg border border-red-500/20 animate-pulse-slow">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                    <h4 className="text-red-400 font-bold uppercase text-[11px] tracking-widest">
                                        Protocol Zero: Authorization Required
                                    </h4>
                                </div>
                                <span className="text-red-400 font-mono text-[10px]">
                                    {Math.max(0, (latestTriaged.auth_timeout_at || 0) - time).toFixed(1)}s
                                </span>
                            </div>

                            <div className="text-[10px] text-red-300/80 mb-3 italic">
                                &gt; High-risk intervention pattern detected.
                                <br />
                                &gt; Automated execution paused pending human confirmations.
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1 bg-red-900/50 rounded-full overflow-hidden mb-3">
                                <div
                                    className="h-full bg-red-500 transition-all duration-100 ease-linear"
                                    style={{ width: `${(Math.max(0, (latestTriaged.auth_timeout_at || 0) - time) / 30) * 100}%` }}
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => updateIncident(latestTriaged.id, { auth_status: "DENIED" })}
                                    className="flex-1 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold text-[10px] py-2 rounded uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                >
                                    <XCircle className="w-3 h-3" />
                                    Decline
                                </button>
                                <button
                                    onClick={() => updateIncident(latestTriaged.id, { auth_status: "APPROVED" })}
                                    className="flex-[2] bg-red-500 hover:bg-red-400 text-white font-bold text-[10px] py-2 rounded uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                >
                                    <Target className="w-3 h-3" />
                                    Authorize
                                </button>
                            </div>
                        </div>
                    ) : (
                        !pendingIncident && latestTriaged && (
                            <>
                                <div className="mt-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-zinc-600">Priority:</span>
                                        <span className={cn(
                                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                            latestTriaged.priority === "CRITICAL" && "bg-red-500/20 text-red-400",
                                            latestTriaged.priority === "HIGH" && "bg-orange-500/20 text-orange-400",
                                            latestTriaged.priority === "MEDIUM" && "bg-yellow-500/20 text-yellow-400",
                                            latestTriaged.priority === "LOW" && "bg-emerald-500/20 text-emerald-400",
                                        )}>
                                            {latestTriaged.priority}
                                        </span>
                                    </div>
                                    <div className="text-[8px] text-zinc-700 font-mono flex items-center gap-1">
                                        <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                                        {latestTriaged.thought_signature ? "HMAC-256 Audit Token" : "SIG-VERIFIED"}
                                    </div>
                                </div>

                                {/* PRD §10 Deterministic Service Proposals & Deduplication Action Panel */}
                                <ServiceProposalPanel incident={latestTriaged} className="mt-3 pt-3 border-t border-white/10" />
                            </>
                        )
                    )}
                </div>
            ) : (
                <div className="mt-auto border-t border-zinc-800 pt-3 opacity-50">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
                            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
                            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
                        </div>
                        <h4 className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
                            AI Reasoning Trace
                        </h4>
                    </div>
                    <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/50 min-h-[100px] flex items-center justify-center">
                        <div className="text-zinc-600 text-[10px] font-mono italic">
                            {isMissionComplete ? "[MISSION COMPLETE] All Signals Processed" : "[SYSTEM STANDBY] Awaiting Signal..."}
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}
