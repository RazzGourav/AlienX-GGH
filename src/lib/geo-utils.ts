import mockStationsData from "@/data/mock_stations.json";
import { MockStation, MockUnit, ServiceCategory } from "./types";

/**
 * Calculates great-circle distance between two points on the Earth using Haversine formula.
 * PRD §12: Returns estimated distance in kilometers (clearly labelled as estimate, not live travel time).
 */
export function calculateHaversineDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's mean radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;

    return Math.round(d * 10) / 10; // 1 decimal place
}

export interface MatchedResourceCandidate {
    station: MockStation;
    unit: MockUnit;
    distance_km: number;
    distance_label: string;
    is_available: boolean;
}

/**
 * Finds matching mock resources in the seeded Indian stations dataset closest to an incident.
 */
export function findNearestMockResources(
    incidentLat: number,
    incidentLng: number,
    category: ServiceCategory,
    limit: number = 3
): MatchedResourceCandidate[] {
    const stations = mockStationsData as unknown as MockStation[];
    const candidates: MatchedResourceCandidate[] = [];

    for (const station of stations) {
        const distance = calculateHaversineDistanceKm(
            incidentLat,
            incidentLng,
            station.location.lat,
            station.location.lng
        );

        for (const unit of station.units) {
            if (unit.service_category === category) {
                candidates.push({
                    station,
                    unit,
                    distance_km: distance,
                    distance_label: `~${distance} km (Simulated Est.)`,
                    is_available: unit.status === "AVAILABLE",
                });
            }
        }
    }

    // Sort by: availability first, then shortest distance
    candidates.sort((a, b) => {
        if (a.is_available && !b.is_available) return -1;
        if (!a.is_available && b.is_available) return 1;
        return a.distance_km - b.distance_km;
    });

    return candidates.slice(0, limit);
}

/**
 * Calculates the cardinal compass bearing (N, NE, E, SE, S, SW, W, NW) from origin to target.
 */
export function calculateCompassBearing(lat1: number, lon1: number, lat2: number, lon2: number): string {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
    const x =
        Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
        Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);

    let brng = (Math.atan2(y, x) * 180) / Math.PI;
    brng = (brng + 360) % 360;

    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(brng / 22.5) % 16;
    return directions[index];
}
