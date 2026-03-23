export const customComponentRegistry = {};

function arrEq(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function readOutput(values, nodeId, outputIndex) {
  const v = values[nodeId];
  if (Array.isArray(v)) return v[outputIndex] ?? 0;
  return outputIndex === 0 ? (v ?? 0) : 0;
}

function topoSort(nodeArray, wires) {
  const inDeg = new Map(), adj = new Map();
  nodeArray.forEach(n => { inDeg.set(n.id, 0); adj.set(n.id, []); });
  const seen = new Set();
  wires.forEach(w => {
    if (!adj.has(w.from.nodeId) || !inDeg.has(w.to.nodeId)) return;
    const k = `${w.from.nodeId}→${w.to.nodeId}`;
    if (seen.has(k)) return; seen.add(k);
    adj.get(w.from.nodeId).push(w.to.nodeId);
    inDeg.set(w.to.nodeId, inDeg.get(w.to.nodeId) + 1);
  });
  const queue = []; inDeg.forEach((d, id) => { if (d === 0) queue.push(id); });
  const sorted = [];
  while (queue.length) {
    const id = queue.shift(); sorted.push(id);
    for (const nid of adj.get(id)) {
      const d = inDeg.get(nid) - 1; inDeg.set(nid, d);
      if (d === 0) queue.push(nid);
    }
  }
  const s = new Set(sorted);
  nodeArray.forEach(n => { if (!s.has(n.id)) sorted.push(n.id); });
  const byId = new Map(nodeArray.map(n => [n.id, n]));
  return sorted.map(id => byId.get(id)).filter(Boolean);
}

function hasFeedbackCircuit(nodes, wires, registry) {
  for (const n of nodes) {
    if (registry[n.type]?.hasFeedback) return true;
  }
  const adj = new Map();
  nodes.forEach(n => adj.set(n.id, []));
  wires.forEach(w => {
    if (adj.has(w.from.nodeId) && adj.has(w.to.nodeId))
      adj.get(w.from.nodeId).push(w.to.nodeId);
  });
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map(); nodes.forEach(n => color.set(n.id, WHITE));
  function dfs(id) {
    color.set(id, GRAY);
    for (const nxt of (adj.get(id) || [])) {
      if (color.get(nxt) === GRAY) return true;
      if (color.get(nxt) === WHITE && dfs(nxt)) return true;
    }
    color.set(id, BLACK); return false;
  }
  for (const n of nodes) if (color.get(n.id) === WHITE && dfs(n.id)) return true;
  return false;
}

// ── Handles ALL gate types including NPN ─────────────────────────────────────
function evalGate(type, ins, registry) {
  switch (type) {
    case "AND":      return [(ins[0] && ins[1]) ? 1 : 0];
    case "OR":       return [(ins[0] || ins[1]) ? 1 : 0];
    case "NOT":      return [ins[0] ? 0 : 1];
    case "NAND":     return [(ins[0] && ins[1]) ? 0 : 1];
    case "NOR":      return [(ins[0] || ins[1]) ? 0 : 1];
    case "XOR":      return [ins[0] !== ins[1] ? 1 : 0];
    case "XNOR":     return [ins[0] === ins[1] ? 1 : 0];
    case "NPN":      return [ins[0] === 1 ? (ins[1] ?? 0) : 0];
    case "LED":      return [ins[0] ? 1 : 0];
    case "SWITCH":   return [ins[0] ?? 0];
    case "JUNCTION": return [ins[0] ?? 0];
    default: {
      const comp = registry[type];
      if (!comp) return [0];
      if (comp.hasFeedback) return new Array(comp.outputCount).fill(0);
      if (comp.truthTable) {
        const key = ins.slice(0, comp.inputCount).join("");
        return comp.truthTable[key] ?? new Array(comp.outputCount).fill(0);
      }
      return new Array(comp.outputCount ?? 1).fill(0);
    }
  }
}

function expectedInputCount(type, registry) {
  switch (type) {
    case "NOT":
    case "LED":
    case "JUNCTION": return 1;
    case "AND":
    case "OR":
    case "NAND":
    case "NOR":
    case "XOR":
    case "XNOR":
    case "NPN":      return 2;
    case "SWITCH":
    case "CLOCK":    return 0;
    default: {
      const comp = registry[type];
      return comp ? comp.inputCount : 2;
    }
  }
}

// ── Truth table — 200 iterations handles SR latch convergence ────────────────
function buildTruthTable(nodes, wires, inputPinMap, outputPinMap, registry) {
  const ic = inputPinMap.length;
  const table = {};
  const incoming = new Map();
  nodes.forEach(n => incoming.set(n.id, []));
  wires.forEach(w => {
    if (!incoming.has(w.to.nodeId)) incoming.set(w.to.nodeId, []);
    incoming.get(w.to.nodeId).push(w);
  });
  const ordered = topoSort(nodes, wires);

  for (let combo = 0; combo < (1 << ic); combo++) {
    const iv = Array.from({ length: ic }, (_, i) => (combo >> (ic - 1 - i)) & 1);
    const key = iv.join("");
    const values = {};
    nodes.forEach(n => { values[n.id] = [n.value ?? 0]; });
    inputPinMap.forEach(({ nodeId }, i) => { values[nodeId] = [iv[i]]; });

    for (let iter = 0; iter < 200; iter++) {
      let changed = false;
      ordered.forEach(node => {
        if (node.type === "SWITCH" || node.type === "CLOCK") return;
        const ei = expectedInputCount(node.type, registry);
        const ins = new Array(Math.max(ei, 1)).fill(0);
        (incoming.get(node.id) || []).forEach(w => {
          if (w.to.index < ins.length)
            ins[w.to.index] = readOutput(values, w.from.nodeId, w.from.index ?? 0);
        });
        const nv = evalGate(node.type, ins, registry);
        if (!arrEq(values[node.id], nv)) { values[node.id] = nv; changed = true; }
      });
      if (!changed) break;
    }
    table[key] = outputPinMap.map(({ nodeId }) => readOutput(values, nodeId, 0));
  }
  return table;
}

// ── Live evaluation for feedback circuits (SR latch, D latch, registers…) ────
export function evaluateFeedbackComponent(compType, inputValues, currentInternalState = {}) {
  const comp = customComponentRegistry[compType];
  if (!comp) return { outputs: [], newInternalState: {} };

  const { nodes, wires, inputPinMap, outputPinMap } = comp;
  const registry = customComponentRegistry;

  const values = {};
  nodes.forEach(n => {
    const stored = currentInternalState[n.id];
    values[n.id] = Array.isArray(stored) ? [...stored] : [n.value ?? 0];
  });
  inputPinMap.forEach(({ nodeId }, i) => {
    values[nodeId] = [inputValues[i] ?? 0];
  });

  const incoming = {};
  nodes.forEach(n => { incoming[n.id] = []; });
  wires.forEach(w => {
    if (!incoming[w.to.nodeId]) incoming[w.to.nodeId] = [];
    incoming[w.to.nodeId].push(w);
  });

  const subStates = {};
  nodes.forEach(n => {
    if (registry[n.type]?.hasFeedback)
      subStates[n.id] = currentInternalState[`__sub_${n.id}`] || {};
  });

  // 500 passes for deeply nested feedback circuits
  for (let pass = 0; pass < 500; pass++) {
    let changed = false;
    nodes.forEach(node => {
      if (node.type === "SWITCH" || node.type === "CLOCK") return;

      const subComp = registry[node.type];
      const ei = expectedInputCount(node.type, registry);
      const ins = new Array(Math.max(ei, 1)).fill(0);
      (incoming[node.id] || []).forEach(w => {
        if (w.to.index < ins.length)
          ins[w.to.index] = readOutput(values, w.from.nodeId, w.from.index ?? 0);
      });

      let newVal;
      if (subComp?.hasFeedback) {
        const result = evaluateFeedbackComponent(node.type, ins, subStates[node.id] || {});
        subStates[node.id] = result.newInternalState;
        newVal = result.outputs.length > 0
          ? result.outputs
          : new Array(subComp.outputCount).fill(0);
      } else if (subComp?.truthTable) {
        const k = ins.slice(0, subComp.inputCount).join("");
        newVal = subComp.truthTable[k] ?? new Array(subComp.outputCount).fill(0);
      } else {
        newVal = evalGate(node.type, ins, registry);
      }

      if (!arrEq(values[node.id], newVal)) {
        values[node.id] = newVal;
        changed = true;
      }
    });
    if (!changed) break;
  }

  const outputs = outputPinMap.map(({ nodeId }) => readOutput(values, nodeId, 0));

  // FIX: declare newInternalState before using it
  const newInternalState = {};
  nodes.forEach(n => {
    newInternalState[n.id] = Array.isArray(values[n.id]) ? [...values[n.id]] : [0];
    if (subStates[n.id] !== undefined)
      newInternalState[`__sub_${n.id}`] = subStates[n.id];
  });

  return { outputs, newInternalState };
}

export function registerComponent(name, nodes, wires, inputPinMap, outputPinMap) {
  const clonedNodes = JSON.parse(JSON.stringify(nodes));
  const clonedWires = JSON.parse(JSON.stringify(wires));

  const sortedInputs = [...inputPinMap].sort((a, b) => {
    const ya = clonedNodes.find(n => n.id === a.nodeId)?.y ?? 0;
    const yb = clonedNodes.find(n => n.id === b.nodeId)?.y ?? 0;
    return ya - yb;
  });
  const sortedOutputs = [...outputPinMap].sort((a, b) => {
    const ya = clonedNodes.find(n => n.id === a.nodeId)?.y ?? 0;
    const yb = clonedNodes.find(n => n.id === b.nodeId)?.y ?? 0;
    return ya - yb;
  });

  const feedback = hasFeedbackCircuit(clonedNodes, clonedWires, customComponentRegistry);

  customComponentRegistry[name] = {
    inputPinMap:  sortedInputs,
    outputPinMap: sortedOutputs,
    inputCount:   sortedInputs.length,
    outputCount:  sortedOutputs.length,
    hasFeedback:  feedback,
    truthTable:   feedback
      ? null
      : buildTruthTable(clonedNodes, clonedWires, sortedInputs, sortedOutputs, customComponentRegistry),
    nodes: clonedNodes,
    wires: clonedWires,
  };

  try {
    localStorage.setItem("customComponents", JSON.stringify(customComponentRegistry));
  } catch (e) {
    console.warn("Could not persist custom components:", e);
  }
}

export function loadSavedComponents() {
  try {
    const saved = localStorage.getItem("customComponents");
    if (saved) Object.assign(customComponentRegistry, JSON.parse(saved));
  } catch (e) {
    console.warn("Could not load saved components:", e);
  }
}