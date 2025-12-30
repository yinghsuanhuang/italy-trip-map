"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapView from "@/components/MapView";
import PinModal from "@/components/PinModal";
import PlaceSearch from "@/components/PlaceSearch";
import PlaceDetailsPanel from "@/components/PlaceDetailsPanel";
import type { Pin, PinType, PinCategory } from "@/lib/types";
import { loadPins, savePins } from "@/lib/storage";

type Draft = {
    id?: string;
    type: PinType;
    category: PinCategory;
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

function defaultStay(type: PinType) {
    return type === "restaurant" ? 60 : 90;
}

function isRestaurantTypes(types: string[] | undefined) {
    const t = types ?? [];
    return t.some((x) =>
        [
            "restaurant",
            "cafe",
            "bar",
            "bakery",
            "meal_takeaway",
            "meal_delivery",
            "food",
        ].includes(x)
    );
}

// 右側面板分類顯示（你可自由調整順序/文字/emoji）
const CATEGORY_META: Record<
    PinCategory,
    { label: string; emoji: string; kind: "eat" | "spot" }
> = {
    restaurant: { label: "餐廳", emoji: "🍽️", kind: "eat" },
    cafe: { label: "咖啡 / 甜點", emoji: "☕", kind: "eat" },
    bar: { label: "酒吧 / 夜生活", emoji: "🍷", kind: "eat" },

    museum: { label: "博物館 / 美術館", emoji: "🖼️", kind: "spot" },
    landmark: { label: "地標 / 必去", emoji: "🏛️", kind: "spot" },
    church: { label: "教堂 / 宗教建築", emoji: "⛪", kind: "spot" },
    shopping: { label: "逛街 / 市集", emoji: "🛍️", kind: "spot" },
    park: { label: "公園 / 動物園", emoji: "🌳", kind: "spot" },
    beach: { label: "海邊", emoji: "🏖️", kind: "spot" },
    nightlife: { label: "夜生活", emoji: "🎉", kind: "spot" },
    transport: { label: "交通 / 車站", emoji: "🚉", kind: "spot" },
    hotel: { label: "住宿", emoji: "🏨", kind: "spot" },

    other: { label: "其他", emoji: "📌", kind: "spot" },
};

function emojiForMarker(type: PinType) {
    return type === "restaurant" ? "🍴" : "🏛️";
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

    // right panel (pins list)
    const [rightPanelOpen, setRightPanelOpen] = useState(true);

    // right panel group collapse states
    const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({
        eat: true,
        spot: true,
    });

    // left panel (google place details)
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [selectedPin, setSelectedPin] = useState<Pin | null>(null); // preview or real pin
    const [placeLoading, setPlaceLoading] = useState(false);
    const [placeError, setPlaceError] = useState<string | null>(null);
    const [placeDetails, setPlaceDetails] =
        useState<google.maps.places.PlaceResult | null>(null);

    // load from localStorage
    useEffect(() => {
        setPins(loadPins());
    }, []);

    // persist
    useEffect(() => {
        savePins(pins);
    }, [pins]);

    const flyToPin = (p: Pin) => {
        const map = mapRef.current;
        if (!map) return;
        map.panTo({ lat: p.lat, lng: p.lng });
        map.setZoom(Math.max(map.getZoom() ?? 6, 14));
    };

    const openEditPin = (p: Pin) => {
        setModalMode("edit");
        setDraft({
            id: p.id,
            type: p.type,
            category: p.category ?? (p.type === "restaurant" ? "restaurant" : "other"),
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
    };

    /** 開啟新增 modal（只在：點空地 or 左側按「加入 Pin」） */
    const openCreateAt = (
        lat: number,
        lng: number,
        prefill?: Partial<{
            name: string;
            type: PinType;
            category: PinCategory;
            note: string;
            stayMinutes: number;
            placeId: string;
            address: string;
        }>
    ) => {
        const t = prefill?.type ?? "spot";
        const cat: PinCategory =
            prefill?.category ?? (t === "restaurant" ? "restaurant" : "other");

        setModalMode("create");
        setDraft({
            type: t,
            category: cat,
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
            category:
                pin.category ??
                (pin.type === "restaurant" ? "restaurant" : ("other" as PinCategory)),
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
        setSelectedPin((prev) => (prev?.id === pinId ? null : prev));
        setPlaceDetails((prev) => (selectedPin?.id === pinId ? null : prev));
        setPlaceError((prev) => (selectedPin?.id === pinId ? null : prev));
    };

    /** 抓 Google Places 詳細資訊（用 placeId）—> 左側卡片預覽 */
    const fetchPlaceDetailsByPlaceId = (
        placeId: string,
        latHint?: number,
        lngHint?: number
    ) => {
        const map = mapRef.current;
        if (!map) return;

        setLeftPanelOpen(true);
        setPlaceError(null);
        setPlaceDetails(null);
        setPlaceLoading(true);

        const service = new google.maps.places.PlacesService(map);

        service.getDetails(
            {
                placeId,
                fields: [
                    "place_id",
                    "name",
                    "types",
                    "formatted_address",
                    "geometry",
                    "rating",
                    "user_ratings_total",
                    "price_level",
                    "opening_hours",
                    "photos",
                    "reviews",
                    "url",
                    "website",
                    "formatted_phone_number",
                ],
            },
            (place, status) => {
                setPlaceLoading(false);
                if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
                    setPlaceError(`Places details failed: ${status}`);
                    return;
                }

                setPlaceDetails(place);

                const lat = place.geometry?.location?.lat() ?? (latHint ?? 0);
                const lng = place.geometry?.location?.lng() ?? (lngHint ?? 0);

                const isR = isRestaurantTypes(place.types);
                const type: PinType = isR ? "restaurant" : "spot";

                // ⚠️ category 會在「加入 Pin」時由 PlaceDetailsPanel 再更精準推斷並回傳
                setSelectedPin({
                    id: "preview",
                    type,
                    category: isR ? "restaurant" : "other",
                    name: place.name ?? "",
                    lat,
                    lng,
                    note: "",
                    stayMinutes: defaultStay(type),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    placeId: place.place_id ?? placeId,
                    address: place.formatted_address ?? undefined,
                });
            }
        );
    };

    // render markers whenever pins change
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // remove markers that no longer exist
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

                    label: {
                        text: emojiForMarker(p.type),
                        fontSize: "22px",
                        fontWeight: "700",
                    },

                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: p.type === "restaurant" ? "#fb923c" : "#60a5fa",
                        fillOpacity: 1,
                        strokeColor: "white",
                        strokeWeight: 2,
                        scale: 14,
                    },
                });

                // 點 marker：先顯示 Google 詳細（左側），你再決定要不要加入 / 或編輯
                mk.addListener("click", () => {
                    if (p.placeId) {
                        fetchPlaceDetailsByPlaceId(p.placeId, p.lat, p.lng);
                    } else {
                        setSelectedPin(p);
                        setPlaceDetails(null);
                        setPlaceError(null);
                        setLeftPanelOpen(true);
                    }
                    // 你如果不想點 marker 就直接跳編輯，把下一行刪掉即可
                    openEditPin(p);
                });

                markersRef.current.set(p.id, mk);
            } else {
                existing.setPosition(position);
                existing.setTitle(p.name);

                existing.setLabel({
                    text: emojiForMarker(p.type),
                    fontSize: "22px",
                    fontWeight: "700",
                });

                existing.setIcon({
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: p.type === "restaurant" ? "#fb923c" : "#60a5fa",
                    fillOpacity: 1,
                    strokeColor: "white",
                    strokeWeight: 2,
                    scale: 14,
                });
            }
        }
    }, [pins]); // eslint-disable-line react-hooks/exhaustive-deps

    const pinsCountText = useMemo(() => `${pins.length} pins`, [pins.length]);

    // ===== 右側依 category 分群 =====
    const categorized = useMemo(() => {
        const map: Record<PinCategory, Pin[]> = {
            restaurant: [],
            cafe: [],
            bar: [],
            museum: [],
            landmark: [],
            church: [],
            shopping: [],
            park: [],
            beach: [],
            nightlife: [],
            transport: [],
            hotel: [],
            other: [],
        };

        for (const p of pins) {
            const cat = (p.category ??
                (p.type === "restaurant" ? "restaurant" : "other")) as PinCategory;
            map[cat].push({ ...p, category: cat });
        }

        const sortByName = (a: Pin, b: Pin) => a.name.localeCompare(b.name);
        (Object.keys(map) as PinCategory[]).forEach((k) => map[k].sort(sortByName));

        const eatOrder: PinCategory[] = ["restaurant", "cafe", "bar"];
        const spotOrder: PinCategory[] = [
            "landmark",
            "museum",
            "church",
            "park",
            "beach",
            "shopping",
            "transport",
            "hotel",
            "nightlife",
            "other",
        ];

        return { map, eatOrder, spotOrder };
    }, [pins]);

    const alreadyAdded = useMemo(() => {
        if (!selectedPin?.placeId) return false;
        return pins.some((p) => p.placeId && p.placeId === selectedPin.placeId);
    }, [pins, selectedPin]);

    return (
        <main className="w-screen h-screen relative">
            {/* 地圖 */}
            <MapView
                onMapReady={(map) => {
                    mapRef.current = map;

                    // 新流程：
                    // - 點 POI（有 placeId）→ 顯示 Google 詳細（讓你決定要不要加入 pin）
                    // - 點空地（沒 placeId）→ 直接開 PinModal 新增
                    map.addListener("click", (e: google.maps.MapMouseEvent) => {
                        if (!e.latLng) return;

                        const placeId = (e as any).placeId as string | undefined;

                        if (placeId) {
                            if (typeof (e as any).stop === "function") (e as any).stop();
                            fetchPlaceDetailsByPlaceId(
                                placeId,
                                e.latLng.lat(),
                                e.latLng.lng()
                            );
                            return;
                        }

                        // 空地：直接新增
                        openCreateAt(e.latLng.lat(), e.latLng.lng(), {
                            type: "spot",
                            category: "other",
                            name: "",
                        });
                    });
                }}
            />

            {/* 左側：Google 詳細資訊（先看再決定要不要加入 pin） */}
            <PlaceDetailsPanel
                open={leftPanelOpen}
                onToggle={() => setLeftPanelOpen((v) => !v)}
                pin={selectedPin}
                loading={placeLoading}
                details={placeDetails}
                error={placeError}
                alreadyAdded={alreadyAdded}
                onAddPin={({ type, category, name, lat, lng, placeId, address }) => {
                    openCreateAt(lat, lng, {
                        type,
                        category,
                        name,
                        placeId: placeId ?? "",
                        address: address ?? "",
                    });
                }}
            />

            {/* 🔍 搜尋（選到 → 顯示 Google 詳細；再按加入 pin） */}
            <PlaceSearch
                map={mapRef.current}
                onPickPlace={({ lat, lng, type, placeId, address, name }) => {
                    const map = mapRef.current;
                    if (map) {
                        map.panTo({ lat, lng });
                        map.setZoom(Math.max(map.getZoom() ?? 6, 14));
                    }

                    if (placeId) {
                        fetchPlaceDetailsByPlaceId(placeId, lat, lng);
                        return;
                    }

                    // 沒 placeId（很少見）：就直接新增
                    openCreateAt(lat, lng, {
                        name,
                        type,
                        category: type === "restaurant" ? "restaurant" : "other",
                        address,
                    });
                }}
            />

            {/* 小 badge */}
            <div className="absolute bottom-3 left-3 z-40 rounded-xl bg-white/90 shadow px-3 py-2 text-sm">
                {pinsCountText}
            </div>

            {/* 右側：可收合 pins（依 category 分群） */}
            <div
                className={`absolute top-3 right-3 z-40 transition-all ${rightPanelOpen ? "w-[340px]" : "w-[52px]"
                    }`}
            >
                <div className="rounded-2xl bg-white/95 shadow backdrop-blur border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                        <div
                            className={`font-semibold text-gray-800 ${rightPanelOpen ? "" : "hidden"
                                }`}
                        >
                            Pins（分類）
                        </div>
                        <button
                            className="rounded-xl px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200"
                            onClick={() => setRightPanelOpen((v) => !v)}
                            type="button"
                            aria-label="toggle right panel"
                        >
                            {rightPanelOpen ? "→" : "←"}
                        </button>
                    </div>

                    {rightPanelOpen && (
                        <div className="max-h-[78vh] overflow-auto p-2">
                            {/* Eat group */}
                            <div className="mt-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setGroupOpen((prev) => ({ ...prev, eat: !prev.eat }))
                                    }
                                    className="w-full flex items-center justify-between px-2 py-2 rounded-xl hover:bg-gray-50"
                                >
                                    <div className="text-sm font-semibold text-gray-800">
                                        🍴 吃吃喝喝
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {groupOpen.eat ? "−" : "+"}
                                    </div>
                                </button>

                                {groupOpen.eat && (
                                    <div className="mt-2 space-y-3">
                                        {categorized.eatOrder.map((cat) => {
                                            const items = categorized.map[cat] ?? [];
                                            if (items.length === 0) return null;
                                            const meta = CATEGORY_META[cat];
                                            return (
                                                <div key={cat}>
                                                    <div className="px-2 text-xs font-semibold text-gray-500">
                                                        {meta.emoji} {meta.label}（{items.length}）
                                                    </div>
                                                    <div className="mt-2 space-y-2">
                                                        {items.map((p) => (
                                                            <button
                                                                key={p.id}
                                                                className="w-full text-left rounded-xl px-3 py-2 hover:bg-gray-50 border border-gray-100"
                                                                onClick={() => {
                                                                    if (p.placeId) {
                                                                        fetchPlaceDetailsByPlaceId(
                                                                            p.placeId,
                                                                            p.lat,
                                                                            p.lng
                                                                        );
                                                                    } else {
                                                                        setSelectedPin(p);
                                                                        setPlaceDetails(null);
                                                                        setPlaceError(null);
                                                                        setLeftPanelOpen(true);
                                                                    }
                                                                    flyToPin(p);
                                                                    // 想要點清單就編輯 → 保留；不想就刪掉下一行
                                                                    openEditPin(p);
                                                                }}
                                                                type="button"
                                                            >
                                                                <div className="font-medium text-gray-800 truncate">
                                                                    {emojiForMarker(p.type)} {p.name}
                                                                </div>
                                                                <div className="text-xs text-gray-500 truncate">
                                                                    {p.address ??
                                                                        `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* eat group empty */}
                                        {categorized.eatOrder.every(
                                            (cat) => (categorized.map[cat] ?? []).length === 0
                                        ) && (
                                                <div className="text-sm text-gray-400 px-2">
                                                    尚未新增餐廳/咖啡/酒吧
                                                </div>
                                            )}
                                    </div>
                                )}
                            </div>

                            {/* Spot group */}
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setGroupOpen((prev) => ({ ...prev, spot: !prev.spot }))
                                    }
                                    className="w-full flex items-center justify-between px-2 py-2 rounded-xl hover:bg-gray-50"
                                >
                                    <div className="text-sm font-semibold text-gray-800">
                                        🗺️ 景點活動
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {groupOpen.spot ? "−" : "+"}
                                    </div>
                                </button>

                                {groupOpen.spot && (
                                    <div className="mt-2 space-y-3">
                                        {categorized.spotOrder.map((cat) => {
                                            const items = categorized.map[cat] ?? [];
                                            if (items.length === 0) return null;
                                            const meta = CATEGORY_META[cat];
                                            return (
                                                <div key={cat}>
                                                    <div className="px-2 text-xs font-semibold text-gray-500">
                                                        {meta.emoji} {meta.label}（{items.length}）
                                                    </div>
                                                    <div className="mt-2 space-y-2">
                                                        {items.map((p) => (
                                                            <button
                                                                key={p.id}
                                                                className="w-full text-left rounded-xl px-3 py-2 hover:bg-gray-50 border border-gray-100"
                                                                onClick={() => {
                                                                    if (p.placeId) {
                                                                        fetchPlaceDetailsByPlaceId(
                                                                            p.placeId,
                                                                            p.lat,
                                                                            p.lng
                                                                        );
                                                                    } else {
                                                                        setSelectedPin(p);
                                                                        setPlaceDetails(null);
                                                                        setPlaceError(null);
                                                                        setLeftPanelOpen(true);
                                                                    }
                                                                    flyToPin(p);
                                                                    // 想要點清單就編輯 → 保留；不想就刪掉下一行
                                                                    openEditPin(p);
                                                                }}
                                                                type="button"
                                                            >
                                                                <div className="font-medium text-gray-800 truncate">
                                                                    {emojiForMarker(p.type)} {p.name}
                                                                </div>
                                                                <div className="text-xs text-gray-500 truncate">
                                                                    {p.address ??
                                                                        `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* spot group empty */}
                                        {categorized.spotOrder.every(
                                            (cat) => (categorized.map[cat] ?? []).length === 0
                                        ) && (
                                                <div className="text-sm text-gray-400 px-2">
                                                    尚未新增景點/活動
                                                </div>
                                            )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
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
