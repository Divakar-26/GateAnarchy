export const customComponentRegistry = {};

export function registerComponent(name, nodes, wires, inputPinMap, outputPinMap) {
  customComponentRegistry[name] = {
    name,
    nodes,
    wires,
    inputPinMap,
    outputPinMap
  };

  localStorage.setItem(
    "customComponents",
    JSON.stringify(customComponentRegistry)
  );
}

export function loadSavedComponents() {
  const saved = localStorage.getItem("customComponents");
  if (saved) {
    Object.assign(customComponentRegistry, JSON.parse(saved));
  }
}