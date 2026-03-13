import { useState, useMemo } from "react";
import { customComponentRegistry } from "../../configs/customComponents";

const INPUT_NAMES  = ["A", "B", "Cin", "D", "E", "F", "G", "H"];
const OUTPUT_NAMES = ["Q", "S", "Cout", "Y", "Z", "W"];

function getInputName(i, label)  { return label || INPUT_NAMES[i]  || `I${i}`; }
function getOutputName(i, label) { return label || OUTPUT_NAMES[i] || `O${i}`; }

function evalBuiltin(type, inputs) {
    switch (type) {
        case "AND": return [inputs[0] & inputs[1]];
        case "OR":  return [inputs[0] | inputs[1]];
        case "NOT": return [inputs[0] ? 0 : 1];
        default:    return [0];
    }
}
const BUILTIN = { AND: [2,1], OR: [2,1], NOT: [1,1] };

function buildRows(type) {
    const custom = customComponentRegistry[type];
    if (custom) {
        const ic = custom.inputCount, oc = custom.outputCount;
        const inputLabels  = custom.inputPinMap.map(({ nodeId }, i) =>
            getInputName(i, custom.nodes.find(n => n.id === nodeId)?.label || null));
        const outputLabels = custom.outputPinMap.map(({ nodeId }, i) =>
            getOutputName(i, custom.nodes.find(n => n.id === nodeId)?.label || null));
        const rows = [];
        for (let c = 0; c < (1 << ic); c++) {
            const ins  = Array.from({ length: ic }, (_, b) => (c >> (ic-1-b)) & 1);
            const outs = custom.truthTable?.[ins.join("")] ?? new Array(oc).fill(0);
            rows.push({ ins, outs });
        }
        return { inputLabels, outputLabels, rows, inputCount: ic };
    }
    if (BUILTIN[type]) {
        const [ic, oc] = BUILTIN[type];
        const inputLabels  = Array.from({ length: ic }, (_, i) => getInputName(i, null));
        const outputLabels = Array.from({ length: oc }, (_, i) => getOutputName(i, null));
        const rows = [];
        for (let c = 0; c < (1 << ic); c++) {
            const ins  = Array.from({ length: ic }, (_, b) => (c >> (ic-1-b)) & 1);
            rows.push({ ins, outs: evalBuiltin(type, ins) });
        }
        return { inputLabels, outputLabels, rows, inputCount: ic };
    }
    return null;
}

// ── Quine-McCluskey simplification ───────────────────────────────────────────
// Returns simplified SOP expression string for one output column.
// inputLabels: string[] for variable names

function countOnes(n) {
    let c = 0; while (n) { c += n & 1; n >>= 1; } return c;
}

// Merge two implicants: returns new implicant string with '-' for differing bit, or null
function tryMerge(a, b) {
    let diff = 0, pos = -1;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) { diff++; pos = i; }
        if (diff > 1) return null;
    }
    if (diff === 0) return null;
    return a.slice(0, pos) + "-" + a.slice(pos + 1);
}

function qmc(minterms, inputCount) {
    if (minterms.length === 0) return "0";
    const total = 1 << inputCount;
    if (minterms.length === total) return "1";

    // Build initial implicants as binary strings
    let implicants = minterms.map(m => ({
        str: m.toString(2).padStart(inputCount, "0"),
        minterms: new Set([m]),
        used: false,
    }));

    const primes = [];

    // Iteratively merge
    while (true) {
        const groups = {};
        implicants.forEach(imp => {
            const ones = (imp.str.match(/1/g) || []).length;
            if (!groups[ones]) groups[ones] = [];
            groups[ones].push(imp);
        });

        const nextImplicants = [];
        const keys = Object.keys(groups).map(Number).sort((a, b) => a - b);
        const merged = new Set();

        for (let k = 0; k < keys.length - 1; k++) {
            const g1 = groups[keys[k]], g2 = groups[keys[k + 1]];
            for (const a of g1) {
                for (const b of g2) {
                    const m = tryMerge(a.str, b.str);
                    if (m !== null) {
                        const combined = new Set([...a.minterms, ...b.minterms]);
                        // Avoid duplicate
                        const key = m + [...combined].sort().join(",");
                        if (!merged.has(key)) {
                            merged.add(key);
                            nextImplicants.push({ str: m, minterms: combined, used: false });
                        }
                        a.used = true; b.used = true;
                    }
                }
            }
        }

        implicants.forEach(imp => { if (!imp.used) primes.push(imp); });
        if (nextImplicants.length === 0) break;
        implicants = nextImplicants;
    }

    // Essential prime implicant cover (greedy)
    const mintermSet = new Set(minterms);
    const covered = new Set();
    const chosen = [];

    // Sort primes: fewer dashes = more specific, prefer those last (more general first)
    primes.sort((a, b) => (b.str.match(/-/g)||[]).length - (a.str.match(/-/g)||[]).length);

    // Pick primes that cover uncovered minterms
    for (const prime of primes) {
        const uncovered = [...prime.minterms].filter(m => !covered.has(m));
        if (uncovered.length > 0) {
            chosen.push(prime);
            uncovered.forEach(m => covered.add(m));
        }
        if (covered.size === mintermSet.size) break;
    }

    // Render each chosen implicant as a product term
    return chosen.map(imp => {
        const literals = [];
        for (let i = 0; i < imp.str.length; i++) {
            if (imp.str[i] === "1") literals.push(INPUT_NAMES[i] || `I${i}`);
            else if (imp.str[i] === "0") literals.push((INPUT_NAMES[i] || `I${i}`) + "̄"); // combining overline
        }
        if (literals.length === 0) return "1";
        // Use · for AND between literals (implicit, just concatenate)
        return literals.join("");
    }).join(" + ") || "0";
}

