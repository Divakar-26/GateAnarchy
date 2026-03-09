import { useState, useRef, useEffect } from "react";
import '../../styles/workspace.css';
import Node from "../Node";
import Wire from "../Wire";
import { getPinPosition } from "../../utils/pinPosition";
import { propagate } from "./propagate";

function Workspace({ nodes, setNodes, wires, setWires }) {
    const workspaceRef = useRef(null);
    const grid = 20;

    const [activeWire, setActiveWire] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [selectedNodes, setSelectedNodes] = useState([]);
    const [selectionBox, setSelectionBox] = useState(null);

    // Node context menu
    const [nodeMenu, setNodeMenu] = useState(null);
    // { nodeId, x, y, mode: "menu" | "label", labelValue }
    const labelInputRef = useRef(null);

    useEffect(() => {
        const newNodes = propagate(nodes, wires);
        const changed = newNodes.some((n, i) => n.value !== nodes[i].value);
        if (changed) setNodes(newNodes);
    }, [nodes, wires]);

    const screenToWorld = (screenX, screenY) => ({
        x: (screenX - camera.x) / camera.zoom,
        y: (screenY - camera.y) / camera.zoom
    });

    const updateNodePosition = (id, x, y, action = null, isGroupDrag = false) => {
        const snappedX = Math.round(x / grid) * grid;
        const snappedY = Math.round(y / grid) * grid;
        setNodes(prev => {
            const target = prev.find(n => n.id === id);
            if (!target) return prev;
            if (action === "toggle") return prev.map(n => n.id === id ? { ...n, value: n.value ? 0 : 1 } : n);
            const dx = snappedX - target.x;
            const dy = snappedY - target.y;
            if (dx === 0 && dy === 0) return prev;
            return prev.map(node => {
                if (isGroupDrag && selectedNodes.includes(node.id)) {
                    return { ...node, x: Math.round((node.x + dx) / grid) * grid, y: Math.round((node.y + dy) / grid) * grid };
                }
                if (node.id === id) return { ...node, x: snappedX, y: snappedY };
                return node;
            });
        });
    };

    const handlePinClick = (pin) => {
        if (!activeWire) {
            if (pin.type === "output") setActiveWire(pin);
            return;
        }
        if (activeWire.type === "output" && pin.type === "input") {
            const alreadyConnected = wires.some(w => w.to.nodeId === pin.nodeId && w.to.index === pin.index);
            if (alreadyConnected) { setActiveWire(null); return; }
            setWires(prev => [...prev, {
                id: Date.now(),
                from: { nodeId: activeWire.nodeId, index: activeWire.index, total: activeWire.total },
                to: { nodeId: pin.nodeId, index: pin.index, total: pin.total }
            }]);
        }
        setActiveWire(null);
    };

    // Open node context menu
    const openNodeMenu = (e, id) => {
        const node = nodes.find(n => n.id === id);
        setNodeMenu({ nodeId: id, x: e.clientX, y: e.clientY, mode: "menu", labelValue: node?.label || "" });
    };

    const handleDeleteNode = () => {
        const id = nodeMenu.nodeId;
        setNodes(prev => prev.filter(n => n.id !== id));
        setWires(prev => prev.filter(w => w.from.nodeId !== id && w.to.nodeId !== id));
        setSelectedNodes(prev => prev.filter(nid => nid !== id));
        setNodeMenu(null);
    };

    const handleDuplicateNode = () => {
        const node = nodes.find(n => n.id === nodeMenu.nodeId);
        if (!node) { setNodeMenu(null); return; }
        setNodes(prev => [...prev, { ...node, id: Date.now(), x: node.x + 40, y: node.y + 40 }]);
        setNodeMenu(null);
    };

    const handleSetLabel = () => {
        setNodeMenu(prev => ({ ...prev, mode: "label" }));
        setTimeout(() => labelInputRef.current?.focus(), 50);
    };

    const confirmLabel = () => {
        const { nodeId, labelValue } = nodeMenu;
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, label: labelValue.trim() || undefined } : n));
        setNodeMenu(null);
    };

    const handleDeleteSelected = () => {
        if (selectedNodes.length === 0) return;
        setNodes(prev => prev.filter(n => !selectedNodes.includes(n.id)));
        setWires(prev => prev.filter(w => !selectedNodes.includes(w.from.nodeId) && !selectedNodes.includes(w.to.nodeId)));
        setSelectedNodes([]);
    };

    // Keyboard delete
    useEffect(() => {
        const onKey = (e) => {
            if ((e.key === "Delete" || e.key === "Backspace") && document.activeElement.tagName !== "INPUT") {
                handleDeleteSelected();
            }
            if (e.key === "Escape") {
                setActiveWire(null);
                setNodeMenu(null);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selectedNodes]);

    return (
        <div
            className="workspace"
            ref={workspaceRef}
            onMouseMove={(e) => {
                const rect = workspaceRef.current.getBoundingClientRect();
                const screenX = e.clientX - rect.left;
                const screenY = e.clientY - rect.top;
                if (isPanning) { setCamera(c => ({ ...c, x: screenX - panStart.x, y: screenY - panStart.y })); return; }
                if (selectionBox) setSelectionBox(prev => prev ? { ...prev, endX: screenX, endY: screenY } : null);
                setMousePos(screenToWorld(screenX, screenY));
            }}
            onMouseDown={(e) => {
                const rect = workspaceRef.current.getBoundingClientRect();
                const screenX = e.clientX - rect.left;
                const screenY = e.clientY - rect.top;
                if (e.button === 1) { setIsPanning(true); setPanStart({ x: screenX - camera.x, y: screenY - camera.y }); return; }
                if (e.button === 0) {
                    setActiveWire(null);
                    setNodeMenu(null);
                    setSelectedNodes([]);
                    setSelectionBox({ startX: screenX, startY: screenY, endX: screenX, endY: screenY });
                }
            }}
            onMouseUp={(e) => {
                setIsPanning(false);
                if (selectionBox) {
                    const box = selectionBox;
                    const minX = Math.min(box.startX, box.endX), maxX = Math.max(box.startX, box.endX);
                    const minY = Math.min(box.startY, box.endY), maxY = Math.max(box.startY, box.endY);
                    if (maxX - minX > 6 && maxY - minY > 6) {
                        const worldMin = screenToWorld(minX, minY);
                        const worldMax = screenToWorld(maxX, maxY);
                        setSelectedNodes(nodes.filter(n => n.x >= worldMin.x && n.x <= worldMax.x && n.y >= worldMin.y && n.y <= worldMax.y).map(n => n.id));
                    }
                    setSelectionBox(null);
                }
            }}
            onWheel={(e) => {
                e.preventDefault();
                setActiveWire(null);
                const rect = workspaceRef.current.getBoundingClientRect();
                const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                const newZoom = Math.min(Math.max(camera.zoom * zoomFactor, 0.5), 2);
                const worldMouse = screenToWorld(mouseX, mouseY);
                setCamera({ x: mouseX - worldMouse.x * newZoom, y: mouseY - worldMouse.y * newZoom, zoom: newZoom });
            }}
        >
            <div
                className="camera-layer"
                style={{
                    transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
                    transformOrigin: "0 0", position: "absolute", width: "100%", height: "100%",
                    pointerEvents: "none"
                }}
            >
                <div className="grid-layer" style={{ pointerEvents: "none" }}></div>
                <svg className="wire-layer" style={{ pointerEvents: "none" }}>
                    {wires.map(wire => {
                        const n1 = nodes.find(n => n.id === wire.from.nodeId);
                        const n2 = nodes.find(n => n.id === wire.to.nodeId);
                        if (!n1 || !n2) return null;
                        const p1 = getPinPosition(n1, wire.from, true);
                        const p2 = getPinPosition(n2, wire.to, false);
                        return <Wire key={wire.id} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} active={n1.value === 1} />;
                    })}
                    {activeWire && (() => {
                        const node = nodes.find(n => n.id === activeWire.nodeId);
                        if (!node) return null;
                        const p = getPinPosition(node, activeWire, true);
                        return <Wire x1={p.x} y1={p.y} x2={mousePos.x} y2={mousePos.y} />;
                    })()}
                </svg>

                {nodes.map((node) => (
                    <Node
                        key={node.id}
                        id={node.id}
                        type={node.type}
                        x={node.x}
                        y={node.y}
                        value={node.value}
                        label={node.label}
                        workspaceRef={workspaceRef}
                        updateNodePosition={updateNodePosition}
                        onPinClick={handlePinClick}
                        camera={camera}
                        selected={selectedNodes.includes(node.id)}
                        onSelect={(id) => { setSelectionBox(null); setSelectedNodes([id]); }}
                        cancelWire={() => setActiveWire(null)}
                        onContextMenu={openNodeMenu}
                    />
                ))}
            </div>

            {selectionBox && (
                <div style={{
                    position: "absolute",
                    left: Math.min(selectionBox.startX, selectionBox.endX),
                    top: Math.min(selectionBox.startY, selectionBox.endY),
                    width: Math.abs(selectionBox.endX - selectionBox.startX),
                    height: Math.abs(selectionBox.endY - selectionBox.startY),
                    border: "1px dashed #89b4fa", background: "rgba(137,180,250,0.1)", pointerEvents: "none"
                }} />
            )}

            {/* Delete hint when nodes selected */}
            {selectedNodes.length > 1 && (
                <div style={{
                    position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
                    background: "#313244", color: "#a6adc8", fontSize: "12px",
                    padding: "5px 12px", borderRadius: "6px", border: "1px solid #45475a",
                    pointerEvents: "none"
                }}>
                    {selectedNodes.length} selected · Del to delete
                </div>
            )}

            {/* Node context menu */}
            {nodeMenu && (
                <div
                    style={{
                        position: "fixed", left: nodeMenu.x, top: nodeMenu.y,
                        background: "#1e1e2e", border: "1px solid #45475a",
                        borderRadius: "8px", padding: "6px", minWidth: "170px",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.5)", zIndex: 2000,
                        display: "flex", flexDirection: "column", gap: "2px"
                    }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                >
                    {nodeMenu.mode === "menu" ? (
                        <>
                            <div style={menuStyles.header}>
                                {nodes.find(n => n.id === nodeMenu.nodeId)?.type}
                            </div>
                            <div style={menuStyles.item} onMouseDown={handleSetLabel}>
                                🏷️ {nodes.find(n => n.id === nodeMenu.nodeId)?.label ? "Edit label" : "Add label"}
                            </div>
                            <div style={menuStyles.item} onMouseDown={handleDuplicateNode}>
                                ⧉ Duplicate
                            </div>
                            <div style={{ height: 1, background: "#313244", margin: "3px 0" }} />
                            <div style={{ ...menuStyles.item, color: "#f38ba8" }} onMouseDown={handleDeleteNode}>
                                🗑️ Delete
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={menuStyles.header}>Label</div>
                            <input
                                ref={labelInputRef}
                                value={nodeMenu.labelValue}
                                onChange={e => setNodeMenu(prev => ({ ...prev, labelValue: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter") confirmLabel(); if (e.key === "Escape") setNodeMenu(null); }}
                                placeholder="e.g. Input A"
                                style={{
                                    padding: "7px 10px", borderRadius: "5px", fontSize: "13px",
                                    border: "1px solid #45475a", background: "#313244", color: "#cdd6f4",
                                    outline: "none", width: "100%", boxSizing: "border-box"
                                }}
                            />
                            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                                <button onMouseDown={() => setNodeMenu(null)} style={menuStyles.btnCancel}>Cancel</button>
                                <button onMouseDown={confirmLabel} style={menuStyles.btnPrimary}>Set</button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

const menuStyles = {
    header: {
        padding: "5px 10px", fontSize: "11px", color: "#6c7086",
        borderBottom: "1px solid #313244", marginBottom: "3px",
        fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.06em"
    },
    item: {
        padding: "7px 12px", borderRadius: "5px", cursor: "pointer",
        fontSize: "13px", color: "#cdd6f4", userSelect: "none",
    },
    btnCancel: {
        flex: 1, padding: "6px", borderRadius: "5px", border: "1px solid #45475a",
        background: "transparent", color: "#cdd6f4", cursor: "pointer", fontSize: "12px"
    },
    btnPrimary: {
        flex: 1, padding: "6px", borderRadius: "5px", border: "none",
        background: "#89b4fa", color: "#1e1e2e", fontWeight: "bold", cursor: "pointer", fontSize: "12px"
    }
};

export default Workspace;