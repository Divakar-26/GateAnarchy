import { useState, useEffect, useMemo, useCallback } from 'react';


export function useLEDDecimalConverter(nodes, region) {
    const [bitAssignments, setBitAssignments] = useState({});
    const [assignmentOrder, setAssignmentOrder] = useState([]);
    const [hoveredNodeId, setHoveredNodeId] = useState(null);

    
    const regionId = region?.id ?? null;
    useEffect(() => {
        setBitAssignments({});
        setAssignmentOrder([]);
        setHoveredNodeId(null);
    }, [regionId]);

    const selectedNodeObjects = useMemo(
        () => (region?.nodeIds ? nodes.filter(n => region.nodeIds.includes(n.id)) : []),
        [nodes, region]
    );

    
    
    const ledValueSig = useMemo(
        () => assignmentOrder.map(id => {
            const node = nodes.find(n => n.id === id);
            return node?.value ?? 0;
        }).join(','),
        [assignmentOrder, nodes]
    );

    const displayValue = useMemo(() => {
        if (assignmentOrder.length === 0) return 0;
        let value = 0;
        assignmentOrder.forEach((nodeId, bitPos) => {
            const node = nodes.find(n => n.id === nodeId);
            
            if (node && node.value === 1) {
                value += 1 << bitPos;
            }
        });
        return value;
    }, [ledValueSig, assignmentOrder, nodes]);

    
    const handleLEDClick = useCallback((nodeId) => {
        setBitAssignments(prevAssign => {
            setAssignmentOrder(prevOrder => {
                if (prevAssign[nodeId] !== undefined) {
                    
                    const newOrder = prevOrder.filter(id => id !== nodeId);
                    const newAssign = {};
                    newOrder.forEach((id, idx) => { newAssign[id] = idx; });
                    
                    
                    setTimeout(() => setBitAssignments(newAssign), 0);
                    return newOrder;
                } else {
                    const bitPos = prevOrder.length;
                    setTimeout(() => setBitAssignments(p => ({ ...p, [nodeId]: bitPos })), 0);
                    return [...prevOrder, nodeId];
                }
            });
            return prevAssign; 
        });
    }, []);

    
    const handleLEDClickClean = useCallback((nodeId) => {
        if (bitAssignments[nodeId] !== undefined) {
            
            const newOrder = assignmentOrder.filter(id => id !== nodeId);
            const newAssign = {};
            newOrder.forEach((id, idx) => { newAssign[id] = idx; });
            setAssignmentOrder(newOrder);
            setBitAssignments(newAssign);
        } else {
            
            const bitPos = assignmentOrder.length;
            setAssignmentOrder(prev => [...prev, nodeId]);
            setBitAssignments(prev => ({ ...prev, [nodeId]: bitPos }));
        }
    }, [bitAssignments, assignmentOrder]);

    
    const { displayX, displayY } = useMemo(() => {
        if (!selectedNodeObjects.length) return { displayX: 0, displayY: 0 };
        const xs = selectedNodeObjects.map(n => n.x);
        const ys = selectedNodeObjects.map(n => n.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs) + 28; 
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys) + 28; 
        const boundsW = maxX - minX;
        const boundsH = maxY - minY;
        const isVertical = boundsH >= boundsW;
        const GAP = 32;
        return {
            displayX: isVertical ? maxX + GAP : minX + boundsW / 2 - 45,
            displayY: isVertical ? minY + boundsH / 2 - 35 : minY - 90,
        };
    }, [selectedNodeObjects]);

    return {
        bitAssignments,
        assignmentOrder,
        displayValue,
        displayX,
        displayY,
        selectedNodeObjects,
        handleLEDClick: handleLEDClickClean,
        hoveredNodeId,
        setHoveredNodeId,
    };
}