// Generate simplified boolean expressions for all outputs
function generateExpressions(rows, inputLabels, outputLabels) {
    const inputCount = inputLabels.length;
    // Too many inputs = skip (exponential cost, and expressions get unwieldy)
    if (inputCount > 6) return null;

    return outputLabels.map((outLabel, oi) => {
        const minterms = rows
            .filter(r => r.outs[oi] === 1)
            .map(r => parseInt(r.ins.join(""), 2));
        const expr = qmc(minterms, inputCount);
        // Replace variable names with actual labels
        let labeled = expr;
        // Replace in reverse order to avoid partial replacements (longer names first)
        const sorted = inputLabels
            .map((lbl, i) => ({ lbl, fallback: INPUT_NAMES[i] || `I${i}` }))
            .sort((a, b) => b.fallback.length - a.fallback.length);
        sorted.forEach(({ lbl, fallback }) => {
            // Replace plain name and negated (with combining char)
            labeled = labeled
                .replaceAll(fallback + "̄", lbl + "̄")
                .replaceAll(fallback, lbl);
        });
        return { label: outLabel, expr: labeled };
    });
}

// Render expression with proper Unicode operators
function renderExpr(expr) {
    // Replace + with ⊕ only if it looks like XOR (all single-literal terms) — heuristic
    // For now, just render + as OR symbol and overline chars as-is
    return expr;
}

// ── Filter ────────────────────────────────────────────────────────────────────
function matchesFilter(ins, pattern) {
    if (!pattern) return true;
    const clean = pattern.replace(/[^01_?x]/gi, "");
    for (let i = 0; i < clean.length && i < ins.length; i++) {
        const ch = clean[i];
        if (ch === "0" && ins[i] !== 0) return false;
        if (ch === "1" && ins[i] !== 1) return false;
    }
    return true;
}

