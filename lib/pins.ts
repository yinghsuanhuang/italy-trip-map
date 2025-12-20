import { Pin } from "./types";

const PIN_STYLE: Record<
    Pin["type"],
    { emoji: string; bg: string; label: string }
> = {
    spot: { emoji: "🏛️", bg: "#3b82f6", label: "景點" },
    restaurant: { emoji: "🍴", bg: "#f97316", label: "餐廳" },
};

export function addPinMarker(map: google.maps.Map, pin: Pin) {
    // 用 div 當自訂 marker（不依賴 AdvancedMarker，最穩）
    const div = document.createElement("div");
    div.style.width = "34px";
    div.style.height = "34px";
    div.style.borderRadius = "9999px";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    div.style.color = "white";
    div.style.fontSize = "18px";
    div.style.boxShadow = "0 2px 8px rgba(0,0,0,.25)";
    div.style.background = PIN_STYLE[pin.type].bg;
    div.innerText = PIN_STYLE[pin.type].emoji;

    // 使用 OverlayView 讓 div 放到地圖上（最通用）
    const overlay = new google.maps.OverlayView();

    overlay.onAdd = function () {
        const panes = this.getPanes();
        panes?.overlayMouseTarget.appendChild(div);

        div.style.cursor = "pointer";
        div.addEventListener("click", () => {
            const info = new google.maps.InfoWindow({
                content: `
          <div style="font-family: system-ui; min-width: 160px;">
            <div style="font-weight: 700; margin-bottom: 4px;">${pin.name}</div>
            <div style="opacity: .8;">類型：${PIN_STYLE[pin.type].label}</div>
            ${pin.note
                        ? `<div style="margin-top: 6px;">備註：${pin.note}</div>`
                        : ""
                    }
          </div>
        `,
            });
            info.setPosition({ lat: pin.lat, lng: pin.lng });
            info.open({ map });
        });
    };

    overlay.draw = function () {
        const projection = this.getProjection();
        if (!projection) return;

        const point = projection.fromLatLngToDivPixel(
            new google.maps.LatLng(pin.lat, pin.lng)
        );
        if (!point) return;

        div.style.position = "absolute";
        div.style.left = `${point.x - 17}px`;
        div.style.top = `${point.y - 17}px`;
    };

    overlay.onRemove = function () {
        div.remove();
    };

    overlay.setMap(map);

    return overlay;
}
