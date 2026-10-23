"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSimulationStore } from "@/lib/store";
import { type Incident } from "@/lib/types";

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
    const markersRef = useRef<Map<string, L.Marker>>(new Map());
    const { incidents, focusedIncidentId, spotlightId, activeMapCenter } = useSimulationStore();

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

        // Add CartoDB Dark Matter tiles (Dark Tactical Theme with CARTO API Key)
        const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY || "";
        const tileUrl = cartoKey
            ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${cartoKey}`
            : "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png";

        L.tileLayer(tileUrl, {
            maxZoom: 19,
            subdomains: "abcd",
        }).addTo(map);

        mapInstanceRef.current = map;

        // Cleanup on unmount
        return () => {
            map.remove();
            mapInstanceRef.current = null;
            markersRef.current.clear();
        };
    }, []);

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
            <div ref={mapContainerRef} className="h-full w-full z-0 bg-zinc-950" />
        </div>
    );
}
