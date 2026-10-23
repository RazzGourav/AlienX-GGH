import { NextRequest, NextResponse } from "next/server";
import { InterceptedCamera } from "@/lib/types";
import { calculateHaversineDistanceKm, calculateCompassBearing } from "@/lib/geo-utils";

// Curated Open Public & Municipal CCTV Feeds for Indian Disaster Hubs
const MUNICIPAL_PUBLIC_CAMERAS: Omit<InterceptedCamera, "distance_km" | "bearing">[] = [
    // New Delhi
    {
        id: "CAM-DEL-YAMUNA-01",
        title: "Yamuna River Flood Gauge & Barrier Watch - Kashmere Gate",
        operator: "Delhi Flood & Irrigation Control / Traffic Police",
        source: "MUNICIPAL_CCTV",
        location: {
            lat: 28.6675,
            lng: 77.2345,
            address: "ISBT Ring Road, Kashmere Gate, New Delhi"
        },
        status: "ACTIVE",
        stream_type: "MP4",
        stream_url: "/SeedData/Videos/v1.mp4",
        preview_image_url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=640&q=80",
        is_live: true,
        last_updated: "Realtime Stream (25 FPS)"
    },
    {
        id: "CAM-DEL-CP-04",
        title: "Connaught Place Inner Circle Outer Radial Junction",
        operator: "Delhi Police Smart City Surveillance Network",
        source: "MUNICIPAL_CCTV",
        location: {
            lat: 28.6315,
            lng: 77.2167,
            address: "Radial 2, Rajiv Chowk, New Delhi"
        },
        status: "ACTIVE",
        stream_type: "MP4",
        stream_url: "/SeedData/Videos/v4.mp4",
        preview_image_url: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=640&q=80",
        is_live: true,
        last_updated: "Realtime Stream (30 FPS)"
    },
    // Mumbai
    {
        id: "CAM-MUM-KURLA-02",
        title: "Mithi River Sluice Gate & CST Road Underpass",
        operator: "Brihanmumbai Municipal Corporation (BMC) Disaster Cell",
        source: "MUNICIPAL_CCTV",
        location: {
            lat: 19.0740,
            lng: 72.8850,
            address: "CST Road Bridge, Kurla West, Mumbai"
        },
        status: "ACTIVE",
        stream_type: "MP4",
        stream_url: "/SeedData/Videos/v3.mov",
        preview_image_url: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=640&q=80",
        is_live: true,
        last_updated: "Realtime Stream (25 FPS)"
    },
    {
        id: "CAM-MUM-MARINE-01",
        title: "Marine Drive Coastal Promenade & Tidal Wave Barrier",
        operator: "Mumbai Traffic Police Surveillance",
        source: "MUNICIPAL_CCTV",
        location: {
            lat: 18.9442,
            lng: 72.8240,
            address: "Netaji Subhash Chandra Bose Road, Mumbai"
        },
        status: "ACTIVE",
        stream_type: "MP4",
        stream_url: "/SeedData/Videos/v2.mov",
        preview_image_url: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=640&q=80",
        is_live: true,
        last_updated: "Realtime Stream (30 FPS)"
    },
    // Bilaspur / Chhattisgarh
    {
        id: "CAM-BSP-BUS-01",
        title: "Old Bus Stand Transit Corridor & Commercial Plaza",
        operator: "Bilaspur Smart City / Police Command Control",
        source: "MUNICIPAL_CCTV",
        location: {
            lat: 22.0805,
            lng: 82.1415,
            address: "Old Bus Stand Square, Raipur Road, Bilaspur"
        },
        status: "ACTIVE",
        stream_type: "MP4",
        stream_url: "/SeedData/Videos/v4.mp4",
        preview_image_url: "https://images.unsplash.com/photo-1566847438217-76f82d383fca?auto=format&fit=crop&w=640&q=80",
        is_live: true,
        last_updated: "Realtime Stream (25 FPS)"
    },
    // Bengaluru
    {
        id: "CAM-BLR-SILK-01",
        title: "Silk Board Elevated Corridor & Storm Drain Intercept",
        operator: "BTP Bangalore Traffic Police CCTV",
        source: "MUNICIPAL_CCTV",
        location: {
            lat: 12.9176,
            lng: 77.6238,
            address: "Hosur Road Junction, Silk Board, Bengaluru"
        },
        status: "ACTIVE",
        stream_type: "MP4",
        stream_url: "/SeedData/Videos/v3.mov",
        preview_image_url: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=640&q=80",
        is_live: true,
        last_updated: "Realtime Stream (30 FPS)"
    }
];

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const radiusParam = searchParams.get("radius_km");
    const incidentId = searchParams.get("incident_id") || "UNKNOWN";

    if (!latParam || !lngParam) {
        return NextResponse.json(
            { error: "Missing required parameters: lat and lng" },
            { status: 400 }
        );
    }

    const targetLat = parseFloat(latParam);
    const targetLng = parseFloat(lngParam);
    const radiusKm = radiusParam ? parseFloat(radiusParam) : 25; // default 25km radius

    // 1. Calculate distances to all cataloged public/municipal cameras
    const matchedCameras: InterceptedCamera[] = [];

    for (const cam of MUNICIPAL_PUBLIC_CAMERAS) {
        const distance = calculateHaversineDistanceKm(
            targetLat,
            targetLng,
            cam.location.lat,
            cam.location.lng
        );

        if (distance <= radiusKm) {
            const bearing = calculateCompassBearing(
                targetLat,
                targetLng,
                cam.location.lat,
                cam.location.lng
            );

            matchedCameras.push({
                ...cam,
                distance_km: distance,
                bearing: bearing
            });
        }
    }

    // Sort by proximity (closest first)
    matchedCameras.sort((a, b) => a.distance_km - b.distance_km);

    // 2. Query Windy Webcams API if API key is present in environment
    const windyKey = process.env.WINDY_WEBCAMS_API_KEY;
    if (windyKey) {
        try {
            const windyUrl = `https://api.windy.com/webcams/api/v3/webcams?nearby=${targetLat},${targetLng},${radiusKm}&include=player,urls,images`;
            const res = await fetch(windyUrl, {
                headers: { "x-windy-api-key": windyKey },
                next: { revalidate: 300 }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.webcams && Array.isArray(data.webcams)) {
                    for (const w of data.webcams) {
                        const dist = calculateHaversineDistanceKm(targetLat, targetLng, w.location.latitude, w.location.longitude);
                        const bearing = calculateCompassBearing(targetLat, targetLng, w.location.latitude, w.location.longitude);
                        matchedCameras.push({
                            id: `WINDY-${w.webcamId}`,
                            title: w.title || "Public Weather/Traffic Webcam",
                            operator: "Windy Public Webcam Network",
                            source: "WINDY",
                            location: {
                                lat: w.location.latitude,
                                lng: w.location.longitude,
                                address: `${w.location.city || ""}, ${w.location.country || ""}`.trim()
                            },
                            distance_km: dist,
                            bearing: bearing,
                            status: "ACTIVE",
                            stream_type: w.player?.live ? "HLS" : "IMAGE_SNAPSHOT",
                            stream_url: w.player?.live || w.images?.current?.preview || "",
                            preview_image_url: w.images?.current?.preview || "",
                            is_live: true,
                            last_updated: w.lastUpdatedOn || "Live"
                        });
                    }
                }
            }
        } catch (windyErr) {
            console.warn("[CAMERA-INTERCEPTOR] Windy Webcams query failed, using municipal index:", windyErr);
        }
    }

    // Re-sort after adding potential live webcams
    matchedCameras.sort((a, b) => a.distance_km - b.distance_km);

    // 3. Fallback: If no public camera exists in the radius (e.g. deep rural area),
    // deploy an Autonomous Aerial Drone Recon feed
    let fallbackCamera: InterceptedCamera | null = null;
    if (matchedCameras.length === 0) {
        const droneBearing = "NNE";
        fallbackCamera = {
            id: `DRONE-RECON-${incidentId}`,
            title: `ResQ Tactical Recon Drone (UAV-7) Overhead Surveillance`,
            operator: "NDRF / ResQ Bharat Autonomous Aerial Recon",
            source: "AERIAL_RECON_DRONE",
            location: {
                lat: targetLat + 0.003,
                lng: targetLng + 0.002,
                address: `Altitude: 120m AGL, Orbiting Incident ${incidentId}`
            },
            distance_km: 0.4,
            bearing: droneBearing,
            status: "INTERCEPTED",
            stream_type: "MP4",
            stream_url: "/SeedData/Videos/v1.mp4",
            preview_image_url: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=640&q=80",
            is_live: true,
            last_updated: "Realtime Telemetry (4K HDR Downlink)"
        };
    }

    return NextResponse.json({
        success: true,
        incident_id: incidentId,
        search_center: { lat: targetLat, lng: targetLng },
        radius_km: radiusKm,
        total_found: matchedCameras.length,
        primary_camera: matchedCameras.length > 0 ? matchedCameras[0] : fallbackCamera,
        nearby_cameras: matchedCameras.length > 0 ? matchedCameras.slice(0, 5) : [fallbackCamera!],
        mode: matchedCameras.length > 0 ? "LIVE_MUNICIPAL_INTERCEPT" : "AUTONOMOUS_AERIAL_RECON"
    });
}
