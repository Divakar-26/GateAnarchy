// src/configs/customComponents.js

export const customComponentRegistry = {};

// ── Fast array equality ────────────────────────────────────────────────────────
function arrEq(a, b) {
    if (a === b) return true;
    if (!a || !b) return a == b;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

// ── Topological sort (Kahn's) ─────────────────────────────────────────────────
function topoSort(nodeArray, wires) {
    const inDeg = new Map();
    const adj   = new Map();
    nodeArray.forEach(n => { inDeg.set(n.id, 0); adj.set(n.id, []); });

    const edgeSeen = new Set();
    wires.forEach(w => {
        if (!adj.has(w.from.nodeId) || !inDeg.has(w.to.nodeId)) return;
        const key = `${w.from.nodeId}→${w.to.nodeId}`;
        if (edgeSeen.has(key)) return;
        edgeSeen.add(key);
        adj.get(w.from.nodeId).push(w.to.nodeId);
        inDeg.set(w.to.nodeId, inDeg.get(w.to.nodeId) + 1);
    });

    const queue = [];
    inDeg.forEach((d, id) => { if (d === 0) queue.push(id); });

    const sorted = [];
    while (queue.length) {
        const id = queue.shift();
        sorted.push(id);
        for (const nid of adj.get(id)) {
            const d = inDeg.get(nid) - 1;
            inDeg.set(nid, d);
            if (d === 0) queue.push(nid);
        }
    }

    const seen = new Set(sorted);
    nodeArray.forEach(n => { if (!seen.has(n.id)) sorted.push(n.id); });

    const byId = new Map(nodeArray.map(n => [n.id, n]));
    return sorted.map(id => byId.get(id)).filter(Boolean);
}

// ── values map: nodeId → scalar or array ──────────────────────────────────────
function readOutput(values, nodeId, outputIndex) {
    const v = values[nodeId];
    if (Array.isArray(v)) return v[outputIndex] ?? 0;
    return outputIndex === 0 ? (v ?? 0) : 0;
}

function evalNode(type, ins, registry) {
    switch (type) {
        case "AND":     return [(ins[0] && ins[1]) ? 1 : 0];
        case "OR":      return [(ins[0] || ins[1]) ? 1 : 0];
        case "NOT":     return [ins[0] ? 0 : 1];
        case "LED":     return [ins[0] ? 1 : 0];
        case "SWITCH":  return [ins[0] ?? 0];
        case "JUNCTION":return [ins[0] ?? 0];            // pass-through
        default: {
            if (type.startsWith("OUT_")) return ins.slice(); // collect bits
            const comp = registry[type];
            if (comp?.truthTable) {
                const key = ins.slice(0, comp.inputCount).join("");
                return comp.truthTable[key] ?? new Array(comp.outputCount).fill(0);
            }
            return [0];
        }
    }
}

function buildTruthTable(nodes, wires, inputPinMap, outputPinMap, registry) {
    const inputCount = inputPinMap.length;
    const table = {};

    // Pre-build incoming wire index per node
    const incoming = new Map();
    nodes.forEach(n => incoming.set(n.id, []));
    wires.forEach(w => {
        if (!incoming.has(w.to.nodeId)) incoming.set(w.to.nodeId, []);
        incoming.get(w.to.nodeId).push(w);
    });

    // Topological order (computed once, reused for every combo)
    const ordered = topoSort(nodes, wires);

    for (let combo = 0; combo < (1 << inputCount); combo++) {
        const inputVec = Array.from({ length: inputCount }, (_, i) =>
            (combo >> (inputCount - 1 - i)) & 1
        );
        const key = inputVec.join("");

        // values: nodeId → output array
        const values = {};
        nodes.forEach(n => { values[n.id] = [n.value ?? 0]; });

        // Inject SWITCH / IN_N inputs
        inputPinMap.forEach(({ nodeId }, i) => { values[nodeId] = [inputVec[i]]; });

        // Single pass in topological order — deterministic
        ordered.forEach(node => {
            // Source nodes own their values
            if (node.type === "SWITCH" || node.type === "CLOCK" || node.type.startsWith("IN_")) return;

            const comp = registry[node.type];
            const expectedInputs =
                node.type === "NOT" || node.type === "LED" || node.type === "JUNCTION" ? 1
                : node.type.startsWith("OUT_") ? (parseInt(node.type.split("_")[1]) || 1)
                : comp ? comp.inputCount
                : 2;

            const ins = new Array(expectedInputs).fill(0);
            (incoming.get(node.id) || []).forEach(w => {
                if (w.to.index < expectedInputs) {
                    ins[w.to.index] = readOutput(values, w.from.nodeId, w.from.index ?? 0);
                }
            });

            values[node.id] = evalNode(node.type, ins, registry);
        });

        table[key] = outputPinMap.map(({ nodeId }) => readOutput(values, nodeId, 0));
    }

    return table;
}

// ── Public API ─────────────────────────────────────────────────────────────────

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

    const truthTable = buildTruthTable(
        clonedNodes, clonedWires,
        sortedInputs, sortedOutputs,
        customComponentRegistry
    );

    customComponentRegistry[name] = {
        name,
        inputPinMap:  sortedInputs,
        outputPinMap: sortedOutputs,
        inputCount:   sortedInputs.length,
        outputCount:  sortedOutputs.length,
        truthTable,
        nodes: clonedNodes,
        wires: clonedWires,
    };

    localStorage.setItem("customComponents", JSON.stringify(customComponentRegistry));
}

export function loadSavedComponents() {
    const saved = localStorage.getItem("customComponents");
    if (saved) Object.assign(customComponentRegistry, JSON.parse(saved));
}