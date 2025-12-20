"use client";

import MapView from "@/components/MapView";
import { addPinMarker } from "@/lib/pins";
import { Pin } from "@/lib/types";

const demoPins: Pin[] = [
    {
        id: "p1",
        type: "spot",
        name: "Colosseum 羅馬競技場",
        lat: 41.8902,
        lng: 12.4922,
        note: "必去，建議早上",
    },
    {
        id: "p2",
        type: "restaurant",
        name: "Pizzarium Bonci（披薩）",
        lat: 41.9077,
        lng: 12.4463,
        note: "在梵蒂岡附近",
    },
];

export default function HomeClient() {
    return (
        <main className="w-screen h-screen">
            <MapView
                onMapReady={(map) => {
                    demoPins.forEach((pin) => addPinMarker(map, pin));
                }}
            />
        </main>
    );
}
