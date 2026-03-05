import { sidebarItems } from "../../configs/gates";
import "../../styles/sidebar.css"

// savedNames comes from React state in App — this is what triggers re-render
function Sidebar({ addNode, onSaveCircuit, savedNames = [] }) {

    return (
        <div className="sidebar">

            <h3>Components</h3>

            {sidebarItems.map((item) => (
                <div
                    key={item}
                    className="sidebar-item"
                    onClick={() => addNode(item)}
                >
                    {item}
                </div>
            ))}

            {savedNames.length > 0 && (
                <>
                    <h3 style={{ marginTop: "16px", fontSize: "12px", color: "#aaa" }}>Saved</h3>
                    {savedNames.map(name => (
                        <div
                            key={name}
                            className="sidebar-item"
                            onClick={() => addNode(name)}
                        >
                            📦 {name}
                        </div>
                    ))}
                </>
            )}

            <button
                className="sidebar-save"
                onClick={onSaveCircuit}
            >
                Save Circuit
            </button>

        </div>
    );
}

export default Sidebar;