
export const sequentialConfig = {
  CLOCK:   { inputs: 0, outputs: 1, label: "CLK",  color: "#2a6a8a" },
  DFF:     { inputs: 2, outputs: 2, label: "D-FF",  color: "#1a4a7a" },
  SRFF:    { inputs: 3, outputs: 2, label: "SR-FF", color: "#4a1a7a" },
  JKFF:    { inputs: 3, outputs: 2, label: "JK-FF", color: "#1a4a4a" },
  TFF:     { inputs: 2, outputs: 2, label: "T-FF",  color: "#4a3a1a" },
};

export const SEQUENTIAL_TYPES = Object.keys(sequentialConfig);

export const sequentialSidebarItems = ["CLOCK", "DFF", "SRFF", "JKFF", "TFF"];

export function tickClock(node) {
  return { ...node, value: node.value ? 0 : 1 };
}

// ── Flip-flop evaluation ──────────────────────────────────────────────────────
// prevNode: node before this tick (has flipState = { q: 0|1, prevClk: 0|1 })
// inputs: array of input values [pin0, pin1, ...]

  const getClk  = (arr, idx) => arr[idx] ?? 0;
  const rising  = (clk) => clk === 1 && state.prevClk === 0;

  switch (type) { 
    case "DFF": {
      const [d, clk] = [inputs[0] ?? 0, inputs[1] ?? 0];
      if (rising(clk)) q = d;
      return mkResult(q, inputs[inputs.length - 1] ?? 0);
    }
    case "SRFF": {
      const [s, r, clk] = [inputs[0] ?? 0, inputs[1] ?? 0, inputs[2] ?? 0];
      if (rising(clk)) {
        if (s && !r)       q = 1;
        else if (!s && r)  q = 0;
      }
      return mkResult(q, inputs[2]);
    }
    case "JKFF": {
      const [j, k, clk] = [inputs[0] ?? 0, inputs[1] ?? 0, inputs[2] ?? 0];
      if (rising(clk)) {
        if (j && k)         q = q ? 0 : 1;
        else if (j && !k)   q = 1;
        else if (!j && k)   q = 0;
      }
      return mkResult(q, inputs[2]); 
    }
    case "TFF": {
      const [t, clk] = [inputs[0] ?? 0, inputs[1] ?? 0];
      if (rising(clk) && t) q = q ? 0 : 1;
      return mkResult(q, inputs[1]);
    }
    default: 
      return mkResult(q, 0);
  }

  function mkResult(newQ, clk) {
    return {
      value:     newQ,
      outputs:   [newQ, newQ ? 0 : 1],
      flipState: { q: newQ, prevClk: clk },
    };
  }
}