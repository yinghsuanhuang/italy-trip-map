export type PinCategory =
    | "restaurant"
    | "cafe"
    | "bar"
    | "museum"
    | "landmark"
    | "church"
    | "shopping"
    | "park"
    | "beach"
    | "nightlife"
    | "transport"
    | "hotel"
    | "other";

export type PinType = "spot" | "restaurant";

export type Pin = {
    id: string;
    type: PinType;
    category: PinCategory; // ✅ 新增：自動歸類
    name: string;
    lat: number;
    lng: number;
    note?: string;
    stayMinutes: number;
    createdAt: number;
    updatedAt: number;
    placeId?: string;
    address?: string;
};
