import { useState, useRef } from 'react'
import '../styles/node.css'
import Pin from "./Pin";
import { gateColors, gateConfig } from '../configs/gates';
import { customComponentRegistry } from "../configs/customComponents";

function Node({ id, type, x, y, value, label, updateNodePosition, workspaceRef, onPinClick, camera, selected, onSelect, onContextMenu, cancelWire }) {

    const dragStart = useRef({ x: 0, y: 0 });
    const dragging = useRef(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [hovered, setHovered] = useState(false);

    const customComp = customComponentRegistry[type];
    const config = gateConfig[type] || {
        inputs: customComp?.inputPinMap?.length || 2,
        outputs: customComp?.outputPinMap?.length || 1
    };

    // For saved components, extract labels from internal SWITCH/LED nodes
    const inputPinLabels = customComp?.inputPinMap?.map(({ nodeId }) =>
        customComp.nodes.find(n => n.id === nodeId)?.label || null
    ) || [];
    const outputPinLabels = customComp?.outputPinMap?.map(({ nodeId }) =>
        customComp.nodes.find(n => n.id === nodeId)?.label || null
    ) || [];

    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        const rect = workspaceRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom;
        const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom;
        dragStart.current = { x: mouseX, y: mouseY };
        dragging.current = false;
        setOffset({ x: mouseX - x, y: mouseY - y });
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseUp = () => {
        if (!dragging.current) {
            if (type === "SWITCH") updateNodePosition(id, x, y, "toggle");
            onSelect(id);
        }
        dragging.current = false;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = (e) => {
        const rect = workspaceRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom;
        const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom;
        const dx = mouseX - dragStart.current.x;
        const dy = mouseY - dragStart.current.y;
        if (!dragging.current && Math.sqrt(dx * dx + dy * dy) > 4) {
            dragging.current = true;
            cancelWire();
        }
        if (!dragging.current) return;
        updateNodePosition(id, mouseX - offset.x, mouseY - offset.y, null, selected);
    };

    const isIO = type === "SWITCH" || type === "LED";
    const isSwitch = type === "SWITCH";
    const active = value === 1;
    const textWidth = type.length * 8;
    const nodeWidth = isIO ? 28 : textWidth + 40;
    const nodeHeight = isIO ? 28 : 46;

    const labelStyle = {
        position: "absolute",
        whiteSpace: "nowrap",
        fontSize: "11px",
        fontWeight: 500,
        color: "#cdd6f4",
        pointerEvents: "none",
        userSelect: "none",
        opacity: hovered ? 0.9 : 0.35,
        transition: "opacity 0.15s",
        letterSpacing: "0.01em",
    };

    return (
        <div
            style={{ position: "absolute", left: x, top: y }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* The node box itself */}
            <div
                className={`node node-${type.toLowerCase()} ${selected ? "node-selected" : ""}`}
                onMouseDown={handleMouseDown}
                onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, id); }}
                style={{
                    left: 0, top: 0,
                    width: nodeWidth,
                    height: nodeHeight,
                    borderRadius: isIO ? "50%" : "6px",
                    background: isIO ? (active ? "#ff0000" : "#ffb3b3") : (gateColors[type] || "#555"),
                    border: isIO ? "2px solid black" : "1px solid #555",
                    paddingLeft: isIO ? "0px" : "20px",
                    paddingRight: isIO ? "0px" : "20px",
                    pointerEvents: "auto",
                    position: "relative",
                }}
            >
                <div className="pin-column" style={{ pointerEvents: "auto" }}>
                    {Array.from({ length: config.inputs }).map((_, i) => (
                        <Pin key={`in-${i}`} type="input" index={i} total={config.inputs} nodeId={id} onPinClick={onPinClick} label={inputPinLabels[i] || null} />
                    ))}
                </div>

                {!isIO && type}

                <div className="pin-column" style={{ pointerEvents: "auto" }}>
                    {Array.from({ length: config.outputs }).map((_, i) => (
                        <Pin key={`out-${i}`} type="output" index={i} total={config.outputs} nodeId={id} onPinClick={onPinClick} label={outputPinLabels[i] || null} />
                    ))}
                </div>
            </div>

            {/* Inline label — always rendered when set, dim by default, bright on hover */}
            {label && (
                <div style={{
                    ...labelStyle,
                    // For SWITCH: label goes to the right of the node
                    // For LED: label goes to the left of the node  
                    // For gates: label goes below the node
                    ...(isSwitch ? {
                        left: nodeWidth + 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                    } : type === "LED" ? {
                        right: nodeWidth + 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                    } : {
                        top: nodeHeight + 5,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: "10px",
                    })
                }}>
                    {label}
                </div>
            )}
        </div>
    );
}

export default Node;