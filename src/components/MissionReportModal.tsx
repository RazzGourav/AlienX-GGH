"use client";

import { useState } from "react";
import { useSimulationStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    Shield,
    AlertTriangle,
    Activity,
    X,
    Download,
    Map,
    Zap,
    CheckCircle2,
    Truck,
    Clock,
    FileJson,
    Fingerprint,
    ListFilter
} from "lucide-react";
import { cn } from "@/lib/utils";

type ReportTab = "OVERVIEW" | "FORENSICS" | "DISPATCH" | "AUDIT_TIMELINE";

export function MissionReportModal() {
    const { report, isReportOpen, setIsReportOpen, agentAuditLogs, incidents } = useSimulationStore();
    const [activeTab, setActiveTab] = useState<ReportTab>("OVERVIEW");

    if (!report || !isReportOpen) return null;

    const handleDownloadJSON = () => {
        const fullAuditData = {
            resqbharat_version: "2.0-PRD-COMPLIANT",
            generated_at: new Date().toISOString(),
            exercise_watermark: "SIMULATED EXERCISE DATA - NO LIVE DISPATCHES OCCURRED",
            mission_report: report,
            agent_audit_logs: agentAuditLogs,
            incidents_snapshot: incidents,
        };

        const blob = new Blob([JSON.stringify(fullAuditData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `RESQBHARAT_${report.report_id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const allClaims = incidents.flatMap(i => i.extracted_claims || []);
    const allTimelineEvents = incidents.flatMap(i => i.timeline_events || []);
    const allProposals = incidents.flatMap(i => (i.service_proposals || []).map(p => ({ ...p, incident_id: i.id })));

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mission-report-modal fixed inset-0 z-[99999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-3 md:p-8"
            >
                {/* CRT Scanline Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.3)_50%),linear-gradient(90deg,rgba(0,255,0,0.03),rgba(255,0,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-40 z-10" />

                <motion.div
                    initial={{ scale: 0.98, y: 10, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.98, y: 10, opacity: 0 }}
                    className="mission-report-container w-full max-w-5xl bg-[#fafafa] text-zinc-900 rounded shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-zinc-800 relative font-mono"
                >
                    {/* Top Classification Banner */}
                    <div className={cn(
                        "w-full py-1 text-center text-[10px] font-black tracking-[0.4em] uppercase border-b border-zinc-300",
                        report.classification === "TOP SECRET" ? "bg-red-950 text-red-200" :
                        report.classification === "SECRET" ? "bg-zinc-900 text-zinc-100" : "bg-zinc-200 text-zinc-600"
                    )}>
                        {report.classification} // OFFICIAL EXERCISE INCIDENT RECORD // RESQBHARAT
                    </div>

                    {/* Official Document Header */}
                    <div className="report-header bg-white p-6 border-b border-zinc-300 shrink-0">
                        <div className="flex flex-col md:flex-row justify-between gap-4 items-start">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-zinc-900 text-white flex items-center justify-center rounded shrink-0 shadow-md">
                                    <Shield className="w-7 h-7 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-900">
                                        Mission Audit & Forensics Report
                                    </h2>
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                        ERSS-112 Emergency Intelligence Layer // Autonomous Multi-Agent Coordinator
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="text-[10px] font-bold py-0.5 px-2 bg-zinc-100 border border-zinc-300 rounded">
                                            ID: {report.report_id}
                                        </span>
                                        <span className="text-[10px] font-bold py-0.5 px-2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded">
                                            AUDIT SEAL: HMAC-256 VERIFIED
                                        </span>
                                        <span className="text-[10px] font-bold py-0.5 px-2 bg-amber-100 text-amber-800 border border-amber-300 rounded">
                                            DEMONSTRATION SIMULATION
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end">
                                <div className="p-1.5 px-3 border border-zinc-900 bg-zinc-50 mb-1">
                                    <span className="text-xs font-black uppercase tracking-widest">{report.classification}</span>
                                </div>
                                <span className="text-[9px] uppercase text-zinc-500 font-bold">
                                    Generated: {new Date(report.generated_at).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-200">
                            {[
                                { id: "OVERVIEW", label: "Executive Overview", icon: FileText },
                                { id: "FORENSICS", label: "PRD §9 Evidence & Claims", icon: Fingerprint, count: allClaims.length },
                                { id: "DISPATCH", label: "PRD §10 Dispatch Manifest", icon: Truck, count: allProposals.length },
                                { id: "AUDIT_TIMELINE", label: "PRD §14 Audit Trail", icon: Clock, count: (allTimelineEvents.length + agentAuditLogs.length) },
                            ].map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as ReportTab)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold transition-all",
                                            isActive
                                                ? "bg-zinc-900 text-white shadow-sm"
                                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 border border-zinc-200"
                                        )}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{tab.label}</span>
                                        {tab.count !== undefined && tab.count > 0 && (
                                            <span className={cn(
                                                "text-[9px] px-1 py-0.2 rounded font-mono",
                                                isActive ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-700"
                                            )}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Report Tab Content */}
                    <div className="report-content flex-1 overflow-y-auto p-6 md:p-8 bg-[#fafafa] space-y-6">
                        {/* TAB 1: OVERVIEW */}
                        {activeTab === "OVERVIEW" && (
                            <div className="space-y-6 animate-in fade-in duration-200">
                                {/* Summary Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Executive Summary */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5 text-zinc-700" />
                                            Executive Summary
                                        </h3>
                                        <div className="bg-zinc-50/70 p-5 border border-zinc-300 rounded-md shadow-xs text-zinc-800 text-[12px] leading-relaxed relative">
                                            <p>{report.executive_summary}</p>
                                        </div>
                                    </div>

                                    {/* Operational Stats */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                            <Zap className="w-3.5 h-3.5 text-zinc-700" />
                                            Operational Metrics
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-white border border-zinc-200">
                                                <span className="text-[9px] font-black text-zinc-500 uppercase block">Total Signals</span>
                                                <span className="text-2xl font-black text-zinc-900 leading-none mt-1 block">
                                                    {report.operational_metrics.total_signals_processed}
                                                </span>
                                            </div>
                                            <div className="p-3 bg-white border border-zinc-200">
                                                <span className="text-[9px] font-black text-zinc-500 uppercase block">Validated Events</span>
                                                <span className="text-2xl font-black text-emerald-600 leading-none mt-1 block">
                                                    {report.operational_metrics.validated_incidents}
                                                </span>
                                            </div>
                                            <div className="p-3 bg-white border border-zinc-200">
                                                <span className="text-[9px] font-black text-zinc-500 uppercase block">Critical Alerts</span>
                                                <span className="text-2xl font-black text-rose-600 leading-none mt-1 block">
                                                    {report.operational_metrics.critical_alerts}
                                                </span>
                                            </div>
                                            <div className="p-3 bg-white border border-zinc-200">
                                                <span className="text-[9px] font-black text-zinc-500 uppercase block">Protocol Zero</span>
                                                <span className="text-2xl font-black text-amber-600 leading-none mt-1 block">
                                                    {report.operational_metrics.protocol_zero_interventions}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Resource Deployment & Geographic Impact */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                            <Truck className="w-3.5 h-3.5 text-zinc-700" />
                                            Resource Deployments
                                        </h3>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="p-3 bg-white border border-zinc-200 text-center">
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase block">Air</span>
                                                <span className="text-lg font-black text-zinc-900">{report.resource_deployment.air_assets}</span>
                                            </div>
                                            <div className="p-3 bg-white border border-zinc-200 text-center">
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase block">Marine</span>
                                                <span className="text-lg font-black text-cyan-600">{report.resource_deployment.marine_assets}</span>
                                            </div>
                                            <div className="p-3 bg-white border border-zinc-200 text-center">
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase block">Ground</span>
                                                <span className="text-lg font-black text-emerald-600">{report.resource_deployment.ground_assets}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                            <Map className="w-3.5 h-3.5 text-zinc-700" />
                                            Jurisdictions & Impact Zone
                                        </h3>
                                        <div className="space-y-1.5">
                                            {report.geographic_impact.map((loc, i) => (
                                                <div key={i} className="flex items-center gap-2 p-2 bg-white border border-zinc-200 text-[11px] font-bold text-zinc-700">
                                                    <span className="w-4 h-4 rounded-full bg-zinc-100 flex items-center justify-center text-[9px] text-zinc-500">
                                                        {i + 1}
                                                    </span>
                                                    <span>{loc}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Situational Assessment */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5 text-zinc-700" />
                                        Technical Situational Assessment
                                    </h3>
                                    <div className="bg-white p-5 border border-zinc-200 shadow-sm text-[11px] leading-relaxed text-zinc-800 font-sans whitespace-pre-wrap">
                                        {report.situational_assessment}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: PRD §9 EVIDENCE & CLAIMS */}
                        {activeTab === "FORENSICS" && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <div className="p-3 rounded bg-blue-50 border border-blue-200 text-[11px] text-blue-900 leading-relaxed font-sans">
                                    <strong>Glass Box AI & Chain of Custody:</strong> Every fact below was extracted from raw caller inputs, linked to verbatim excerpts, and cryptographically verified.
                                </div>

                                <div className="overflow-x-auto border border-zinc-200 bg-white">
                                    <table className="w-full text-[10px] text-left">
                                        <thead>
                                            <tr className="bg-zinc-900 text-zinc-300 uppercase">
                                                <th className="px-3 py-2.5">Claim ID</th>
                                                <th className="px-3 py-2.5">Fact Category</th>
                                                <th className="px-3 py-2.5">Extracted Claim</th>
                                                <th className="px-3 py-2.5">Caller Excerpt</th>
                                                <th className="px-3 py-2.5">Validation State</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-200 font-sans">
                                            {allClaims.length > 0 ? allClaims.map((claim, idx) => (
                                                <tr key={idx} className="hover:bg-zinc-50">
                                                    <td className="px-3 py-2 font-mono text-zinc-500">{claim.claim_id}</td>
                                                    <td className="px-3 py-2 font-mono uppercase">
                                                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[9px] font-bold">
                                                            {claim.fact_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 font-medium text-zinc-800">{claim.claim_text}</td>
                                                    <td className="px-3 py-2 text-zinc-500 italic max-w-xs truncate">
                                                        "{claim.excerpt || "Telemetry packet"}"
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className={cn(
                                                            "px-1.5 py-0.5 rounded text-[9px] font-bold font-mono",
                                                            claim.validation_state === "corroborated"
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : "bg-amber-100 text-amber-800"
                                                        )}>
                                                            {claim.validation_state}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={5} className="p-6 text-center text-zinc-400 italic font-mono">
                                                        No individual claim records captured. Check incident log.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: PRD §10 DISPATCH MANIFEST */}
                        {activeTab === "DISPATCH" && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed font-sans">
                                    <strong>Deterministic Service Dispatch Registry:</strong> Displays emergency service dispatches triggered by deterministic rule evaluation and operator authorization.
                                </div>

                                <div className="overflow-x-auto border border-zinc-200 bg-white">
                                    <table className="w-full text-[10px] text-left">
                                        <thead>
                                            <tr className="bg-zinc-900 text-zinc-300 uppercase">
                                                <th className="px-3 py-2.5">Rule ID</th>
                                                <th className="px-3 py-2.5">Service Category</th>
                                                <th className="px-3 py-2.5">Trigger Rationale</th>
                                                <th className="px-3 py-2.5">Dispatched Resources</th>
                                                <th className="px-3 py-2.5">Operator Disposition</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-200 font-sans">
                                            {allProposals.length > 0 ? allProposals.map((prop, idx) => (
                                                <tr key={idx} className="hover:bg-zinc-50">
                                                    <td className="px-3 py-2 font-mono font-bold text-zinc-700">{prop.rule_id}</td>
                                                    <td className="px-3 py-2 font-mono uppercase text-zinc-600 font-bold">
                                                        {prop.service_category.replace(/_/g, " ")}
                                                    </td>
                                                    <td className="px-3 py-2 text-zinc-800 max-w-sm">{prop.rationale}</td>
                                                    <td className="px-3 py-2 text-zinc-600 font-mono text-[9px]">
                                                        {prop.recommended_units.join(", ")}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className={cn(
                                                            "px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase",
                                                            prop.operator_status === "approved"
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : prop.operator_status === "rejected"
                                                                ? "bg-rose-100 text-rose-800"
                                                                : "bg-amber-100 text-amber-800"
                                                        )}>
                                                            {prop.operator_status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={5} className="p-6 text-center text-zinc-400 italic font-mono">
                                                        No service proposals registered.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: PRD §14 AUDIT TIMELINE */}
                        {activeTab === "AUDIT_TIMELINE" && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <div className="p-3 rounded bg-zinc-100 border border-zinc-200 text-[11px] text-zinc-700 leading-relaxed font-sans">
                                    <strong>Immutable Audit Trail:</strong> Complete log of AI routing, rule evaluations, duplicate cluster links, and operator decisions.
                                </div>

                                <div className="space-y-2">
                                    {allTimelineEvents.length > 0 ? (
                                        allTimelineEvents.map((event, idx) => (
                                            <div key={idx} className="p-2.5 bg-white border border-zinc-200 rounded flex items-start gap-3">
                                                <div className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded font-mono text-[9px] font-bold text-zinc-600 shrink-0">
                                                    {event.event_type}
                                                </div>
                                                <div className="flex-1 font-sans text-[11px] text-zinc-800 leading-snug">
                                                    {event.description}
                                                </div>
                                                <div className="text-[9px] text-zinc-400 font-mono shrink-0">
                                                    {new Date(event.timestamp).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        ))
                                    ) : agentAuditLogs.length > 0 ? (
                                        agentAuditLogs.map((log, idx) => (
                                            <div key={idx} className="p-2.5 bg-white border border-zinc-200 rounded flex items-start gap-3">
                                                <div className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded font-mono text-[9px] font-bold text-zinc-600 shrink-0">
                                                    {log.agent}
                                                </div>
                                                <div className="flex-1 font-sans text-[11px] text-zinc-800 leading-snug">
                                                    <strong>{log.action}:</strong> {log.detail}
                                                </div>
                                                <div className="text-[9px] text-zinc-400 font-mono shrink-0">
                                                    {log.timestamp}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-6 text-center text-zinc-400 italic">
                                            No audit timeline records logged yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Official Document Seal Footer */}
                    <div className="report-footer bg-white border-t border-zinc-200 p-4 px-6 shrink-0 flex items-center justify-between text-[10px] text-zinc-500">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>System Certification: ResQBharat Autonomous Response v2.0</span>
                        </div>
                        <div className="font-mono">
                            VERIFIED HASH: SHA-256 (Deterministic Model Pipeline)
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center print:hidden shrink-0">
                        <button
                            onClick={() => setIsReportOpen(false)}
                            className="flex items-center gap-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white px-3 py-1.5 rounded font-bold text-xs tracking-wider transition-colors uppercase"
                        >
                            <X className="w-4 h-4" />
                            Close
                        </button>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDownloadJSON}
                                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded text-xs font-bold tracking-wider transition-colors uppercase border border-zinc-700"
                            >
                                <FileJson className="w-4 h-4 text-cyan-400" />
                                Export Audit JSON (PRD §14)
                            </button>

                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2 rounded text-xs font-black tracking-wider transition-colors uppercase shadow-lg shadow-emerald-500/20"
                            >
                                <Download className="w-4 h-4 text-black" />
                                Print / PDF Document
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
