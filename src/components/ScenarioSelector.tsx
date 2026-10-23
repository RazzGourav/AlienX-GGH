"use client";

import React, { useState } from "react";
import { useSimulationStore } from "@/lib/store";
import scenariosData from "@/data/scenarios.json";
import { MapPin, ChevronDown, Check, Compass, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_INDIA_SCENARIO = {
    id: "ALL_INDIA",
    title: "All-India Multi-Hazard Live Drill (Continuous Multi-Agent)",
    region: "All-India Overview",
    description: "Continuous 11 multimodal signals: Audio distress calls, Drone video feeds, ERSS-112 text, and Protocol Zero.",
    default_center: { lat: 21.7679, lng: 78.8718, zoom: 5 },
    signalsCount: 11,
};

interface ScenarioSelectorProps {
    className?: string;
}

export function ScenarioSelector({ className }: ScenarioSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { 
        activeScenarioId, 
        setActiveScenarioId, 
        setActiveMapCenter, 
        resetSimulation, 
        addIncident, 
        setFocusedIncidentId, 
        showNotification 
    } = useSimulationStore();

    const selectedScenarioId = activeScenarioId || "ALL_INDIA";
    const currentScenario = selectedScenarioId === "ALL_INDIA"
        ? ALL_INDIA_SCENARIO
        : (scenariosData.find(s => s.id === selectedScenarioId) || ALL_INDIA_SCENARIO);

    const handleSelectAllIndia = () => {
        setIsOpen(false);
        resetSimulation();
        setActiveScenarioId("ALL_INDIA");
        setActiveMapCenter(ALL_INDIA_SCENARIO.default_center);
        showNotification("Loaded All-India Multi-Hazard Continuous Stream", "info");
    };

    const handleSelectScenario = (scenario: typeof scenariosData[0]) => {
        setIsOpen(false);

        // Reset current simulation state first
        resetSimulation();

        // Set active scenario ID and region center
        setActiveScenarioId(scenario.id);
        setActiveMapCenter(scenario.default_center);

        // Inject new scenario's incidents into simulation
        scenario.incidents.forEach((inc) => {
            addIncident({
                ...inc,
                type: inc.type as any,
                status: "PENDING",
                timestamp: new Date().toISOString(),
                responder_status: "PENDING",
            });
        });

        if (scenario.incidents.length > 0) {
            setFocusedIncidentId(scenario.incidents[0].id);
        }

        showNotification(`Loaded Scenario: ${scenario.title}`, "info");
    };

    return (
        <div className={cn("relative", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white font-mono text-[10px] font-bold tracking-wider transition-all backdrop-blur-md"
                title="Select Disaster Simulation Scenario"
            >
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span className="truncate max-w-[140px] sm:max-w-[180px]">
                    {currentScenario.region}
                </span>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-84 p-2 bg-zinc-950/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl z-50 text-[11px] font-mono animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                        <span>Disaster Scenarios</span>
                        <span className="text-[9px] text-cyan-400 font-mono">4 AVAILABLE</span>
                    </div>

                    <div className="space-y-1 mt-1.5">
                        {/* Primary All-India Option */}
                        <button
                            onClick={handleSelectAllIndia}
                            className={cn(
                                "w-full text-left p-2.5 rounded-lg border transition-all space-y-1",
                                selectedScenarioId === "ALL_INDIA"
                                    ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                                    : "bg-white/[0.02] border-transparent hover:bg-white/5 hover:border-white/10 text-zinc-300"
                            )}
                        >
                            <div className="flex items-center justify-between font-bold text-[11px]">
                                <span className="flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                                    {ALL_INDIA_SCENARIO.region}
                                </span>
                                {selectedScenarioId === "ALL_INDIA" && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                            </div>

                            <div className="text-[10px] text-zinc-400 font-sans leading-tight">
                                {ALL_INDIA_SCENARIO.title}
                            </div>

                            <div className="text-[9px] text-emerald-400/80 font-mono pt-0.5">
                                11 Multimodal Signals • Audio/Video/Text/Protocol Zero
                            </div>
                        </button>

                        <div className="h-px bg-white/5 my-1" />

                        {scenariosData.map((scenario) => {
                            const isSelected = scenario.id === selectedScenarioId;
                            return (
                                <button
                                    key={scenario.id}
                                    onClick={() => handleSelectScenario(scenario)}
                                    className={cn(
                                        "w-full text-left p-2.5 rounded-lg border transition-all space-y-1",
                                        isSelected
                                            ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                                            : "bg-white/[0.02] border-transparent hover:bg-white/5 hover:border-white/10 text-zinc-300"
                                    )}
                                >
                                    <div className="flex items-center justify-between font-bold text-[11px]">
                                        <span className="flex items-center gap-1.5">
                                            <MapPin className="w-3 h-3 text-cyan-400" />
                                            {scenario.region}
                                        </span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                                    </div>

                                    <div className="text-[10px] text-zinc-400 font-sans leading-tight">
                                        {scenario.title}
                                    </div>

                                    <div className="text-[9px] text-zinc-500 font-mono pt-0.5">
                                        {scenario.incidents.length} signals // Multi-agency
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
