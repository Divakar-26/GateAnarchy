import { customComponentRegistry } from "./customComponents";

export const gateConfig = {
  SWITCH: { inputs: 0, outputs: 1 },
  LED: { inputs: 1, outputs: 0 },
  AND: { inputs: 2, outputs: 1 },
  OR: { inputs: 2, outputs: 1 },
  NOT: { inputs: 1, outputs: 1 },
};

export const gateColors = {
  SWITCH: "#2ecc71",
  AND: "#3498db",
  OR: "#9b59b6",
  NOT: "#e67e22",
  LED: "#e74c3c",
};

Object.keys(customComponentRegistry).forEach(name => {
  if (!gateColors[name]) {
    const colors = [
      "#6c5ce7",
      "#00b894",
      "#0984e3",
      "#fd79a8",
      "#e17055",
      "#00cec9"
    ];
    const index = name.length % colors.length;
    gateColors[name] = colors[index];
  }
});

export const sidebarItems = [
  "SWITCH",
  "LED",
  "AND",
  "OR",
  "NOT",
];