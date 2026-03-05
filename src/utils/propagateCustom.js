import { propagate } from "../components/Workspace/propagate";
import { customComponentRegistry } from "../configs/customComponents";

export function evaluateCustomComponent(name, inputs) {

  const comp = customComponentRegistry[name];
  if (!comp) return [];

  let nodes = comp.nodes.map(n => ({ ...n }));
  const wires = comp.wires.map(w => ({ ...w }));

  comp.inputPinMap.forEach(({ nodeId }, i) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) node.value = inputs[i] ?? 0;
  });

  for (let i = 0; i < 5; i++) {
    nodes = propagate(nodes, wires);
  }

  return comp.outputPinMap.map(({ nodeId }) => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.value ?? 0;
  });
}