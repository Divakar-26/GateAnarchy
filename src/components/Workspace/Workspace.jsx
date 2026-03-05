import { useState, useRef } from "react";
import '../../styles/workspace.css';
import Node from "../Node";
import Wire from "../Wire";

function Workspace({ nodes, setNodes }) {
    const workspaceRef = useRef(null);
    const grid = 20;

    const [wires, setWires] = useState([]);
    const [activeWire, setActiveWire] = useState(null);
    const updateNodePosition = (id, x, y) => {

        const snappedX = Math.round(x / grid) * grid;
        const snappedY = Math.round(y / grid) * grid;

        const clampedX = Math.max(0, snappedX);
        const clampedY = Math.max(0, snappedY);

        setNodes((prev) =>
            prev.map((node) =>
                node.id === id ? { ...node, x: clampedX, y: clampedY } : node
            )
        );
    };

    const handlePinClick = (pin) => {

        // start wire
        if (!activeWire) {
            if (pin.type === "output") {
                setActiveWire(pin);
            }
            return;
        }

        // finish wire
        if (activeWire.type === "output" && pin.type === "input") {

            const newWire = {
                id: Date.now(),
                from: {
                    nodeId: activeWire.nodeId,
                    index: activeWire.index,
                    total: activeWire.total
                },
                to: {
                    nodeId: pin.nodeId,
                    index: pin.index,
                    total: pin.total
                }
            };

            setWires(prev => [...prev, newWire]);
        }

        setActiveWire(null);
    };

    const handleMouseDown = (e) => {

        const rect = workspaceRef.current.getBoundingClientRect();

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setOffset({
            x: mouseX - x,
            y: mouseY - y
        });

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseUp = () => {
        setDragging(false);

        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
    }

    function getPinPosition(node, pin, isOutput) {

        const NODE_WIDTH = 80
        const NODE_HEIGHT = 40

        const spacing = NODE_HEIGHT / (pin.total + 1)
        const y = node.y + spacing * (pin.index + 1)

        const x = isOutput
            ? node.x + NODE_WIDTH
            : node.x

        return { x, y }
    }

    return (

        <div className="workspace" ref={workspaceRef}>

            <svg className="wire-layer">

                {wires.map(wire => {

                    const n1 = nodes.find(n => n.id === wire.from.nodeId);
                    const n2 = nodes.find(n => n.id === wire.to.nodeId);

                    if (!n1 || !n2) return null;

                    const p1 = getPinPosition(n1, wire.from, true)
                    const p2 = getPinPosition(n2, wire.to, false)

                    const x1 = p1.x
                    const y1 = p1.y

                    const x2 = p2.x
                    const y2 = p2.y

                    return (
                        <Wire
                            key={wire.id}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                        />
                    );
                })}

            </svg>

            {nodes.map((node) => (
                <Node
                    key={node.id}
                    id={node.id}
                    type={node.type}
                    x={node.x}
                    y={node.y}
                    workspaceRef={workspaceRef}
                    updateNodePosition={updateNodePosition}
                    onPinClick={handlePinClick}
                />
            ))}

        </div>
    );
}


export default Workspace;