export const customComponentRegistry = {};

export function registerComponent(name, nodes, wires, inputPinMap, outputPinMap) {
  // Deep clone everything
  const clonedNodes = JSON.parse(JSON.stringify(nodes));
  const clonedWires = JSON.parse(JSON.stringify(wires));

  // Sort inputPinMap by the Y position of the corresponding SWITCH node
  // so pin order always matches top-to-bottom visual order
  const sortedInputPinMap = [...inputPinMap].sort((a, b) => {
    const nodeA = clonedNodes.find(n => n.id === a.nodeId);
    const nodeB = clonedNodes.find(n => n.id === b.nodeId);
    return (nodeA?.y ?? 0) - (nodeB?.y ?? 0);
  });

  // Sort outputPinMap by Y position of LED nodes
  const sortedOutputPinMap = [...outputPinMap].sort((a, b) => {
    const nodeA = clonedNodes.find(n => n.id === a.nodeId);
    const nodeB = clonedNodes.find(n => n.id === b.nodeId);
    return (nodeA?.y ?? 0) - (nodeB?.y ?? 0);
  });

  customComponentRegistry[name] = {
    name,
    nodes: clonedNodes,
    wires: clonedWires,
    inputPinMap: sortedInputPinMap,
    outputPinMap: sortedOutputPinMap,
  };

  localStorage.setItem("customComponents", JSON.stringify(customComponentRegistry));
}

export function loadSavedComponents() {
  const saved = localStorage.getItem("customComponents");
  if (saved) {
    Object.assign(customComponentRegistry, JSON.parse(saved));
  }
}