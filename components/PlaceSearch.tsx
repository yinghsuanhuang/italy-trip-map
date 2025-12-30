"use client";

import { useEffect, useRef } from "react";

export default function PlaceSearch(props: {
    map: google.maps.Map | null;
    onPickPlace: (p: {
        name: string;
        lat: number;
        lng: number;
        type: "spot" | "restaurant";
        placeId?: string;
        address?: string;
    }) => void;
}) {
    const { map, onPickPlace } = props;
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    useEffect(() => {
        if (!map) return;
        if (!inputRef.current) return;
        if (!google?.maps?.places?.Autocomplete) return;

        // 避免 Strict Mode 重複初始化
        if (autocompleteRef.current) return;

        const ac = new google.maps.places.Autocomplete(inputRef.current, {
            fields: [
                "place_id",
                "name",
                "formatted_address",
                "geometry",
                "types", // ✅ 關鍵
            ],
            componentRestrictions: { country: "it" },
        });


        // 可選：偏向目前地圖範圍的結果
        ac.bindTo("bounds", map);

        ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            if (!place?.geometry?.location) return;

            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();

            // 🔑 判斷是餐廳還是景點
            const types = place.types ?? [];
            const isRestaurant = types.some((t) =>
                [
                    "restaurant",
                    "cafe",
                    "bar",
                    "bakery",
                    "meal_takeaway",
                    "meal_delivery",
                    "food",
                ].includes(t)
            );

            // 移動地圖
            map.panTo({ lat, lng });
            map.setZoom(Math.max(map.getZoom() ?? 6, 14));

            onPickPlace({
                name: place.name ?? "",
                lat,
                lng,
                type: isRestaurant ? "restaurant" : "spot",
                placeId: place.place_id ?? undefined,
                address: place.formatted_address ?? undefined,
            });

            if (inputRef.current) inputRef.current.value = "";
        });


        autocompleteRef.current = ac;
    }, [map, onPickPlace]);

    return (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 w-[92vw] max-w-xl">
            <div className="rounded-2xl bg-white/95 shadow px-4 py-3 backdrop-blur">
                <input
                    ref={inputRef}
                    placeholder="搜尋景點/餐廳（例如：Colosseum, Da Enzo al 29）"
                    className="w-full bg-transparent outline-none text-gray-800 placeholder:text-gray-400"
                />
            </div>
        </div>
    );
}
