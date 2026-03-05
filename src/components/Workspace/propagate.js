import { evaluateCustomComponent } from "../../utils/propagateCustom";
import { customComponentRegistry } from "../../configs/customComponents";

export function propagate(nodes, wires) {

  const nodeMap = new Map();
  nodes.forEach(n => nodeMap.set(n.id, { ...n }));

  const inputs = {};

  wires.forEach(w => {

    const fromNode = nodeMap.get(w.from.nodeId);

    if (!inputs[w.to.nodeId]) {
      inputs[w.to.nodeId] = [];
    }

    inputs[w.to.nodeId][w.to.index] = fromNode.value;
  });

  nodeMap.forEach(node => {

    if (node.type === "SWITCH") return;

    const expectedInputs = node.type === "NOT" ? 1 : (node.type === "LED" ? 1 : 2);

    const inVals = inputs[node.id] || [];

    const filledInputs = [];

    for (let i = 0; i < expectedInputs; i++) {
      filledInputs[i] = inVals[i] ?? 0;
    }

    switch (node.type) {

      case "AND":
        node.value = filledInputs[0] && filledInputs[1] ? 1 : 0;
        break;

      case "OR":
        node.value = filledInputs[0] || filledInputs[1] ? 1 : 0;
        break;

      case "NOT":
        node.value = filledInputs[0] ? 0 : 1;
        break;

      case "LED":
        node.value = filledInputs[0] ? 1 : 0;
        break;

      default:
        if (customComponentRegistry[node.type]) {

          const comp = customComponentRegistry[node.type];

          const inVals = inputs[node.id] || [];

          const filled = Array.from(
            { length: comp.inputPinMap.length },
            (_, i) => inVals[i] ?? 0
          );

          const outputs = evaluateCustomComponent(node.type, filled);

          node.outputs = outputs;
          node.value = outputs[0] ?? 0;

          return;
        }
    }

  });

  return Array.from(nodeMap.values());
}