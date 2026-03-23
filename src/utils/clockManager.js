const timers   = new Map();
const params   = new Map();
const phases   = new Map();

let _onChange = null;
 
export function setClockChangeHandler(fn) {
    _onChange = fn;
}


export function syncClocks(nodes) {
    const clockNodes = nodes.filter(n => n.type === "CLOCK");
    const liveIds    = new Set(clockNodes.map(n => n.id)); 

    for (const id of [...timers.keys()]) {
        if (!liveIds.has(id)) {
            clearTimeout(timers.get(id));
            timers.delete(id);
            params.delete(id);
            phases.delete(id);
        }
    }

    for (const node of clockNodes) {
        const hz   = clamp(node.hz   ?? 1,   0.1, 100);
        const duty = clamp(node.duty ?? 0.5, 0.01, 0.99);

        const prev = params.get(node.id);
        const paramsChanged = !prev || prev.hz !== hz || prev.duty !== duty;

        if (!timers.has(node.id) || paramsChanged) {
            if (timers.has(node.id)) {
                clearTimeout(timers.get(node.id));
                timers.delete(node.id);
            }
            params.set(node.id, { hz, duty });

            scheduleTick(node.id, hz, duty, phases.get(node.id) ?? 0);
        }
    }
}

function scheduleTick(nodeId, hz, duty, currentPhase) {
    const period  = 1000 / hz;
    
    
    const delay   = currentPhase === 1
        ? period * duty
        : period * (1 - duty);

    const tid = setTimeout(() => {
        const nextPhase = currentPhase === 0 ? 1 : 0;
        phases.set(nodeId, nextPhase);
        if (_onChange) _onChange(nodeId, nextPhase);

        const p = params.get(nodeId); 
        if (p) scheduleTick(nodeId, p.hz, p.duty, nextPhase);
    }, delay);

    timers.set(nodeId, tid);
}

export function stopAllClocks() {
    for (const tid of timers.values()) clearTimeout(tid);
    timers.clear();
    params.clear();
    phases.clear();
}


export function getClockPhase(nodeId) {
    return phases.get(nodeId) ?? 0;
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}