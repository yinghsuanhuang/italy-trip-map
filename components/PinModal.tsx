"use client";

import { useEffect, useMemo, useState } from "react";
import type { Pin, PinType } from "@/lib/types";

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

export default function PinModal(props: {
    open: boolean;
    mode: "create" | "edit";
    initial: Draft | null;
    onClose: () => void;
    onSave: (pin: Pin) => void;
    onDelete?: (pinId: string) => void;
}) {
    const { open, mode, initial, onClose, onSave, onDelete } = props;

    const [type, setType] = useState<PinType>("spot");
    const [name, setName] = useState("");
    const [note, setNote] = useState("");
    const [stayMinutes, setStayMinutes] = useState(90);

    const lat = initial?.lat ?? 0;
    const lng = initial?.lng ?? 0;

    const defaultStay = (t: PinType) => (t === "restaurant" ? 60 : 90);

    useEffect(() => {
        if (!open || !initial) return;
        setType(initial.type);
        setName(initial.name ?? "");
        setNote(initial.note ?? "");
        setStayMinutes(
            typeof initial.stayMinutes === "number"
                ? initial.stayMinutes
                : defaultStay(initial.type)
        );
    }, [open, initial]);

    const title = useMemo(() => {
        if (mode === "create") return "新增 Pin";
        return "編輯 Pin";
    }, [mode]);

    if (!open || !initial) return null;

    const canSave =
        name.trim().length > 0 && Number.isFinite(lat) && Number.isFinite(lng);

    const onTypeChange = (t: PinType) => {
        setType(t);
        // 如果停留時間還是舊類型預設，就跟著切換到新類型預設
        setStayMinutes((prev) => (prev === defaultStay(type) ? defaultStay(t) : prev));
    };

    const handleSave = () => {
        if (!canSave) return;

        const now = Date.now();
        const pin: Pin = {
            id: initial.id ?? crypto.randomUUID(),
            type,
            name: name.trim(),
            lat,
            lng,
            note: note.trim() || undefined,
            placeId: initial.placeId,
            address: initial.address,
            stayMinutes: Math.max(5, Math.min(600, Math.floor(stayMinutes || defaultStay(type)))),
            createdAt: initial.createdAt ?? now,
            updatedAt: now,
        };

        onSave(pin);
        onClose();
    };

    const handleDelete = () => {
        if (!initial.id || !onDelete) return;
        onDelete(initial.id);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* overlay */}
            <button
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
                aria-label="Close modal overlay"
            />

            {/* panel */}
            <div className="relative w-[92vw] max-w-2xl rounded-3xl bg-white shadow-2xl p-8">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-xl font-semibold text-gray-800">{title}</div>
                        <div className="text-sm text-gray-500 mt-1">
                            {lat.toFixed(5)}, {lng.toFixed(5)}
                        </div>
                    </div>

                    <button
                        className="rounded-xl px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                        onClick={onClose}
                        type="button"
                    >
                        關閉
                    </button>
                </div>

                <div className="mt-6 space-y-6">
                    {/* type */}
                    <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2">類型</div>
                        <div className="flex gap-3">
                            <button
                                className={`flex-1 rounded-2xl border px-4 py-3 font-semibold transition
                  ${type === "spot"
                                        ? "bg-blue-50 border-blue-500 text-blue-700"
                                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                                    }`}
                                onClick={() => onTypeChange("spot")}
                                type="button"
                            >
                                🏛️ 景點
                            </button>
                            <button
                                className={`flex-1 rounded-2xl border px-4 py-3 font-semibold transition
                  ${type === "restaurant"
                                        ? "bg-orange-50 border-orange-500 text-orange-600"
                                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                                    }`}
                                onClick={() => onTypeChange("restaurant")}
                                type="button"
                            >
                                🍴 餐廳
                            </button>
                        </div>
                    </div>

                    {/* name */}
                    <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2">名稱（必填）</div>
                        <input
                            className="
                w-full rounded-2xl border border-gray-300 bg-white
                px-4 py-3 text-gray-800
                outline-none
                focus:border-blue-500 focus:ring-2 focus:ring-blue-100
              "
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={type === "restaurant" ? "輸入餐廳名稱" : "輸入景點名稱"}
                        />
                    </div>

                    {/* stay */}
                    <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2">停留時間（分鐘）</div>
                        <input
                            className="
                w-full rounded-2xl border border-gray-300 bg-white
                px-4 py-3 text-gray-800
                outline-none
                focus:border-blue-500 focus:ring-2 focus:ring-blue-100
              "
                            type="number"
                            min={5}
                            max={600}
                            value={stayMinutes}
                            onChange={(e) => setStayMinutes(Number(e.target.value))}
                        />
                        <div className="text-sm text-gray-500 mt-2">
                            預設：景點 90 分，餐廳 60 分（之後 ETA / 營業時間檢查會用）
                        </div>
                    </div>

                    {/* note */}
                    <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2">備註</div>
                        <textarea
                            className="
                w-full rounded-2xl border border-gray-300 bg-white
                px-4 py-3 text-gray-800
                outline-none
                focus:border-blue-500 focus:ring-2 focus:ring-blue-100
              "
                            rows={4}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="例如：必去、想早上去、需要預約…"
                        />
                    </div>
                </div>

                <div className="mt-7 flex items-center justify-between gap-3">
                    {mode === "edit" && onDelete ? (
                        <button
                            className="rounded-2xl px-4 py-3 text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition"
                            onClick={handleDelete}
                            type="button"
                        >
                            刪除
                        </button>
                    ) : (
                        <div />
                    )}

                    <button
                        disabled={!canSave}
                        className={`
              rounded-2xl px-6 py-3 text-sm font-semibold text-white transition
              ${canSave ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"}
            `}
                        onClick={handleSave}
                        type="button"
                    >
                        儲存
                    </button>
                </div>
            </div>
        </div>
    );
}
