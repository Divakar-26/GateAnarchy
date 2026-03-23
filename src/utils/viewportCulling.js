export function isNodeInViewport(node, camera, zoom, width, height) {
    const nodeW = 80, nodeH = 40;
    const x = (node.x * zoom) + camera.x;
    const y = (node.y * zoom) + camera.y;
    const w = nodeW * zoom;
    const h = nodeH * zoom;
    
    return !(x + w < 0 || x > width || y + h < 0 || y > height);
}

export function isWireInViewport(p1, p2, camera, zoom, width, height) {
    const x1 = (p1.x * zoom) + camera.x;
    const y1 = (p1.y * zoom) + camera.y;
    const x2 = (p2.x * zoom) + camera.x;
    const y2 = (p2.y * zoom) + camera.y;
     
    const minX = Math.min(x1, x2) - 50;
    const maxX = Math.max(x1, x2) + 50;
    const minY = Math.min(y1, y2) - 50;
    const maxY = Math.max(y1, y2) + 50;
    
    return !(maxX < 0 || minX > width || maxY < 0 || minY > height);
}

export function getVisibleNodes(nodes, camera, zoom, width, height) {
    return nodes.filter(n => isNodeInViewport(n, camera, zoom, width, height));
}

export function getVisibleWires(wires, nodeMap, camera, zoom, width, height, pinPos) {
    return wires.filter(w => {
        const n1 = nodeMap.get(w.from.nodeId);
        const n2 = nodeMap.get(w.to.nodeId);
        if (!n1 || !n2) return false;
        const p1 = pinPos(n1, w.from, true);
        const p2 = pinPos(n2, w.to, false);
        return isWireInViewport(p1, p2, camera, zoom, width, height);
    });
}
