import { useState } from 'react'

function Node({ id, type, x, y, updateNodePosition, workspaceRef }) {

    const [dragging, setDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

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

    const handleMouseMove = (e) => {
        const rect = workspaceRef.current.getBoundingClientRect();

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        updateNodePosition(
            id,
            mouseX - offset.x,
            mouseY - offset.y
        );
    };

    return (
        <div
            onMouseDown={handleMouseDown}
            style={{
                position: "absolute",
                left: x,
                top: y,

                width: "80px",
                height: "40px",

                background: "#333",
                color: "white",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                borderRadius: "4px",
                border: "1px solid #555",

                cursor: "grab",
                userSelect: "none",
            }}>
            {type}
        </div>
    )
}

export default Node;