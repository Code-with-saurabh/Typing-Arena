import Chart from './Chart.jsx';
import Heatmap from './Heatmap.jsx';
import ScoreSubmit from './ScoreSubmit.jsx';
import { errorMapFor } from '../utils/stats.js';

function Stat({ label, value, big = false }) {
  return (
    <div className={`result-stat${big ? ' big' : ''}`}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export default function ResultsPanel({ results, modeKey, text = '', typed = '', onRetry, onConfig }) {
  if (!results) return null;
  return (
    <div className="results">
      <div className="results-hero">
        <div className="result-wpm">
          <b>{Math.round(results.wpm)}</b>
          <span>wpm</span>
        </div>
        <div className="results-stats">
          <Stat label="accuracy" value={`${results.accuracy.toFixed(1)}%`} />
          <Stat label="raw" value={Math.round(results.raw)} />
          <Stat label="consistency" value={`${results.consistency}%`} />
          <Stat label="characters" value={`${results.correct}/${results.incorrect}`} />
          <Stat label="time" value={`${(results.durationMs / 1000).toFixed(1)}s`} />
        </div>
      </div>

      <div className="results-grid">
        <div className="card">
          <h3>performance</h3>
          <Chart samples={results.samples} />
        </div>
        <div className="card">
          <h3>where you slipped</h3>
          <Heatmap errors={errorMapFor(text, typed)} />
        </div>
      </div>

      <div className="card results-actions">
        <ScoreSubmit results={results} modeKey={modeKey} />
        <div className="btn-row">
          <button type="button" className="btn btn-yellow" onClick={onRetry}>next test</button>
          <button type="button" className="btn btn-ghost" onClick={onConfig}>change settings</button>
        </div>
      </div>
    </div>
  );
}
