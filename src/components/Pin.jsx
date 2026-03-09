import "../styles/Pin.css";
import { useState } from "react";

function Pin({ type, index, total, nodeId, onPinClick, label }) {

    const spacing = 100 / (total + 1);
    const top = spacing * (index + 1);
    const [hovered, setHovered] = useState(false);

    const handleStart = (e) => {
        e.stopPropagation();
        if (type === "output") onPinClick({ nodeId, type, index, total });
    };

    const handleEnd = (e) => {
        e.stopPropagation();
        if (type === "input") onPinClick({ nodeId, type, index, total });
    };

    return (
        <div
            style={{ position: "absolute", top: `${top}%`, [type === "input" ? "left" : "right"]: 0 }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div
                className={`pin pin-${type}`}
                style={{ top: 0, position: "relative", transform: "translateY(-50%)" }}
                onMouseDown={handleStart}
                onMouseUp={handleEnd}
            />
            {label && (
                <div style={{
                    position: "absolute",
                    top: "50%",
                    transform: "translateY(-50%)",
                    ...(type === "input"
                        ? { left: 14, textAlign: "left" }
                        : { right: 14, textAlign: "right" }),
                    whiteSpace: "nowrap",
                    fontSize: "10px",
                    fontWeight: 500,
                    color: "#cdd6f4",
                    pointerEvents: "none",
                    userSelect: "none",
                    opacity: hovered ? 0.9 : 0.3,
                    transition: "opacity 0.15s",
                }}>
                    {label}
                </div>
            )}
        </div>
    );
}

export default Pin;