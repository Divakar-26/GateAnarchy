import { customComponentRegistry } from "../configs/customComponents";

// Standalone gate evaluator — no circular import with propagate.js
function evalGate(type, inputs, registry) {
  switch (type) {
    case "AND":  return (inputs[0] && inputs[1]) ? 1 : 0;
    case "OR":   return (inputs[0] || inputs[1]) ? 1 : 0;
    case "NOT":  return inputs[0] ? 0 : 1;
    case "LED":  return inputs[0] ? 1 : 0;
    case "SWITCH": return inputs[0] ?? 0;
    default:
      if (registry[type]) {
        const filled = Array.from({ length: registry[type].inputPinMap.length }, (_, i) => inputs[i] ?? 0);
        return evaluateCustomComponent(type, filled)[0] ?? 0;
      }
      return 0;
  }
}

export function evaluateCustomComponent(name, inputValues) {
  const comp = customComponentRegistry[name];
  if (!comp) return [];

  // Work with a mutable value map keyed by node id
  const values = {};
  comp.nodes.forEach(n => { values[n.id] = n.value ?? 0; });

  // Inject external inputs into SWITCH nodes (in sorted order = top to bottom)
  comp.inputPinMap.forEach(({ nodeId }, i) => {
    values[nodeId] = inputValues[i] ?? 0;
  });

  // Build adjacency: for each node, which wires feed into it
  const incomingWires = {};
  comp.nodes.forEach(n => { incomingWires[n.id] = []; });
  comp.wires.forEach(w => {
    if (!incomingWires[w.to.nodeId]) incomingWires[w.to.nodeId] = [];
    incomingWires[w.to.nodeId].push(w);
  });

  // Topological-style multi-pass evaluation (up to 20 passes for complex nested circuits)
  for (let pass = 0; pass < 20; pass++) {
    let changed = false;

    comp.nodes.forEach(node => {
      if (node.type === "SWITCH") return; // value already set from inputPinMap

      const wires = incomingWires[node.id] || [];

      // Build the input array for this node
      const expectedInputs = node.type === "NOT" ? 1
        : node.type === "LED" ? 1
        : customComponentRegistry[node.type]
          ? customComponentRegistry[node.type].inputPinMap.length
          : 2;

      const ins = new Array(expectedInputs).fill(0);
      wires.forEach(w => {
        if (w.to.index < expectedInputs) {
          ins[w.to.index] = values[w.from.nodeId] ?? 0;
        }
      });

      const newVal = evalGate(node.type, ins, customComponentRegistry);
      if (newVal !== values[node.id]) {
        values[node.id] = newVal;
        changed = true;
      }
    });

    if (!changed) break; // stable
  }

  // Read outputs in sorted order (top to bottom)
  return comp.outputPinMap.map(({ nodeId }) => values[nodeId] ?? 0);
}