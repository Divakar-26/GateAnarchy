// src/components/Workspace/propagate.js

import { evaluateCustomComponent } from "../../utils/propagateCustom";
import { customComponentRegistry }  from "../../configs/customComponents";

// ── Topological sort (Kahn's algorithm) ──────────────────────────────────────
// Returns nodes in evaluation order: sources first, sinks last.
// Handles disconnected subgraphs; appends cycle-members at end unchanged.
function topoSort(nodeArray, wires) {
    const inDeg = new Map();
    const adj   = new Map();
    nodeArray.forEach(n => { inDeg.set(n.id, 0); adj.set(n.id, []); });

    // Count in-degrees and build adjacency.
    // Use a Set per edge to avoid counting multi-wire fan-out as multiple in-degrees.
    const edgeSeen = new Set();
    wires.forEach(w => {
        if (!adj.has(w.from.nodeId) || !inDeg.has(w.to.nodeId)) return;
        const edgeKey = `${w.from.nodeId}→${w.to.nodeId}`;
        if (edgeSeen.has(edgeKey)) return;
        edgeSeen.add(edgeKey);
        adj.get(w.from.nodeId).push(w.to.nodeId);
        inDeg.set(w.to.nodeId, inDeg.get(w.to.nodeId) + 1);
    });

    const queue  = [];
    inDeg.forEach((deg, id) => { if (deg === 0) queue.push(id); });

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

    // Any remaining nodes are in cycles (shouldn't happen in combinational logic)
    const seen = new Set(sorted);
    nodeArray.forEach(n => { if (!seen.has(n.id)) sorted.push(n.id); });

    const byId = new Map(nodeArray.map(n => [n.id, n]));
    return sorted.map(id => byId.get(id)).filter(Boolean);
}

// ── Fast array equality (avoids JSON.stringify) ───────────────────────────────
function arrEq(a, b) {
    if (a === b) return true;
    if (!a || !b) return a == b;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

// ── Main propagation ──────────────────────────────────────────────────────────
export function propagate(nodes, wires) {
    const nodeMap = new Map();
    nodes.forEach(n => nodeMap.set(n.id, { ...n }));

    // Pre-build: for each node, which wires feed into it
    const wiresTo = new Map();   // nodeId → [wire, ...]
    // Pre-build: for each node, which wires leave from it
    const wiresFrom = new Map(); // nodeId → [wire, ...]
    nodes.forEach(n => { wiresTo.set(n.id, []); wiresFrom.set(n.id, []); });
    wires.forEach(w => {
        wiresTo.get(w.to.nodeId)?.push(w);
        wiresFrom.get(w.from.nodeId)?.push(w);
    });

    // Build inputsMap: nodeId → [value at pin 0, value at pin 1, ...]
    // Seeded from source nodes that own their own outputs array (IN_N)
    const inputsMap = new Map();
    wires.forEach(w => {
        const fromNode = nodeMap.get(w.from.nodeId);
        if (!fromNode) return;
        if (!inputsMap.has(w.to.nodeId)) inputsMap.set(w.to.nodeId, []);
        const arr = inputsMap.get(w.to.nodeId);
        const fromVal = (fromNode.outputs && fromNode.outputs[w.from.index] !== undefined)
            ? fromNode.outputs[w.from.index]
            : fromNode.value;
        arr[w.to.index] = fromVal;
    });

    // Evaluate in topological order — single pass is sufficient after topo sort
    const ordered = topoSort(Array.from(nodeMap.values()), wires);

    ordered.forEach(node => {
        // Source nodes own their values — skip
        if (node.type === "SWITCH" || node.type === "CLOCK" || node.type.startsWith("IN_")) return;

        const customComp = customComponentRegistry[node.type];

        let expectedInputs;
        if (node.type === "NOT" || node.type === "LED" || node.type === "JUNCTION") {
            expectedInputs = 1;
        } else if (node.type.startsWith("OUT_")) {
            expectedInputs = parseInt(node.type.split("_")[1]) || 1;
        } else if (customComp) {
            expectedInputs = customComp.inputPinMap.length;
        } else {
            expectedInputs = 2;
        }

        const inArr  = inputsMap.get(node.id) || [];
        const filled = Array.from({ length: expectedInputs }, (_, i) => inArr[i] ?? 0);

        let newValue   = node.value;
        let newOutputs = node.outputs;

        switch (node.type) {
            case "AND":     newValue = filled[0] && filled[1] ? 1 : 0; break;
            case "OR":      newValue = filled[0] || filled[1] ? 1 : 0; break;
            case "NOT":     newValue = filled[0] ? 0 : 1;              break;
            case "LED":     newValue = filled[0] ? 1 : 0;              break;
            case "JUNCTION":newValue = filled[0];                       break;
            default:
                if (node.type.startsWith("OUT_")) {
                    newValue   = filled[0] ?? 0;
                    newOutputs = filled.slice();
                } else if (customComp) {
                    const outs = evaluateCustomComponent(node.type, filled);
                    newOutputs = outs;
                    newValue   = outs[0] ?? 0;
                }
        }

        const valChanged = newValue !== node.value;
        const outChanged = !arrEq(newOutputs, node.outputs);

        if (valChanged || outChanged) {
            node.value   = newValue;
            node.outputs = newOutputs;

            // Propagate updated value forward to downstream nodes immediately
            // so they see the correct value when it's their turn in topo order
            (wiresFrom.get(node.id) || []).forEach(w => {
                if (!inputsMap.has(w.to.nodeId)) inputsMap.set(w.to.nodeId, []);
                const arr = inputsMap.get(w.to.nodeId);
                const outVal = (newOutputs && newOutputs[w.from.index] !== undefined)
                    ? newOutputs[w.from.index]
                    : newValue;
                arr[w.to.index] = outVal;
            });
        }
    });

    return Array.from(nodeMap.values());
}