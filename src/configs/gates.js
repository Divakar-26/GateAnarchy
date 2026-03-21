
import { customComponentRegistry } from "./customComponents";

export const gateConfig = {
  SWITCH:   { inputs: 0, outputs: 1 },
  CLOCK:    { inputs: 0, outputs: 1 },
  LED:      { inputs: 1, outputs: 0 },
  AND:      { inputs: 2, outputs: 1 },
  OR:       { inputs: 2, outputs: 1 },
  NOT:      { inputs: 1, outputs: 1 },
  JUNCTION: { inputs: 1, outputs: 1 },
};

export const gateColors = {
  SWITCH:   "#1a7a40",
  CLOCK:    "#1a2a3a",
  AND:      "#1a5fa0",
  OR:       "#6b2fa0",
  NOT:      "#b85a10",
  LED:      "#a01020",
  JUNCTION: "#555e6e",
};

const CUSTOM_COLORS = [
  "#3d2b8e",
  "#0a6e50",
  "#0a5a8a", 
  "#8a1a5a",
  "#7a2a10",
  "#0a6a6a",
  "#5a3a8e",
  "#1a6a30",
];

function customColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return CUSTOM_COLORS[Math.abs(hash) % CUSTOM_COLORS.length];
}

Object.keys(customComponentRegistry).forEach(name => {
    if (!gateColors[name]) gateColors[name] = customColor(name);
});
 
export { customColor };
export const sidebarItems = ["SWITCH", "CLOCK", "LED", "AND", "OR", "NOT"]; 