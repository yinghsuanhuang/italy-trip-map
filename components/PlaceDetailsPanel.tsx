"use client";

import { useMemo } from "react";
import type { Pin } from "@/lib/types";
import { inferTypeAndCategory } from "@/lib/category";


export default function PlaceDetailsPanel(props: {
    open: boolean;
    onToggle: () => void;
    pin: Pin | null;
    loading: boolean;
    details: google.maps.places.PlaceResult | null;
    error?: string | null;

    onAddPin: (payload: {
        type: "spot" | "restaurant";
        category: any;
        name: string;
        lat: number;
        lng: number;
        placeId?: string;
        address?: string;
    }) => void;

    alreadyAdded?: boolean;
}) {
    const { open, onToggle, pin, loading, details, error, onAddPin, alreadyAdded } =
        props;

    const photos = useMemo(() => {
        const list = details?.photos ?? [];
        return list
            .slice(0, 6)
            .map((p) => p.getUrl({ maxWidth: 900, maxHeight: 600 }));
    }, [details]);

    // Use isOpen() method instead of deprecated open_now property
    // This helps suppress the deprecation warning from Google Maps API
    const isPlaceOpen = useMemo(() => {
        const hours = details?.opening_hours;
        if (!hours || typeof hours.isOpen !== "function") return null;
        try {
            return hours.isOpen(new Date());
        } catch {
            return null;
        }
    }, [details]);

    return (
        <div
            className={`absolute top-3 left-3 z-40 transition-all ${open ? "w-[360px]" : "w-[52px]"
                }`}
        >
            <div className="rounded-2xl bg-white/95 shadow backdrop-blur border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                    <div className={`font-semibold text-gray-800 ${open ? "" : "hidden"}`}>
                        Google 詳細
                    </div>
                    <button
                        className="rounded-xl px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200"
                        onClick={onToggle}
                        type="button"
                        aria-label="toggle left panel"
                    >
                        {open ? "←" : "→"}
                    </button>
                </div>

                {open && (
                    <div className="max-h-[82vh] overflow-auto p-3">
                        {!pin ? (
                            <div className="text-sm text-gray-500">
                                點地圖上的 POI（餐廳/景點）或用搜尋選擇地點，就會顯示 Google Maps 的卡片資訊。
                            </div>
                        ) : !pin.placeId ? (
                            <div className="text-sm text-gray-500">
                                這個位置沒有 placeId（通常是你點空地），所以拿不到 Google 詳細資料。
                            </div>
                        ) : loading ? (
                            <div className="text-sm text-gray-500">載入中…</div>
                        ) : error ? (
                            <div className="text-sm text-red-600">{error}</div>
                        ) : (
                            <>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-lg font-semibold text-gray-900">
                                            {details?.name ?? pin.name}
                                        </div>
                                        <div className="mt-1 text-sm text-gray-600">
                                            {details?.formatted_address ??
                                                pin.address ??
                                                `${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}`}
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                                            {typeof details?.rating === "number" && (
                                                <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-800">
                                                    ⭐ {details.rating.toFixed(1)}
                                                    {details.user_ratings_total
                                                        ? ` (${details.user_ratings_total})`
                                                        : ""}
                                                </span>
                                            )}
                                            {details?.price_level != null && (
                                                <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-800">
                                                    {"€".repeat(
                                                        Math.max(1, Math.min(4, details.price_level))
                                                    )}
                                                </span>
                                            )}
                                            {details?.website && (
                                                <a
                                                    className="rounded-full bg-blue-50 px-2 py-1 text-blue-700 hover:bg-blue-100"
                                                    href={details.website}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Website
                                                </a>
                                            )}
                                            {details?.url && (
                                                <a
                                                    className="rounded-full bg-green-50 px-2 py-1 text-green-700 hover:bg-green-100"
                                                    href={details.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Open in Google Maps
                                                </a>
                                            )}
                                        </div>

                                        {details?.formatted_phone_number && (
                                            <div className="mt-2 text-sm text-gray-700">
                                                📞 {details.formatted_phone_number}
                                            </div>
                                        )}

                                        {/* ✅ 加入 Pin 按鈕 */}
                                        <div className="mt-3 flex gap-2">
                                            <button
                                                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${alreadyAdded
                                                    ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                                    }`}
                                                onClick={() => {
                                                    if (!pin) return;

                                                    const inferred = inferTypeAndCategory(details?.types);

                                                    onAddPin({
                                                        type: inferred.type,
                                                        category: inferred.category,
                                                        name: details?.name ?? pin.name,
                                                        lat: pin.lat,
                                                        lng: pin.lng,
                                                        placeId: pin.placeId,
                                                        address: details?.formatted_address ?? pin.address,
                                                    });
                                                }}
                                                type="button"
                                                disabled={!!alreadyAdded}
                                            >
                                                {alreadyAdded ? "已加入 Pins" : "➕ 加入 Pin"}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Opening hours */}
                                {details?.opening_hours?.weekday_text?.length ? (
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-sm font-semibold text-gray-800">
                                                營業時間
                                            </div>
                                            {/* Use isOpen() to suppress deprecation warning */}
                                            {isPlaceOpen !== null && (
                                                <span
                                                    className={`text-xs font-semibold px-2 py-1 rounded-full ${isPlaceOpen
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-red-100 text-red-700"
                                                        }`}
                                                >
                                                    {isPlaceOpen ? "營業中" : "休息中"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-2 space-y-1 text-sm text-gray-700">
                                            {details.opening_hours.weekday_text.map((t, idx) => (
                                                <div key={idx}>{t}</div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {/* Photos */}
                                {photos.length ? (
                                    <div className="mt-4">
                                        <div className="text-sm font-semibold text-gray-800">
                                            相片
                                        </div>
                                        <div className="mt-2 grid grid-cols-3 gap-2">
                                            {photos.map((src, idx) => (
                                                <a key={idx} href={src} target="_blank" rel="noreferrer">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={src}
                                                        alt="place"
                                                        className="h-24 w-full rounded-xl object-cover border border-gray-200"
                                                    />
                                                </a>
                                            ))}
                                        </div>
                                        <div className="mt-2 text-xs text-gray-400">
                                            點照片可開新分頁看大圖
                                        </div>
                                    </div>
                                ) : null}

                                {/* Reviews */}
                                {details?.reviews?.length ? (
                                    <div className="mt-4">
                                        <div className="text-sm font-semibold text-gray-800">
                                            評論
                                        </div>
                                        <div className="mt-2 space-y-3">
                                            {details.reviews.slice(0, 6).map((r, idx) => (
                                                <div
                                                    key={idx}
                                                    className="rounded-xl border border-gray-200 p-3"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="text-sm font-semibold text-gray-800">
                                                            {r.author_name}
                                                        </div>
                                                        {typeof r.rating === "number" && (
                                                            <div className="text-sm text-gray-700">
                                                                ⭐ {r.rating}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {r.relative_time_description && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {r.relative_time_description}
                                                        </div>
                                                    )}
                                                    {r.text && (
                                                        <div className="text-sm text-gray-700 mt-2">
                                                            {r.text}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
