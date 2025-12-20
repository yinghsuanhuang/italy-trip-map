export type PinType = "spot" | "restaurant";

export interface Pin {
    id: string;
    type: PinType;
    name: string;
    lat: number;
    lng: number;
    note?: string;
}
