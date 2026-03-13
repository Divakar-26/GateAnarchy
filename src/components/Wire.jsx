import { useSettings } from "../configs/SettingsContext";

function Wire({ x1, y1, x2, y2, active }) {
  const { settings } = useSettings();
  const { wireActiveColor, wireInactiveColor, wireStyle } = settings;

  const dx = x2 - x1;
  const color = active ? wireActiveColor : wireInactiveColor;
  const width = active ? 2.5 : 1.8;

  let path;
  if (wireStyle === "straight") {
    path = `M ${x1} ${y1} L ${x2} ${y2}`;
  } else {
    const strength = Math.max(Math.abs(dx) * 0.6, 60);
    path = `M ${x1} ${y1} C ${x1 + strength} ${y1}, ${x2 - strength} ${y2}, ${x2} ${y2}`;
  }

  return (
    <g>
      {active && (
        <path d={path} stroke={wireActiveColor} strokeWidth={6}
          fill="none" strokeLinecap="round" opacity={0.18} />
      )}
      <path d={path} stroke={color} strokeWidth={width}
        fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x1} cy={y1} r={2.5} fill={color} />
      <circle cx={x2} cy={y2} r={2.5} fill={color} />
    </g>
  );
}

export default Wire;