export function LEDDecimalConverterDisplay({
    displayValue,
    displayX,
    displayY,
    assignmentOrder,
    onTogglePanel,
}) {
    const n = assignmentOrder.length;
    const maxVal = n > 0 ? (1 << n) - 1 : '—';
    const binary = n > 0 ? displayValue.toString(2).padStart(n, '0') : '';

    return (
        <div
            onClick={onTogglePanel}
            title="Click to open/close bit assignment panel"
            style={{
                position: 'absolute',
                left: displayX,
                top: displayY,
                background: '#0a0a12',
                border: '2px solid #a6e3a1',
                borderRadius: 8,
                padding: '10px 16px',
                minWidth: 80,
                textAlign: 'center',
                userSelect: 'none',
                pointerEvents: 'auto',
                cursor: 'pointer',
                boxSizing: 'border-box',
            }}
        >
            {}
            <div style={{
                fontFamily: 'monospace',
                fontSize: n > 0 ? 36 : 28,
                fontWeight: 900,
                color: '#a6e3a1',
                lineHeight: 1,
            }}>
                {displayValue}
            </div>

            {}
            {n > 0 && (
                <div style={{
                    fontFamily: 'monospace',
                    fontSize: 9,
                    color: '#556',
                    marginTop: 5,
                    letterSpacing: '2px',
                }}>
                    {binary}
                </div>
            )}

            {}
            {n > 0 && (
                <div style={{ fontSize: 9, color: '#444', marginTop: 3 }}>
                    {n}b · max {maxVal}
                </div>
            )}

            {}
            {n === 0 && (
                <div style={{ fontSize: 9, color: '#556', marginTop: 6 }}>
                    open panel to assign bits
                </div>
            )}
        </div>
    );
}


