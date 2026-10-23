"use client";

import React, { useState } from "react";
import { useSimulationStore } from "@/lib/store";
import { type Incident, type ServiceProposal, type ConflictRecord } from "@/lib/types";
import {
    ShieldAlert,
    CheckCircle2,
    XCircle,
    Truck,
    Flame,
    HeartPulse,
    LifeBuoy,
    AlertTriangle,
    GitMerge,
    ExternalLink,
    Compass,
    Radio
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceProposalPanelProps {
    incident: Incident;
    className?: string;
}

const getCategoryIcon = (category: string) => {
    switch (category) {
        case "medical":
            return <HeartPulse className="w-3.5 h-3.5 text-rose-400" />;
        case "fire_rescue":
            return <Flame className="w-3.5 h-3.5 text-amber-400" />;
        case "disaster_response":
            return <LifeBuoy className="w-3.5 h-3.5 text-cyan-400" />;
        case "police_traffic":
            return <Truck className="w-3.5 h-3.5 text-blue-400" />;
        default:
            return <Radio className="w-3.5 h-3.5 text-emerald-400" />;
    }
};

export function ServiceProposalPanel({ incident, className }: ServiceProposalPanelProps) {
    const {
        approveServiceProposal,
        rejectServiceProposal,
        mergeDuplicateIncidents,
        resolveConflict,
        mockStations,
    } = useSimulationStore();

    const [rejectingRuleId, setRejectingRuleId] = useState<string | null>(null);
    const [rejectRationale, setRejectRationale] = useState("");

    const proposals = incident.service_proposals || [];
    const duplicates = (incident.duplicate_candidates || []).filter(d => d.status === "candidate");
    const conflicts = (incident.conflicts_list || []).filter(c => c.status === "unresolved");

    if (proposals.length === 0 && duplicates.length === 0 && conflicts.length === 0) {
        return null;
    }

    return (
        <div className={cn("space-y-3 font-mono text-[11px]", className)}>
            {/* 1. DUPLICATE CLUSTER NOTIFICATION */}
            {duplicates.length > 0 && (
                <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-950/20 text-amber-300 space-y-2 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-[10px] tracking-wider uppercase">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            Spatio-Temporal Duplicate Candidate ({Math.round(duplicates[0].match_score * 100)}% Match)
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                            PRD §10 CLUSTER
                        </span>
                    </div>

                    <div className="text-[10px] text-zinc-300 space-y-1">
                        {duplicates[0].reasons.map((r, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-amber-400" />
                                <span>{r}</span>
                            </div>
                        ))}
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                        <button
                            onClick={() => mergeDuplicateIncidents(incident.id, duplicates[0].incident_id)}
                            className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-500/20"
                        >
                            <GitMerge className="w-3 h-3" />
                            Consolidate & Merge Duplicate Evidence
                        </button>
                    </div>
                </div>
            )}

            {/* 2. CONFLICT RESOLUTION WORKFLOW */}
            {conflicts.length > 0 && (
                <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-950/20 text-rose-300 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-[10px] tracking-wider uppercase">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                            Caller Data Discrepancy (Operator Verification Required)
                        </span>
                        <span className="text-[9px] text-rose-400">PRD §9 EVIDENCE</span>
                    </div>

                    {conflicts.map((conf, idx) => (
                        <div key={idx} className="p-2 rounded bg-black/40 border border-white/5 space-y-1.5">
                            <div className="text-[10px] text-zinc-300 font-sans">
                                {conf.description}
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {conf.variants.map((v, vIdx) => (
                                    <button
                                        key={vIdx}
                                        onClick={() => resolveConflict(incident.id, conf.field, v.value)}
                                        className="px-2.5 py-1 rounded border border-rose-500/40 hover:bg-rose-500/20 text-rose-200 text-[9px] font-mono transition-colors flex items-center gap-1"
                                    >
                                        <span>Confirm:</span>
                                        <span className="font-bold text-white">"{v.value}"</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 3. DETERMINISTIC SERVICE DISPATCH PROPOSALS */}
            {proposals.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-white/10">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-cyan-400" />
                            Deterministic Dispatch Proposals (PRD §10)
                        </span>
                        <span className="text-[9px] text-zinc-500">HUMAN-IN-THE-LOOP</span>
                    </div>

                    <div className="space-y-2">
                        {proposals.map((proposal, idx) => {
                            const isApproved = proposal.operator_status === "approved";
                            const isRejected = proposal.operator_status === "rejected";
                            const isModified = proposal.operator_status === "modified";
                            const isProposed = proposal.operator_status === "proposed";

                            return (
                                <div
                                    key={idx}
                                    className={cn(
                                        "p-3 rounded-lg border transition-all duration-300 space-y-2",
                                        isApproved && "bg-emerald-950/20 border-emerald-500/40",
                                        isRejected && "bg-zinc-900/50 border-zinc-800 opacity-60",
                                        isProposed && "bg-zinc-900/80 border-cyan-500/30 shadow-lg"
                                    )}
                                >
                                    {/* Proposal Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {getCategoryIcon(proposal.service_category)}
                                            <span className="font-bold text-white text-[11px] uppercase tracking-wide">
                                                {proposal.service_category.replace(/_/g, " ")}
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-cyan-300 font-mono">
                                                {proposal.rule_id}
                                            </span>
                                        </div>

                                        {/* Status Badge */}
                                        <div>
                                            {isApproved && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                    DISPATCH APPROVED
                                                </span>
                                            )}
                                            {isRejected && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                                    <XCircle className="w-3 h-3 text-zinc-500" />
                                                    REJECTED BY OPERATOR
                                                </span>
                                            )}
                                            {isProposed && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                                                    AWAITING APPROVAL
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rationale */}
                                    <p className="text-[10px] text-zinc-300 leading-relaxed font-sans">
                                        {proposal.rationale}
                                    </p>

                                    {/* Recommended Mock Units */}
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">
                                            Recommended Resources:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {proposal.recommended_units.map((unitName, uIdx) => (
                                                <span
                                                    key={uIdx}
                                                    className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] border flex items-center gap-1",
                                                        isApproved
                                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                                            : "bg-white/5 border-white/10 text-zinc-200"
                                                    )}
                                                >
                                                    <Truck className="w-2.5 h-2.5 text-zinc-400" />
                                                    {unitName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Dispatcher Actions */}
                                    {isProposed && (
                                        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                                            <div className="text-[9px] text-zinc-500">
                                                Simulated ETA: ~{Math.round((proposal.estimated_distance_km || 2) * 2.5)} mins
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {rejectingRuleId === proposal.rule_id ? (
                                                    <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                                                        <input
                                                            type="text"
                                                            placeholder="Reason (optional)..."
                                                            value={rejectRationale}
                                                            onChange={(e) => setRejectRationale(e.target.value)}
                                                            className="px-2 py-1 bg-black/60 border border-zinc-700 rounded text-[9px] text-white focus:outline-none focus:border-red-500"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                rejectServiceProposal(incident.id, proposal.rule_id, rejectRationale);
                                                                setRejectingRuleId(null);
                                                                setRejectRationale("");
                                                            }}
                                                            className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[9px] font-bold"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => setRejectingRuleId(null)}
                                                            className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 text-[9px]"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => setRejectingRuleId(proposal.rule_id)}
                                                            className="px-2.5 py-1 rounded border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white text-[10px] transition-colors"
                                                        >
                                                            Decline
                                                        </button>
                                                        <button
                                                            onClick={() => approveServiceProposal(incident.id, proposal.rule_id)}
                                                            className="px-3.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[10px] tracking-wider uppercase transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                                                        >
                                                            <CheckCircle2 className="w-3 h-3 text-black" />
                                                            Approve Dispatch
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Demonstration Watermark */}
            <div className="text-[8px] text-zinc-600 font-mono tracking-wider pt-1 border-t border-white/5 text-center">
                SIMULATED COMMAND DISPATCH - ALL UNITS AND ETAS ARE EMULATED FOR HACKATHON DEMONSTRATION
            </div>
        </div>
    );
}
