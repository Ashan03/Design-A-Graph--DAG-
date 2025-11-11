interface ConnectionWireProps {
  start: { x: number; y: number };
  end: { x: number; y: number };
  isTemporary?: boolean;
}

export function ConnectionWire({ start, end, isTemporary = false }: ConnectionWireProps) {
  const dx = end.x - start.x;
  const controlPointOffset = Math.abs(dx) * 0.5;

  const path = `M ${start.x} ${start.y} C ${start.x + controlPointOffset} ${start.y}, ${
    end.x - controlPointOffset
  } ${end.y}, ${end.x} ${end.y}`;

  return (
    <g>
      {/* Shadow/outline for connection */}
      <path
        d={path}
        fill="none"
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="3"
        strokeDasharray={isTemporary ? '5,5' : '0'}
      />
      {/* Main connection line */}
      <path
        d={path}
        fill="none"
        stroke={isTemporary ? '#71717a' : '#3f3f46'}
        strokeWidth="2"
        strokeDasharray={isTemporary ? '5,5' : '0'}
        opacity={isTemporary ? 0.5 : 0.9}
      />
    </g>
  );
}