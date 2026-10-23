"use client";

import { useEffect, useState } from "react";
import { useSimulationStore } from "@/lib/store";
import { ShieldCheck, Zap, Cpu, Sparkles, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuotaData {
    mode: "LIVE_AI" | "ZERO_QUOTA_SIMULATION";
    requestsThisMinute: number;
    maxRPM: number;
    isSafe: boolean;
    totalToday: number;
    cachedHitCount: number;
    message: string;
    carto_active: boolean;
}

export default function QuotaHealthBadge() {
    const isMockMode = useSimulationStore((state) => state.isMockMode);
    const setIsMockMode = useSimulationStore((state) => state.setIsMockMode);
    const [quota, setQuota] = useState<QuotaData | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    // Fetch quota status periodically
    useEffect(() => {
        let isMounted = true;

        const fetchQuota = async () => {
            try {
                const res = await fetch("/api/quota");
                if (res.ok) {
                    const data: QuotaData = await res.json();
                    if (isMounted) setQuota(data);
                }
            } catch (e) {
                // Ignore network errors during development
            }
        };

        fetchQuota();
        const interval = setInterval(fetchQuota, 4000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    // Toggle between Live AI and Zero-Quota Simulation
    const handleToggleMode = async () => {
        const nextMode = !isMockMode;
        setIsMockMode(nextMode);

        try {
            await fetch("/api/quota", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: nextMode ? "ZERO_QUOTA_SIMULATION" : "LIVE_AI" }),
            });
            const res = await fetch("/api/quota");
            if (res.ok) {
                const data = await res.json();
                setQuota(data);
            }
        } catch (e) {
            // Ignore
        }
    };

    const rpm = quota?.requestsThisMinute ?? 0;
    const maxRpm = quota?.maxRPM ?? 6;
    const cacheHits = quota?.cachedHitCount ?? 0;

    return (
        <div className="relative inline-flex items-center">
            <div className="flex items-center gap-1.5 p-1 bg-black/50 border border-white/10 rounded-full backdrop-blur-md">
                {/* Mode Switcher Button */}
                <button
                    onClick={handleToggleMode}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider transition-all duration-300",
                        !isMockMode
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                    )}
                    title="Click to toggle between Live Gemini AI and Zero-Quota Pre-computed Simulation"
                >
                    {!isMockMode ? (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            <span>LIVE GEMINI</span>
                        </>
                    ) : (
                        <>
                            <Zap className="w-3 h-3 text-cyan-400" />
                            <span>SIMULATION ONLY</span>
                        </>
                    )}
                </button>

                {/* Free Tier Rate Meter Badge */}
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono text-zinc-300 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                    title="Free-Tier Rate-Limit Guard & Cache Telemetry"
                >
                    <Activity className="w-3 h-3 text-amber-400" />
                    <span>{rpm}/{maxRpm} RPM</span>
                    {cacheHits > 0 && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-emerald-300 font-mono">
                            +{cacheHits} CACHED
                        </span>
                    )}
                </button>
            </div>

            {/* Telemetry Popover */}
            {showDetails && (
                <div
                    className="absolute top-full right-0 mt-2 w-72 p-3 bg-zinc-950/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl z-50 text-[11px] font-mono text-zinc-300 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200"
                    onMouseLeave={() => setShowDetails(false)}
                >
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                        <span className="font-bold text-white flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            FREE-TIER QUOTA GUARD
                        </span>
                        <span className="text-[9px] text-zinc-500">v1.0 PRD §14</span>
                    </div>

                    <div className="space-y-1 text-zinc-400">
                        <div className="flex justify-between">
                            <span>Engine Mode:</span>
                            <span className={!isMockMode ? "text-emerald-400 font-bold" : "text-cyan-400 font-bold"}>
                                {!isMockMode ? "Live Gemini Flash" : "Zero-Quota Simulation"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Traffic Rate:</span>
                            <span className="text-white">{rpm} / {maxRpm} RPM (Cap: 6 RPM)</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Deterministic Cache Hits:</span>
                            <span className="text-emerald-400 font-bold">{cacheHits} requests saved</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Map Provider:</span>
                            <span className="text-cyan-400 font-bold">CARTO Dark Matter (Free)</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Live 112 Dispatches:</span>
                            <span className="text-amber-400 font-bold">DISABLED (Simulated Only)</span>
                        </div>
                    </div>

                    <div className="pt-1.5 border-t border-white/10 text-[9px] text-zinc-500 leading-relaxed">
                        Protects Google Free-Tier 15 RPM limits by enforcing a 6 RPM ceiling and content-hashed caching.
                    </div>
                </div>
            )}
        </div>
    );
}
