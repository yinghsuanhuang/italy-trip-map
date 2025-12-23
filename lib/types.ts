export type PinType = "spot" | "restaurant";

export type Pin = {
    id: string;
    type: PinType;
    name: string;
    lat: number;
    lng: number;

    note?: string;

    // ✅ 先改成可選，避免你 demo pins / 初期資料一直報錯
    stayMinutes?: number; // 預設：spot=90, restaurant=60（存檔時補）
    createdAt?: number;
    updatedAt?: number;

    // 後面要接 Places 才會用到
    placeId?: string;
    address?: string;
};
