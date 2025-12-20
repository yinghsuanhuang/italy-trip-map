"use client";

import { useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

interface MapViewProps {
    onMapReady?: (map: google.maps.Map) => void;
}

export default function MapView({ onMapReady }: MapViewProps) {
    const mapDivRef = useRef<HTMLDivElement>(null);

    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const initPromiseRef = useRef<Promise<void> | null>(null);

    useEffect(() => {
        if (!mapDivRef.current) return;
        if (mapInstanceRef.current) return;

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

        // 只印前 6 碼（安全），用來確認網站實際吃到哪把 key
        console.log("MAPS KEY prefix:", apiKey?.slice(0, 6));

        if (!apiKey) {
            console.error(
                "NEXT_PUBLIC_GOOGLE_MAPS_KEY is missing. Please set it in .env.local and restart `npm run dev`."
            );
            return;
        }

        if (initPromiseRef.current) return;

        initPromiseRef.current = (async () => {
            try {
                // ✅ 關鍵：這裡用 key / v，而不是 apiKey / version
                setOptions({
                    key: apiKey,
                    v: "weekly",
                });

                // ✅ 模組化載入（不在 setOptions 傳 libraries，避免型別爭議）
                const { Map } = (await importLibrary("maps")) as google.maps.MapsLibrary;
                await importLibrary("places");

                const map = new Map(mapDivRef.current!, {
                    center: { lat: 41.9028, lng: 12.4964 }, // Rome
                    zoom: 6,
                });

                mapInstanceRef.current = map;
                onMapReady?.(map);
            } catch (err: unknown) {
                initPromiseRef.current = null;
                console.error("Failed to initialize Google Maps:", err);
            }
        })();
    }, [onMapReady]);

    return <div ref={mapDivRef} className="w-full h-full" />;
}
