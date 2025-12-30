import type { PinCategory, PinType } from "@/lib/types";

const RESTAURANT_TYPES = new Set([
    "restaurant",
    "food",
    "meal_takeaway",
    "meal_delivery",
]);

const CAFE_TYPES = new Set(["cafe", "bakery"]);
const BAR_TYPES = new Set(["bar", "night_club"]);

const MUSEUM_TYPES = new Set(["museum", "art_gallery"]);
const LANDMARK_TYPES = new Set([
    "tourist_attraction",
    "point_of_interest",
    "landmark",
]);
const CHURCH_TYPES = new Set([
    "church",
    "place_of_worship",
    "hindu_temple",
    "mosque",
    "synagogue",
]);

const SHOPPING_TYPES = new Set([
    "shopping_mall",
    "store",
    "department_store",
    "clothing_store",
    "shoe_store",
    "jewelry_store",
    "book_store",
    "supermarket",
]);

const PARK_TYPES = new Set(["park", "zoo", "aquarium"]);
const BEACH_TYPES = new Set(["beach"]);

const TRANSPORT_TYPES = new Set([
    "train_station",
    "subway_station",
    "transit_station",
    "bus_station",
    "airport",
    "car_rental",
]);

const HOTEL_TYPES = new Set([
    "lodging",
    "hotel",
]);

export function inferTypeAndCategory(types: string[] | undefined): {
    type: PinType;
    category: PinCategory;
} {
    const t = types ?? [];

    const has = (set: Set<string>) => t.some((x) => set.has(x));

    // 1) 先判斷餐廳類（因為 types 常混在一起）
    if (has(RESTAURANT_TYPES)) return { type: "restaurant", category: "restaurant" };
    if (has(CAFE_TYPES)) return { type: "restaurant", category: "cafe" };
    if (has(BAR_TYPES)) return { type: "restaurant", category: "bar" };

    // 2) 景點分類
    if (has(MUSEUM_TYPES)) return { type: "spot", category: "museum" };
    if (has(CHURCH_TYPES)) return { type: "spot", category: "church" };
    if (has(SHOPPING_TYPES)) return { type: "spot", category: "shopping" };
    if (has(PARK_TYPES)) return { type: "spot", category: "park" };
    if (has(BEACH_TYPES)) return { type: "spot", category: "beach" };
    if (has(TRANSPORT_TYPES)) return { type: "spot", category: "transport" };
    if (has(HOTEL_TYPES)) return { type: "spot", category: "hotel" };

    // 3) 如果看起來是旅遊點，算 landmark
    if (has(LANDMARK_TYPES)) return { type: "spot", category: "landmark" };

    return { type: "spot", category: "other" };
}
