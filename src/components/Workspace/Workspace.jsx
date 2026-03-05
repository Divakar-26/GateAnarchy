import { useState, useRef} from "react";
import '../../styles/workspace.css'
import Node from "../Node"

function Workspace() {
    const workspaceRef = useRef(null);

    const [nodes, setNodes] = useState([
        { id: 1, type: "SWITCH", x: 120, y: 200 },
        { id: 2, type: "AND", x: 350, y: 150 },
        { id: 3, type: "LED", x: 600, y: 200 },
    ]);

    const grid = 20;

    const updateNodePosition = (id, x, y) => {
        const snappedX = Math.round(x / grid) * grid;
        const snappedY = Math.round(y / grid) * grid;

        setNodes((prev) =>
            prev.map((node) =>
                node.id === id ? { ...node, x:  snappedX, y: snappedY } : node
            )
        );
    };

    return (
        <div className="workspace" ref={workspaceRef}>

            {nodes.map((node) => (
                <Node
                    key={node.id}
                    id={node.id}
                    type={node.type}
                    x={node.x}
                    y={node.y}
                    workspaceRef={workspaceRef}
                    updateNodePosition={updateNodePosition}
                />
            ))}

        </div>
    );
}


export default Workspace;