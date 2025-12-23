"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapView from "@/components/MapView";
import PinModal from "@/components/PinModal";
import PlaceSearch from "@/components/PlaceSearch";
import type { Pin, PinType } from "@/lib/types";
import { loadPins, savePins } from "@/lib/storage";

type Draft = {
    id?: string;
    type: PinType;
    name: string;
    lat: number;
    lng: number;
    note: string;
    stayMinutes: number;
    createdAt?: number;
    updatedAt?: number;
    placeId?: string;
    address?: string;
};

function markerColor(type: PinType) {
    return type === "restaurant" ? "#f97316" : "#3b82f6";
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
        setPins(loadPins());
    }, []);

    // persist
    useEffect(() => {
        savePins(pins);
    }, [pins]);

    // render markers whenever pins or map changes
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // remove markers
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
                        stayMinutes: p.stayMinutes ?? defaultStay(p.type),
                        createdAt: p.createdAt,
                        updatedAt: p.updatedAt,
                        placeId: p.placeId,
                        address: p.address,
                    });
                    setModalOpen(true);
                });

                markersRef.current.set(p.id, mk);
            } else {
                existing.setPosition(position);
            }
        }
    }, [pins]);

    /** 開啟新增 modal（地圖點擊 or 搜尋都走這） */
    const openCreateAt = (
        lat: number,
        lng: number,
        prefill?: Partial<{
            name: string;
            type: PinType;
            note: string;
            stayMinutes: number;
            placeId: string;
            address: string;
        }>
    ) => {
        const t = prefill?.type ?? "spot";

        setModalMode("create");
        setDraft({
            type: t,
            name: prefill?.name ?? "",
            lat,
            lng,
            note: prefill?.note ?? "",
            stayMinutes: prefill?.stayMinutes ?? defaultStay(t),
            placeId: prefill?.placeId,
            address: prefill?.address,
        });
        setModalOpen(true);
    };

    /** 存檔（補齊必要欄位） */
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
            if (idx === -1) return [...prev, normalized];

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
            {/* 地圖 */}
            <MapView
                onMapReady={(map) => {
                    mapRef.current = map;

                    // 點地圖新增 pin（POI 會自動補名稱）
                    map.addListener("click", (e: google.maps.MapMouseEvent) => {
                        if (!e.latLng) return;

                        openCreateAt(e.latLng.lat(), e.latLng.lng());

                        const placeId = (e as any).placeId as string | undefined;
                        if (!placeId) return;

                        if (typeof (e as any).stop === "function") (e as any).stop();

                        const service = new google.maps.places.PlacesService(map);
                        service.getDetails(
                            { placeId, fields: ["name", "formatted_address"] },
                            (place, status) => {
                                if (
                                    status !== google.maps.places.PlacesServiceStatus.OK ||
                                    !place
                                )
                                    return;

                                setDraft((prev) =>
                                    prev
                                        ? {
                                            ...prev,
                                            name: place.name ?? prev.name,
                                            placeId,
                                            address: place.formatted_address ?? undefined,
                                        }
                                        : prev
                                );
                            }
                        );
                    });
                }}
            />

            {/* 🔍 搜尋新增 pin（自動判斷餐廳/景點） */}
            <PlaceSearch
                map={mapRef.current}
                onPickPlace={({ name, lat, lng, type, placeId, address }) => {
                    openCreateAt(lat, lng, {
                        name,
                        type,
                        placeId,
                        address,
                    });
                }}
            />

            {/* badge */}
            <div className="absolute top-3 left-3 rounded-xl bg-white/90 shadow px-3 py-2 text-sm">
                {pinsCountText}（點地圖可新增）
            </div>

            {/* modal */}
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
