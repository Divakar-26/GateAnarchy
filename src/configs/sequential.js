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




export function evaluateFlipFlop(type, inputs, state = { q: 0, prevClk: 0 }) {
  let q = state.q ?? 0;

  const rising = (clk) => clk === 1 && (state.prevClk ?? 0) === 0;

  function mkResult(newQ, clk) {
    return {
      value:     newQ,
      outputs:   [newQ, newQ ? 0 : 1],
      flipState: { q: newQ, prevClk: clk },
    };
  }

  switch (type) {
    case "DFF": {
      const d   = inputs[0] ?? 0;
      const clk = inputs[1] ?? 0;
      if (rising(clk)) q = d;
      return mkResult(q, clk);
    }
    case "SRFF": {
      const s   = inputs[0] ?? 0;
      const r   = inputs[1] ?? 0;
      const clk = inputs[2] ?? 0;
      if (rising(clk)) {
        if (s && !r)      q = 1;
        else if (!s && r) q = 0;
        
      }
      return mkResult(q, clk);
    }
    case "JKFF": {
      const j   = inputs[0] ?? 0;
      const k   = inputs[1] ?? 0;
      const clk = inputs[2] ?? 0;
      if (rising(clk)) {
        if      (j && k)  q = q ? 0 : 1; 
        else if (j && !k) q = 1;
        else if (!j && k) q = 0;
        
      }
      return mkResult(q, clk);
    }
    case "TFF": {
      const t   = inputs[0] ?? 0;
      const clk = inputs[1] ?? 0;
      if (rising(clk) && t) q = q ? 0 : 1;
      return mkResult(q, clk);
    }
    default:
      return mkResult(q, 0);
  }
}