export function LEDDecimalConverterPanel({
    onExit,
    bitAssignments,
    assignmentOrder,
    selectedNodeObjects,
    handleLEDClick,
    panelOpen,
    onHoverNode,   
}) {
    if (!panelOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 60,
            right: 20,
            background: 'var(--primary-bg)',
            border: '3px solid #000',
            borderRadius: 0,
            padding: '14px 16px',
            boxShadow: '6px 6px 0 rgba(0,0,0,0.4)',
            zIndex: 500,
            minWidth: 240,
            maxWidth: 320,
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
            pointerEvents: 'auto',
            fontFamily: "'Courier New', monospace",
        }}>
            {}
            <div style={{
                fontSize: 11,
                fontWeight: 900,
                color: 'var(--primary-light)',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
            }}>
                LED → Decimal
            </div>

            <div style={{
                fontSize: 10,
                color: 'var(--primary-fg)',
                marginBottom: 12,
                lineHeight: 1.6,
                opacity: 0.7,
            }}>
                Click an LED to assign its bit position.<br/>
                Click again to un-assign (others renumber).
            </div>

            {}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                {selectedNodeObjects.map((node) => {
                    const assigned = bitAssignments[node.id] !== undefined;
                    const bitPos   = bitAssignments[node.id];
                    return (
                        <div
                            key={node.id}
                            onClick={() => handleLEDClick(node.id)}
                            onMouseEnter={() => onHoverNode?.(node.id)}
                            onMouseLeave={() => onHoverNode?.(null)}
                            style={{
                                padding: '7px 10px',
                                background: assigned ? 'var(--primary-light)' : 'var(--secondary-bg)',
                                border: '2px solid #000',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: 11,
                                fontWeight: 700,
                                color: assigned ? '#000' : 'var(--primary-fg)',
                                userSelect: 'none',
                                transition: 'background 0.1s, transform 0.1s',
                            }}
                            onMouseDown={e => {
                                e.currentTarget.style.transform = 'translate(2px,2px)';
                            }}
                            onMouseUp={e => {
                                e.currentTarget.style.transform = 'none';
                            }}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {node.label ? node.label : `LED @ (${node.x}, ${node.y})`}
                            </span>
                            {assigned ? (
                                <span style={{
                                    background: '#000',
                                    color: 'var(--primary-light)',
                                    padding: '2px 7px',
                                    fontSize: 10,
                                    fontWeight: 900,
                                    flexShrink: 0,
                                    marginLeft: 8,
                                }}>
                                    bit {bitPos}
                                </span>
                            ) : (
                                <span style={{
                                    fontSize: 10,
                                    color: '#666',
                                    flexShrink: 0,
                                    marginLeft: 8,
                                }}>
                                    unassigned
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {}
            {assignmentOrder.length > 0 && (
                <div style={{
                    fontSize: 10,
                    color: 'var(--primary-fg)',
                    opacity: 0.5,
                    marginBottom: 10,
                    borderTop: '1px solid #333',
                    paddingTop: 8,
                }}>
                    {assignmentOrder.length} bit{assignmentOrder.length !== 1 ? 's' : ''} assigned
                    · max value {(1 << assignmentOrder.length) - 1}
                </div>
            )}

            {}
            <button
                onClick={onExit}
                style={{
                    width: '100%',
                    padding: '8px 0',
                    background: 'var(--secondary-fg)',
                    border: '2px solid #000',
                    color: '#000',
                    fontWeight: 900,
                    fontSize: 11,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    boxShadow: '3px 3px 0 rgba(0,0,0,0.2)',
                    transition: 'all 0.1s',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--primary-dark)';
                    e.currentTarget.style.transform = 'translate(-2px,-2px)';
                    e.currentTarget.style.boxShadow = '5px 5px 0 rgba(0,0,0,0.3)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--secondary-fg)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '3px 3px 0 rgba(0,0,0,0.2)';
                }}
            >
                Exit
            </button>
        </div>
    );
}


export function LEDDecimalConverterDisplayWrapper({
    hookData,
    onTogglePanel,
}) {
    if (!hookData) return null;

    return (
        <LEDDecimalConverterDisplay
            displayValue={hookData.displayValue}
            displayX={hookData.displayX}
            displayY={hookData.displayY}
            assignmentOrder={hookData.assignmentOrder}
            onTogglePanel={onTogglePanel}
        />
    );
}


export function LEDDecimalConverterFullWrapper({
    nodes,
    region,
    ledDecimalPanelOpen,
    onTogglePanelOpen,
    onExit,
    onHoverLED,
    cameraLayerRef,
}) {
    if (!region) return null;

    const hookData = useLEDDecimalConverter(nodes, region);

    return (
        <>
            {}
            {cameraLayerRef?.current && (
                <LEDDecimalConverterDisplay
                    displayValue={hookData.displayValue}
                    displayX={hookData.displayX}
                    displayY={hookData.displayY}
                    assignmentOrder={hookData.assignmentOrder}
                    onTogglePanel={onTogglePanelOpen}
                />
            )}

            {}
            {ledDecimalPanelOpen && (
                <LEDDecimalConverterPanel
                    onExit={onExit}
                    bitAssignments={hookData.bitAssignments}
                    assignmentOrder={hookData.assignmentOrder}
                    selectedNodeObjects={hookData.selectedNodeObjects}
                    handleLEDClick={hookData.handleLEDClick}
                    panelOpen={ledDecimalPanelOpen}
                    onHoverNode={(nodeId) => {
                        onHoverLED(nodeId);
                        hookData.setHoveredNodeId(nodeId);
                    }}
                />
            )}
        </>
    );
}


export function LEDDecimalConverterPanelWrapper({
    hookData,
    onExit,
    onHoverLED,
}) {
    if (!hookData) return null;

    return (
        <LEDDecimalConverterPanel
            onExit={onExit}
            bitAssignments={hookData.bitAssignments}
            assignmentOrder={hookData.assignmentOrder}
            selectedNodeObjects={hookData.selectedNodeObjects}
            handleLEDClick={hookData.handleLEDClick}
            panelOpen={true}
            onHoverNode={(nodeId) => {
                onHoverLED(nodeId);
                hookData.setHoveredNodeId(nodeId);
            }}
        />
    );
}