import { useState, useRef } from 'react'
import Sidebar from './components/Sidebar/Sidebar.jsx'
import Workspace from './components/Workspace/Workspace.jsx'
import { loadSavedComponents, registerComponent, customComponentRegistry } from "./configs/customComponents";

loadSavedComponents();

function App() {

  const [nodes, setNodes] = useState([
    { id: 1, type: "SWITCH", x: 120, y: 200, value: 1 },
    { id: 2, type: "AND", x: 350, y: 150, value: 0 },
    { id: 3, type: "LED", x: 600, y: 200, value: 0 },
  ]);
  const [wires, setWires] = useState([]);

  const [savedNames, setSavedNames] = useState(Object.keys(customComponentRegistry));
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveError, setSaveError] = useState("");
  const inputRef = useRef(null);

  const saveCircuit = () => {
    const switches = nodes.filter(n => n.type === "SWITCH");
    const leds = nodes.filter(n => n.type === "LED");
    if (!switches.length || !leds.length) {
      setSaveError("Need at least one SWITCH and one LED in the circuit.");
      setShowSaveModal(true);
      return;
    }
    setSaveError("");
    setSaveName("");
    setShowSaveModal(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const confirmSave = () => {
    if (!saveName.trim()) { setSaveError("Enter a name."); return; }
    const trimmed = saveName.trim().toUpperCase().replace(/\s+/g, "_");
    const switches = nodes.filter(n => n.type === "SWITCH");
    const leds = nodes.filter(n => n.type === "LED");
    registerComponent(
      trimmed,
      JSON.parse(JSON.stringify(nodes)),
      JSON.parse(JSON.stringify(wires)),
      switches.map(n => ({ nodeId: n.id, pinIndex: 0 })),
      leds.map(n => ({ nodeId: n.id, pinIndex: 0 }))
    );
    setSavedNames(Object.keys(customComponentRegistry));
    setShowSaveModal(false);
    setSaveName("");
  };

  const addNode = (type) => {
    setNodes(prev => [...prev, {
      id: Date.now(),
      type,
      x: 200,
      y: 200,
      value: 0
    }]);
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar addNode={addNode} onSaveCircuit={saveCircuit} savedNames={savedNames} />
      <Workspace nodes={nodes} setNodes={setNodes} wires={wires} setWires={setWires} />

      {showSaveModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#1e1e2e", color: "#cdd6f4", borderRadius: "10px",
            padding: "28px 32px", minWidth: "300px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            display: "flex", flexDirection: "column", gap: "12px"
          }}>
            <h2 style={{ margin: 0, fontSize: "18px" }}>Save Component</h2>

            {saveError
              ? <p style={{ margin: 0, color: "#f38ba8", fontSize: "13px" }}>{saveError}</p>
              : <p style={{ margin: 0, color: "#a6adc8", fontSize: "13px" }}>
                  {nodes.filter(n=>n.type==="SWITCH").length} input(s) · {nodes.filter(n=>n.type==="LED").length} output(s)
                </p>
            }

            {!saveError.includes("SWITCH") && (
              <input
                ref={inputRef}
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && confirmSave()}
                placeholder="e.g. HALF_ADDER"
                style={{
                  padding: "8px 12px", borderRadius: "6px", fontSize: "15px",
                  border: "1px solid #45475a", background: "#313244", color: "#cdd6f4",
                  outline: "none"
                }}
              />
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowSaveModal(false)} style={{
                padding: "7px 16px", borderRadius: "6px", border: "1px solid #45475a",
                background: "transparent", color: "#cdd6f4", cursor: "pointer"
              }}>Cancel</button>

              {!saveError.includes("SWITCH") && (
                <button onClick={confirmSave} style={{
                  padding: "7px 16px", borderRadius: "6px", border: "none",
                  background: "#89b4fa", color: "#1e1e2e", fontWeight: "bold", cursor: "pointer"
                }}>Save</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;