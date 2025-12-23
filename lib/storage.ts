import type { Pin } from "./types";

const LS_KEY = "italyTrip:pins:v1";

export function loadPins(): Pin[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(LS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed as Pin[];
    } catch {
        return [];
    }
}

export function savePins(pins: Pin[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_KEY, JSON.stringify(pins));
}
