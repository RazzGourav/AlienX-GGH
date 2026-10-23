/**
 * NASA GIBS (Global Imagery Browse Services) & EOSDIS Worldview Configuration
 * EPSG:3857 (Web Mercator) Near Real-Time (NRT) satellite observation layers.
 */

export interface NasaGibsLayerConfig {
    id: string;
    name: string;
    shortName: string;
    description: string;
    sensor: string;
    resolution: string;
    wmsLayerName: string;
    format: "image/png" | "image/jpeg";
    isTransparent: boolean;
    colorBadge: string;
    icon: string;
    operationalUseCase: string;
}

export const NASA_GIBS_WMS_BASE_URL = "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi";

export const NASA_GIBS_LAYERS: Record<string, NasaGibsLayerConfig> = {
    VIIRS_THERMAL: {
        id: "VIIRS_THERMAL",
        name: "NASA VIIRS Active Fires & Thermal Anomalies",
        shortName: "THERMAL / FIRES",
        description: "Thermal hotspot radiation highlighting active industrial fires, gas ruptures, and explosions.",
        sensor: "VIIRS (Suomi-NPP / NOAA-20)",
        resolution: "375m",
        wmsLayerName: "VIIRS_SNPP_Thermal_Anomalies_375m_All",
        format: "image/png",
        isTransparent: true,
        colorBadge: "bg-red-500/20 text-red-400 border-red-500/50",
        icon: "🔥",
        operationalUseCase: "Factory explosions, LPG gas line ruptures, urban fires"
    },
    MODIS_FLOOD: {
        id: "MODIS_FLOOD",
        name: "NASA MODIS Flood Extent & Water Inundation",
        shortName: "FLOOD / WATER",
        description: "False-color Shortwave Infrared (Bands 7-2-1). Standing water appears black/cyan; soil is red, vegetation is neon green.",
        sensor: "MODIS (Terra / Aqua)",
        resolution: "250m",
        wmsLayerName: "MODIS_Terra_SurfaceReflectance_Bands721",
        format: "image/jpeg",
        isTransparent: false,
        colorBadge: "bg-cyan-500/20 text-cyan-300 border-cyan-400/50",
        icon: "🌊",
        operationalUseCase: "Monsoon river overflow, dam sluice breaches, urban flash floods"
    },
    VIIRS_SMOKE_IR: {
        id: "VIIRS_SMOKE_IR",
        name: "NASA VIIRS Multi-band Smoke, Ash & Cyclone IR",
        shortName: "SMOKE / CYCLONE",
        description: "Infrared multi-band penetration (M11-I2-I1) cutting through atmospheric haze to expose burn scars and cyclone vortexes.",
        sensor: "VIIRS Day/Night Band",
        resolution: "375m",
        wmsLayerName: "VIIRS_SNPP_CorrectedReflectance_BandsM11-I2-I1",
        format: "image/jpeg",
        isTransparent: false,
        colorBadge: "bg-purple-500/20 text-purple-300 border-purple-400/50",
        icon: "🌪️",
        operationalUseCase: "Chemical gas leaks, industrial smoke plumes, tropical cyclone tracking"
    },
    TRUE_COLOR: {
        id: "TRUE_COLOR",
        name: "NASA VIIRS Near Real-Time Natural Color",
        shortName: "TRUE COLOR NRT",
        description: "Daily daylight natural-color orbital pass providing planetary situational awareness.",
        sensor: "VIIRS (Suomi-NPP)",
        resolution: "250m",
        wmsLayerName: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
        format: "image/jpeg",
        isTransparent: false,
        colorBadge: "bg-amber-500/20 text-amber-300 border-amber-400/50",
        icon: "🛰️",
        operationalUseCase: "Daylight orbital assessment of terrain and cloud cover"
    }
};

/**
 * Returns the latest valid UTC date string formatted as YYYY-MM-DD for NASA GIBS.
 * Satellite passes take a few hours to process; if current UTC hour is early morning (< 04:00 UTC),
 * we query yesterday to guarantee a 100% complete global orbital mosaic.
 */
export function getNasaGibsDateString(): string {
    const now = new Date();
    // If before 04:00 UTC, shift to yesterday to ensure full global composite is processed
    if (now.getUTCHours() < 4) {
        now.setUTCDate(now.getUTCDate() - 1);
    }
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
