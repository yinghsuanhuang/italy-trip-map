"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapView from "@/components/MapView";
import PinModal from "@/components/PinModal";
import type { Pin, PinType } from "@/lib/types";
import { loadPins, savePins } from "@/lib/storage";

type Draft = {
    id?: string;
    type: PinType;
    name: string;
    lat: number;
    lng: number;
    note: string;
    stayMinutes: number; // ✅ UI 層保證一定有值
    createdAt?: number;
    updatedAt?: number;
    placeId?: string;
    address?: string;
};

function markerColor(type: PinType) {
    return type === "restaurant" ? "#f97316" : "#3b82f6"; // orange / blue
}

function defaultStay(type: PinType) {
    return type === "restaurant" ? 60 : 90;
}

export default function HomeClient() {
    const [pins, setPins] = useState<Pin[]>([]);
    const mapRef = useRef<google.maps.Map | null>(null);

    // markers by pinId
    const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

    // modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [draft, setDraft] = useState<Draft | null>(null);

    // load from localStorage
    useEffect(() => {
        const loaded = loadPins();
        setPins(loaded);
    }, []);

    // persist
    useEffect(() => {
        savePins(pins);
    }, [pins]);

    // render markers whenever pins or map changes
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // remove markers no longer exist
        for (const [id, mk] of markersRef.current.entries()) {
            if (!pins.some((p) => p.id === id)) {
                mk.setMap(null);
                markersRef.current.delete(id);
            }
        }

        // add/update markers
        for (const p of pins) {
            const existing = markersRef.current.get(p.id);
            const position = { lat: p.lat, lng: p.lng };

            if (!existing) {
                const mk = new google.maps.Marker({
                    map,
                    position,
                    title: p.name,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: markerColor(p.type),
                        fillOpacity: 1,
                        strokeColor: "white",
                        strokeWeight: 2,
                        scale: 8,
                    },
                });

                mk.addListener("click", () => {
                    setModalMode("edit");
                    setDraft({
                        id: p.id,
                        type: p.type,
                        name: p.name,
                        lat: p.lat,
                        lng: p.lng,
                        note: p.note ?? "",
                        // ✅ 關鍵：避免 number | undefined
                        stayMinutes: p.stayMinutes ?? defaultStay(p.type),
                        createdAt: p.createdAt,
                        updatedAt: p.updatedAt,
                    });
                    setModalOpen(true);
                });

                markersRef.current.set(p.id, mk);
            } else {
                existing.setPosition(position);
                existing.setTitle(p.name);
                existing.setIcon({
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: markerColor(p.type),
                    fillOpacity: 1,
                    strokeColor: "white",
                    strokeWeight: 2,
                    scale: 8,
                });
            }
        }
    }, [pins]);

    const openCreateAt = (lat: number, lng: number) => {
        setModalMode("create");
        setDraft({
            type: "spot",
            name: "",
            lat,
            lng,
            note: "",
            stayMinutes: 90,
        });
        setModalOpen(true);
    };

    // ✅ normalize: 自動補齊 stayMinutes/createdAt/updatedAt，避免資料不完整與 TS 噴錯
    const handleSave = (pin: Pin) => {
        const now = Date.now();
        const normalized: Pin = {
            ...pin,
            stayMinutes: pin.stayMinutes ?? defaultStay(pin.type),
            createdAt: pin.createdAt ?? now,
            updatedAt: now,
        };

        setPins((prev) => {
            const idx = prev.findIndex((p) => p.id === normalized.id);

            // new
            if (idx === -1) return [...prev, normalized];

            // update (保留最早 createdAt)
            const existing = prev[idx];
            const next = [...prev];
            next[idx] = {
                ...existing,
                ...normalized,
                createdAt: existing.createdAt ?? normalized.createdAt,
            };
            return next;
        });
    };

    const handleDelete = (pinId: string) => {
        setPins((prev) => prev.filter((p) => p.id !== pinId));
    };

    const pinsCountText = useMemo(() => `${pins.length} pins`, [pins.length]);

    return (
        <main className="w-screen h-screen relative">
            <MapView
                onMapReady={(map) => {
                    mapRef.current = map;

                    // 點地圖新增 pin
                    map.addListener("click", (e: google.maps.MapMouseEvent) => {
                        if (!e.latLng) return;

                        // 先開 modal（讓 UI 立即有反應）
                        openCreateAt(e.latLng.lat(), e.latLng.lng());

                        // 如果點到 Google 的 POI，會有 placeId
                        const placeId = (e as any).placeId as string | undefined;
                        if (!placeId) return;

                        // 阻止預設的 POI info window（可選，但建議）
                        if (typeof (e as any).stop === "function") (e as any).stop();

                        const service = new google.maps.places.PlacesService(map);
                        service.getDetails(
                            { placeId, fields: ["name", "place_id", "formatted_address"] },
                            (place, status) => {
                                if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return;

                                // 把名稱自動填進 modal
                                setDraft((prev) => {
                                    if (!prev) return prev;
                                    return {
                                        ...prev,
                                        name: place.name ?? prev.name,
                                        // 你之後要做營業時間檢查，一定會用到 placeId
                                        // 先存著（PinModal 不用顯示也沒關係）
                                        placeId: place.place_id ?? placeId,
                                        address: place.formatted_address ?? undefined,
                                    } as any;
                                });
                            }
                        );
                    });

                }}
            />

            {/* small badge */}
            <div className="absolute top-3 left-3 rounded-xl bg-white/90 shadow px-3 py-2 text-sm">
                {pinsCountText}（點地圖可新增）
            </div>

            <PinModal
                open={modalOpen}
                mode={modalMode}
                initial={draft}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                onDelete={modalMode === "edit" ? handleDelete : undefined}
            />
        </main>
    );
}