// ── Panel ─────────────────────────────────────────────────────────────────────
function TruthTablePanel({ type, onClose }) {
    const [filter, setFilter] = useState("");
    const [showExpr, setShowExpr] = useState(true);
    const data = useMemo(() => buildRows(type), [type]);
    if (!data) return null;

    const { inputLabels, outputLabels, rows, inputCount } = data;
    const isLarge = rows.length > 16;

    const filtered = useMemo(() =>
        rows.filter(r => matchesFilter(r.ins, filter)),
        [rows, filter]
    );

    const expressions = useMemo(() =>
        generateExpressions(rows, inputLabels, outputLabels),
        [rows, inputLabels, outputLabels]
    );

    const cell = (val) => ({
        padding: "4px 10px",
        textAlign: "center",
        fontSize: "12px",
        fontFamily: "monospace",
        color: val === 1 ? "#a6e3a1" : "#585b70",
        fontWeight: val === 1 ? 700 : 400,
        minWidth: 28,
    });

    const headerCell = {
        padding: "5px 10px",
        textAlign: "center",
        fontSize: "10px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        minWidth: 28,
        position: "sticky",
        top: 0,
        background: "#1e1e2e",
        zIndex: 1,
    };

    return (
        <div style={{
            position: "absolute", top: 14, right: 14, zIndex: 500,
            background: "#1e1e2e", border: "1px solid #313244",
            borderRadius: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            minWidth: 200, maxWidth: 400,
            display: "flex", flexDirection: "column",
            userSelect: "none",
            maxHeight: "calc(100vh - 80px)",
            overflow: "hidden",
        }}>
            {/* ── Header ── */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 12px 8px", borderBottom: "1px solid #313244", flexShrink: 0,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#cdd6f4", letterSpacing: "0.04em" }}>
                        {type}
                    </span>
                    <span style={{ fontSize: 10, color: "#45475a" }}>
                        {inputCount} in · {rows.length} rows
                    </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {/* Toggle expressions */}
                    {expressions && (
                        <button onClick={() => setShowExpr(v => !v)} style={{
                            background: showExpr ? "rgba(137,180,250,0.12)" : "transparent",
                            border: showExpr ? "1px solid rgba(137,180,250,0.3)" : "1px solid transparent",
                            borderRadius: 5, color: showExpr ? "#89b4fa" : "#6c7086",
                            cursor: "pointer", fontSize: 10, padding: "2px 7px",
                            fontWeight: 600, letterSpacing: "0.04em",
                            transition: "all 0.12s",
                        }}
                        title="Toggle Boolean expressions"
                        >f(x)</button>
                    )}
                    <button onClick={onClose} style={{
                        background: "transparent", border: "none", color: "#6c7086",
                        cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "0 2px", borderRadius: 4,
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "#cdd6f4"}
                    onMouseLeave={e => e.currentTarget.style.color = "#6c7086"}
                    >✕</button>
                </div>
            </div>

            {/* ── Boolean Expressions ── */}
            {expressions && showExpr && (
                <div style={{
                    padding: "8px 12px", borderBottom: "1px solid #313244",
                    flexShrink: 0, display: "flex", flexDirection: "column", gap: 5,
                }}>
                    {expressions.map(({ label, expr }) => (
                        <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                            <span style={{
                                fontSize: 11, fontWeight: 700, color: "#a6e3a1",
                                fontFamily: "monospace", flexShrink: 0,
                            }}>{label}</span>
                            <span style={{ fontSize: 10, color: "#45475a", flexShrink: 0 }}>=</span>
                            <span style={{
                                fontSize: 11, fontFamily: "monospace",
                                color: "#cdd6f4", wordBreak: "break-word",
                                lineHeight: 1.6,
                            }}>{renderExpr(expr)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Filter bar (large tables only) ── */}
            {isLarge && (
                <div style={{ padding: "7px 10px", borderBottom: "1px solid #313244", flexShrink: 0 }}>
                    <input
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder={`Filter… e.g. 1_0  (${filtered.length}/${rows.length})`}
                        style={{
                            width: "100%", boxSizing: "border-box",
                            background: "#181825", border: "1px solid #313244",
                            borderRadius: 5, padding: "5px 9px",
                            fontSize: 11, fontFamily: "monospace",
                            color: "#cdd6f4", outline: "none",
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = "#89b4fa"}
                        onBlur={e  => e.currentTarget.style.borderColor = "#313244"}
                    />
                </div>
            )}

            {/* ── Table ── */}
            <div style={{ overflowY: "auto", overflowX: "auto", flex: 1 }}>
                {filtered.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#45475a", fontSize: 12 }}>
                        No rows match
                    </div>
                ) : (
                    <table style={{ borderCollapse: "collapse", width: "100%" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #313244" }}>
                                {inputLabels.map((lbl, i) => (
                                    <th key={`ih-${i}`} style={{ ...headerCell, color: "#89b4fa" }}>{lbl}</th>
                                ))}
                                <th style={{ ...headerCell, color: "#313244", padding: "5px 3px", minWidth: 10 }}>│</th>
                                {outputLabels.map((lbl, i) => (
                                    <th key={`oh-${i}`} style={{ ...headerCell, color: "#a6e3a1" }}>{lbl}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(({ ins, outs }, ri) => (
                                <tr key={ri} style={{
                                    background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.018)",
                                }}>
                                    {ins.map((v, i)  => <td key={`i-${i}`} style={cell(v)}>{v}</td>)}
                                    <td style={{ color: "#313244", textAlign: "center", fontSize: 12, fontFamily: "monospace", padding: "4px 3px" }}>│</td>
                                    {outs.map((v, i) => <td key={`o-${i}`} style={cell(v)}>{v}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Footer ── */}
            <div style={{
                padding: "5px 12px", borderTop: "1px solid #313244",
                display: "flex", gap: 12, fontSize: 10, color: "#45475a", flexShrink: 0,
            }}>
                <span><span style={{ color: "#89b4fa" }}>■</span> in</span>
                <span><span style={{ color: "#a6e3a1" }}>■</span> out</span>
                <span style={{ marginLeft: "auto" }}>X̄ = NOT X</span>
            </div>
        </div>
    );
}

export default TruthTablePanel;