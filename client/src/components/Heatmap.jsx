const ROWS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  [' '],
];

export default function Heatmap({ errors }) {
  const map = errors || {};
  const max = Math.max(1, ...Object.values(map));
  const total = Object.values(map).reduce((a, b) => a + b, 0);

  return (
    <div className="heatmap">
      <div className="heatmap-head">
        <h4>error heatmap</h4>
        <span>{total} mistyped character{total === 1 ? '' : 's'}</span>
      </div>
      <div className="heatmap-board">
        {ROWS.map((row, ri) => (
          <div className={`heatmap-row row-${ri}`} key={ri}>
            {row.map((key) => {
              const count = map[key] || 0;
              const ratio = count / max;
              const label = key === ' ' ? 'space' : key;
              const style = count
                ? { background: `color-mix(in srgb, var(--yellow) ${Math.round(100 - ratio * 70)}%, var(--error))` }
                : undefined;
              return (
                <div key={key} className={`heat-key${count ? ' hot' : ''}`} style={style} title={`${label}: ${count}`}>
                  <span>{label}</span>
                  {count > 0 && <b>{count}</b>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
