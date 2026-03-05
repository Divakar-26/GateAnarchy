import '../styles/Pin.css'

function Pin({ type, index, total, nodeId, onPinClick }) {

    const side = type === "input" ? "input" : "output";

    const spacing = 100 / (total + 1);
    const top = spacing * (index + 1);

    const handleClick = (e) => {
        e.stopPropagation();
        onPinClick({
            nodeId,
            type,
            index,
            total
        });
    };

    return (
        <div
            className={`pin pin-${side}`}
            style={{ top: `${top}%` }}
            onMouseDown={handleClick}
        />
    );
}

export default Pin;