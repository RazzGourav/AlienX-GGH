import fs from "fs";
import path from "path";
import { Incident } from "./types";

export type ExecutionMode = "LIVE_AI" | "ZERO_QUOTA_SIMULATION";

export interface QuotaStatus {
    mode: ExecutionMode;
    requestsThisMinute: number;
    maxRPM: number;
    isSafe: boolean;
    totalToday: number;
    cachedHitCount: number;
    message: string;
}

interface StoredQuotaState {
    requestTimestamps: number[];
    dailyRequestCount: number;
    cacheHits: number;
    cache: Record<string, Partial<Incident>>;
    mode: ExecutionMode;
    lastSaved: number;
}

// Maximum safe RPM for Free Tier (Cap at 6 to guarantee safety well below Google's 15 RPM limit)
export const SAFE_MAX_RPM = 6;

// File path for multi-worker synchronization across Turbopack threads
const STATE_FILE_PATH = path.join(process.cwd(), ".next", "resq_quota_state.json");

function loadState(): StoredQuotaState {
    try {
        if (fs.existsSync(STATE_FILE_PATH)) {
            const raw = fs.readFileSync(STATE_FILE_PATH, "utf-8");
            return JSON.parse(raw);
        }
    } catch (e) {
        // Fall back to default on read error
    }

    return {
        requestTimestamps: [],
        dailyRequestCount: 0,
        cacheHits: 0,
        cache: {},
        mode: "LIVE_AI",
        lastSaved: Date.now(),
    };
}

function saveState(state: StoredQuotaState): void {
    try {
        const dir = path.dirname(STATE_FILE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        state.lastSaved = Date.now();
        fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2), "utf-8");
    } catch (e) {
        // Ignore file lock errors during rapid writes
    }
}

/**
 * Simple deterministic hash for cache keys
 */
export function generateInputHash(input: string, type: string = "UNKNOWN"): string {
    let hash = 0;
    const str = `${type}:${input.trim()}`;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return `CACHE_${Math.abs(hash)}`;
}

/**
 * Checks if a request can be made safely under Free-Tier RPM constraints.
 */
export function canMakeAPIRequest(): { allowed: boolean; waitTimeMs: number } {
    const state = loadState();
    const now = Date.now();

    // Purge timestamps older than 60 seconds
    const activeTimestamps = state.requestTimestamps.filter(t => now - t <= 60000);
    if (activeTimestamps.length !== state.requestTimestamps.length) {
        state.requestTimestamps = activeTimestamps;
        saveState(state);
    }

    if (state.mode === "ZERO_QUOTA_SIMULATION") {
        return { allowed: false, waitTimeMs: 0 };
    }

    if (activeTimestamps.length >= SAFE_MAX_RPM) {
        const oldest = activeTimestamps[0];
        const waitTimeMs = Math.max(0, 60000 - (now - oldest));
        return { allowed: false, waitTimeMs };
    }

    return { allowed: true, waitTimeMs: 0 };
}

/**
 * Records an executed API request.
 */
export function recordAPIRequest(): void {
    const state = loadState();
    const now = Date.now();
    state.requestTimestamps = state.requestTimestamps.filter(t => now - t <= 60000);
    state.requestTimestamps.push(now);
    state.dailyRequestCount++;
    saveState(state);
}

/**
 * Gets cached extraction result if present.
 */
export function getCachedExtraction(input: string, type: string = "UNKNOWN"): Partial<Incident> | null {
    const state = loadState();
    const key = generateInputHash(input, type);
    if (state.cache[key]) {
        state.cacheHits++;
        saveState(state);
        return state.cache[key] || null;
    }
    return null;
}

/**
 * Saves extraction result into cache.
 */
export function setCachedExtraction(input: string, type: string, result: Partial<Incident>): void {
    const state = loadState();
    const key = generateInputHash(input, type);
    state.cache[key] = result;
    saveState(state);
}

/**
 * Sets current execution mode.
 */
export function setExecutionMode(mode: ExecutionMode): void {
    const state = loadState();
    state.mode = mode;
    saveState(state);
}

/**
 * Returns current Free-Tier Quota Health metrics.
 */
export function getQuotaMetrics(overrideMode?: ExecutionMode): QuotaStatus {
    const state = loadState();
    const now = Date.now();
    const activeTimestamps = state.requestTimestamps.filter(t => now - t <= 60000);

    const currentRPM = activeTimestamps.length;
    const isSafe = currentRPM < SAFE_MAX_RPM;
    const currentMode = overrideMode || state.mode;

    return {
        mode: currentMode,
        requestsThisMinute: currentRPM,
        maxRPM: SAFE_MAX_RPM,
        isSafe,
        totalToday: state.dailyRequestCount,
        cachedHitCount: state.cacheHits,
        message: currentMode === "ZERO_QUOTA_SIMULATION"
            ? "Zero-Quota Simulation Active (0 Live API Calls)"
            : isSafe
            ? `API Safe: ${currentRPM}/${SAFE_MAX_RPM} RPM`
            : `Pacing Traffic: ${currentRPM}/${SAFE_MAX_RPM} RPM`,
    };
}
