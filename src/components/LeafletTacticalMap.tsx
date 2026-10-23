"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSimulationStore } from "@/lib/store";
import { type Incident } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NASA_GIBS_LAYERS, NASA_GIBS_WMS_BASE_URL, getNasaGibsDateString } from "@/lib/nasa-gibs";

// Priority color mapping
const PRIORITY_COLORS = {
    CRITICAL: "#ef4444",
    HIGH: "#f97316",
    MEDIUM: "#eab308",
    LOW: "#22c55e",
    DEFAULT: "#06b6d4"
};

export default function LeafletTacticalMap({
    className,
    onSelectIncident,
    selectedIncidentId
}: {
    className?: string;
    onSelectIncident?: (id: string | null) => void;
    selectedIncidentId?: string | null;
}) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const nasaLayerRef = useRef<L.TileLayer.WMS | null>(null);
    const markersRef = useRef<Map<string, L.Marker>>(new Map());
    const { incidents, focusedIncidentId, spotlightId, activeMapCenter } = useSimulationStore();
    const [isSatelliteMode, setIsSatelliteMode] = useState(false);
    const [activeNasaLayer, setActiveNasaLayer] = useState<string>("NONE");
    const [nasaOpacity, setNasaOpacity] = useState<number>(0.75);

    // Default center: Bilaspur / New Delhi
    const defaultCenter: [number, number] = activeMapCenter
        ? [activeMapCenter.lat, activeMapCenter.lng]
        : [22.0797, 82.1409];

    // Initialize Leaflet map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: defaultCenter,
            zoom: activeMapCenter?.zoom || 14,
            zoomControl: false,
            attributionControl: false,
        });

        const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY || "";
        const darkTileUrl = cartoKey
            ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${cartoKey}`
            : "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png";

        const initialLayer = L.tileLayer(darkTileUrl, {
            maxZoom: 19,
            subdomains: "abcd",
        }).addTo(map);

        tileLayerRef.current = initialLayer;
        mapInstanceRef.current = map;

        // Cleanup on unmount
        return () => {
            map.remove();
            mapInstanceRef.current = null;
            markersRef.current.clear();
        };
    }, []);

    // Switch between Tactical Dark and High-Res Satellite View
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (tileLayerRef.current) {
            map.removeLayer(tileLayerRef.current);
        }

        const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY || "";
        const darkTileUrl = cartoKey
            ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${cartoKey}`
            : "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png";
        const satelliteTileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

        const newLayer = L.tileLayer(isSatelliteMode ? satelliteTileUrl : darkTileUrl, {
            maxZoom: 19,
            subdomains: isSatelliteMode ? [] : "abcd",
        }).addTo(map);

        tileLayerRef.current = newLayer;
    }, [isSatelliteMode]);

    // NASA GIBS Near Real-Time (NRT) WMS Layer Management
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (nasaLayerRef.current) {
            map.removeLayer(nasaLayerRef.current);
            nasaLayerRef.current = null;
        }

        if (activeNasaLayer === "NONE" || !NASA_GIBS_LAYERS[activeNasaLayer]) {
            return;
        }

        const layerConfig = NASA_GIBS_LAYERS[activeNasaLayer];
        const dateStr = getNasaGibsDateString();

        try {
            const wmsLayer = L.tileLayer.wms(NASA_GIBS_WMS_BASE_URL, {
                layers: layerConfig.wmsLayerName,
                format: layerConfig.format,
                transparent: true,
                opacity: nasaOpacity,
                time: dateStr,
                maxZoom: 9,
                zIndex: 200,
                attribution: "NASA EOSDIS GIBS",
            } as any).addTo(map);

            nasaLayerRef.current = wmsLayer;
        } catch (err) {
            console.error("[NASA-GIBS] Failed to load WMS layer:", err);
        }
    }, [activeNasaLayer, nasaOpacity]);

    // Handle fly to active scenario region center
    const lastMapCenterRef = useRef<string | null>(null);
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !activeMapCenter) return;
        const key = `${activeMapCenter.lat},${activeMapCenter.lng},${activeMapCenter.zoom || 14}`;
        if (key === lastMapCenterRef.current) return;
        lastMapCenterRef.current = key;

        map.flyTo([activeMapCenter.lat, activeMapCenter.lng], activeMapCenter.zoom || 14, {
            duration: 1.8,
            easeLinearity: 0.25,
        });
    }, [activeMapCenter]);

    // Sync markers with incidents
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        const currentMarkerIds = new Set<string>();

        const visibleIncidents = incidents.filter(
            i => i.location && i.location.lat && i.location.lng && !i.manual_trace_required
        );

        visibleIncidents.forEach(incident => {
            const { id, location, priority, status } = incident;
            currentMarkerIds.add(id);

            const color = PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.DEFAULT;
            const isCritical = priority === "CRITICAL";
            const isPending = status === "PENDING";

            // Custom HTML DivIcon for military HUD look
            const customIcon = L.divIcon({
                className: "custom-tactical-pin",
                html: isPending ? `
                    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                        <div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(6, 182, 212, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                        <div style="width: 10px; height: 10px; border-radius: 50%; background-color: #06b6d4; border: 2px dashed #ffffff; box-shadow: 0 0 10px #06b6d4;"></div>
                        <div style="position: absolute; bottom: -18px; font-family: monospace; font-size: 8px; font-weight: bold; color: #38bdf8; background: rgba(0,0,0,0.85); padding: 1px 4px; border-radius: 2px; white-space: nowrap; border: 1px solid rgba(56,189,248,0.3);">
                            ${id} [SIGNAL]
                        </div>
                    </div>
                ` : `
                    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                        ${isCritical ? `<div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(239, 68, 68, 0.25); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ""}
                        <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${color}; border: 2px solid white; box-shadow: 0 0 14px ${color}; transition: transform 0.2s;"></div>
                        <div style="position: absolute; bottom: -18px; font-family: monospace; font-size: 8px; font-weight: bold; color: rgba(255,255,255,0.85); background: rgba(0,0,0,0.8); padding: 1px 4px; border-radius: 2px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.15);">
                            ${id}
                        </div>
                    </div>
                `,
                iconSize: [36, 36],
                iconAnchor: [18, 18],
            });

            if (markersRef.current.has(id)) {
                // Update existing marker
                const existingMarker = markersRef.current.get(id)!;
                existingMarker.setLatLng([location.lat, location.lng]);
                existingMarker.setIcon(customIcon);
            } else {
                // Create new marker
                const marker = L.marker([location.lat, location.lng], { icon: customIcon }).addTo(map);

                marker.on("click", () => {
                    if (onSelectIncident) {
                        onSelectIncident(id);
                    }
                });

                markersRef.current.set(id, marker);
            }
        });

        // Remove old markers
        markersRef.current.forEach((marker, markerId) => {
            if (!currentMarkerIds.has(markerId)) {
                marker.remove();
                markersRef.current.delete(markerId);
            }
        });
    }, [incidents, onSelectIncident]);

    // Handle auto-fly on Spotlight or Focused incident
    const lastFlyIdRef = useRef<string | null>(null);
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        const targetId = focusedIncidentId || spotlightId;
        if (!targetId || targetId === lastFlyIdRef.current) return;

        const target = incidents.find(i => i.id === targetId);
        if (target?.location?.lat && target?.location?.lng) {
            map.flyTo([target.location.lat, target.location.lng], 14, {
                duration: 2.0,
                easeLinearity: 0.25,
            });
            lastFlyIdRef.current = targetId;
        }
    }, [focusedIncidentId, spotlightId, incidents]);

    return (
        <div className={`relative h-full w-full ${className}`}>
            {/* Tactical Map Basemap & NASA GIBS NRT Satellite Control Bar */}
            <div className="absolute top-3 left-3 z-[400] flex flex-col gap-1.5 max-w-[95%]">
                <div className="flex items-center gap-1 bg-black/90 backdrop-blur-md p-1 rounded-lg border border-white/10 shadow-xl overflow-x-auto tactical-scrollbar">
                    {/* Basemap buttons */}
                    <button
                        onClick={() => {
                            setIsSatelliteMode(false);
                            setActiveNasaLayer("NONE");
                        }}
                        className={cn(
                            "px-2 py-1 rounded text-[9px] font-mono font-bold tracking-wider transition-all whitespace-nowrap cursor-pointer",
                            !isSatelliteMode && activeNasaLayer === "NONE"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                : "text-zinc-400 hover:text-zinc-200"
                        )}
                    >
                        TACTICAL DARK
                    </button>
                    <button
                        onClick={() => {
                            setIsSatelliteMode(true);
                            setActiveNasaLayer("NONE");
                        }}
                        className={cn(
                            "px-2 py-1 rounded text-[9px] font-mono font-bold tracking-wider transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer",
                            isSatelliteMode && activeNasaLayer === "NONE"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                                : "text-zinc-400 hover:text-zinc-200"
                        )}
                    >
                        <span>🛰️ OPTICAL</span>
                    </button>

                    <div className="w-[1px] h-4 bg-white/20 mx-1 shrink-0" />

                    {/* NASA GIBS NRT Layer Buttons */}
                    <button
                        onClick={() => {
                            setActiveNasaLayer(prev => prev === "VIIRS_THERMAL" ? "NONE" : "VIIRS_THERMAL");
                            if (activeNasaLayer !== "VIIRS_THERMAL") setIsSatelliteMode(true);
                        }}
                        className={cn(
                            "px-2 py-1 rounded text-[9px] font-mono font-bold tracking-wider transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer border",
                            activeNasaLayer === "VIIRS_THERMAL"
                                ? "bg-red-950/80 border-red-500 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse"
                                : "bg-black/40 border-white/5 text-zinc-400 hover:text-red-300 hover:border-red-500/30"
                        )}
                        title="NASA VIIRS Active Fires & Thermal Radiation (375m NRT)"
                    >
                        <span>🔥 NASA THERMAL</span>
                    </button>

                    <button
                        onClick={() => {
                            setActiveNasaLayer(prev => prev === "MODIS_FLOOD" ? "NONE" : "MODIS_FLOOD");
                            if (activeNasaLayer !== "MODIS_FLOOD") setIsSatelliteMode(false);
                        }}
                        className={cn(
                            "px-2 py-1 rounded text-[9px] font-mono font-bold tracking-wider transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer border",
                            activeNasaLayer === "MODIS_FLOOD"
                                ? "bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.5)] animate-pulse"
                                : "bg-black/40 border-white/5 text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/30"
                        )}
                        title="NASA MODIS Bands 7-2-1 False Color Flood & Water Inundation (250m)"
                    >
                        <span>🌊 NASA FLOOD (7-2-1)</span>
                    </button>

                    <button
                        onClick={() => {
                            setActiveNasaLayer(prev => prev === "VIIRS_SMOKE_IR" ? "NONE" : "VIIRS_SMOKE_IR");
                            if (activeNasaLayer !== "VIIRS_SMOKE_IR") setIsSatelliteMode(false);
                        }}
                        className={cn(
                            "px-2 py-1 rounded text-[9px] font-mono font-bold tracking-wider transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer border",
                            activeNasaLayer === "VIIRS_SMOKE_IR"
                                ? "bg-purple-950/80 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                                : "bg-black/40 border-white/5 text-zinc-400 hover:text-purple-300 hover:border-purple-500/30"
                        )}
                        title="NASA VIIRS Infrared Multi-band Smoke, Ash & Cyclone Penetration"
                    >
                        <span>🌪️ NASA SMOKE/IR</span>
                    </button>

                    <button
                        onClick={() => {
                            setActiveNasaLayer(prev => prev === "TRUE_COLOR" ? "NONE" : "TRUE_COLOR");
                            if (activeNasaLayer !== "TRUE_COLOR") setIsSatelliteMode(false);
                        }}
                        className={cn(
                            "px-2 py-1 rounded text-[9px] font-mono font-bold tracking-wider transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer border",
                            activeNasaLayer === "TRUE_COLOR"
                                ? "bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                                : "bg-black/40 border-white/5 text-zinc-400 hover:text-amber-300 hover:border-amber-500/30"
                        )}
                        title="NASA VIIRS True Color Natural Earth Observation"
                    >
                        <span>🛰️ TRUE COLOR NRT</span>
                    </button>
                </div>

                {/* NASA Active Layer Telemetry Chip & Opacity Controller */}
                {activeNasaLayer !== "NONE" && NASA_GIBS_LAYERS[activeNasaLayer] && (
                    <div className="flex items-center justify-between gap-3 bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/30 shadow-lg text-[10px] font-mono">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                            <span className="text-cyan-300 font-bold">
                                {NASA_GIBS_LAYERS[activeNasaLayer].sensor}
                            </span>
                            <span className="text-zinc-500">//</span>
                            <span className="text-zinc-400">
                                RES: {NASA_GIBS_LAYERS[activeNasaLayer].resolution}
                            </span>
                            <span className="text-zinc-500">//</span>
                            <span className="text-emerald-400">
                                PASS: {getNasaGibsDateString()} UTC (NRT)
                            </span>
                        </div>

                        {/* Opacity slider */}
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500">OPACITY:</span>
                            <input
                                type="range"
                                min="0.2"
                                max="1.0"
                                step="0.05"
                                value={nasaOpacity}
                                onChange={(e) => setNasaOpacity(parseFloat(e.target.value))}
                                className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            />
                            <span className="text-cyan-400 w-7 text-right">
                                {Math.round(nasaOpacity * 100)}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div ref={mapContainerRef} className="h-full w-full z-0 bg-zinc-950" />
        </div>
    );
}
