function Sidebar({addNode}){
    const items = ["Switch", "LED", "AND", "OR", "NOT"];

    return(
        <div style={{
            width: "220px",
            background: "#1e1e1e",
            color: "white",
            padding: "10px",
            boxSizing: "border-box",
        }}>
            <h3>Components</h3>
            
            {items.map((item) => (
            <div key={item} 
                 onClick={() => addNode(item)}
                 style={{
                    padding: "10px",
                    marginBottom: "8px",
                    background: "#333",
                    borderRadius: "4px",
                    cursor: "pointer",
                    textAlign: "center",
                 }}
            >
                {item}
            </div>))}
        </div>
    );
}

export default Sidebar;