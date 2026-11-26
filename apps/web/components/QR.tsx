// Visual stand-in for a signed QR code. The real ticket QR is generated server-side
// from a signed token (see apps/api/src/lib/tickets.ts).
export function QR({ value, size = 132 }: { value: string; size?: number }) {
  const n = 21;
  let h = 2166136261;
  for (const ch of value) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const bit = (x: number, y: number) => {
    const v = Math.imul(h ^ (x * 73856093) ^ (y * 19349663), 2654435761) >>> 0;
    return (v >> 7) & 1;
  };
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    for (const [ox, oy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      if (inBox(ox, oy)) {
        const dx = x - ox, dy = y - oy;
        return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0;
      }
    }
    return -1;
  };
  const cells: React.ReactElement[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const f = finder(x, y);
      if (f === 1 || (f === -1 && bit(x, y))) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" />);
    }
  return (
    <svg width={size} height={size} viewBox={`-1 -1 ${n + 2} ${n + 2}`} role="img" aria-label="Ticket QR code" className="rounded-lg bg-white">
      <g fill="#1E1B3A">{cells}</g>
    </svg>
  );
}
