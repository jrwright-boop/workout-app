import { useRef, useState } from 'react';
import { Modal } from '../common/Modal';
import { NumericInput } from '../common/NumericInput';
import { useWorkout } from '../../hooks/useWorkout';
import { getLastBackupDate, recordBackup, migrate, validateAppState } from '../../storage/localStorage';
import { formatDate, formatElapsed } from '../../utils/date';
import { encodeProgramLink } from '../../utils/programLink';
import './SettingsModal.css';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const REST_STEP = 15;
const REST_MIN = 15;
const REST_MAX = 600;

function describeLastBackup(iso: string | null): string {
  if (!iso) return 'Never';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  const when = formatDate(iso);
  if (days <= 0) return `Today (${when})`;
  if (days === 1) return `Yesterday (${when})`;
  return `${days} days ago (${when})`;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { state, dispatch } = useWorkout();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(() => getLastBackupDate());
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const handleExport = () => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `workout-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    recordBackup();
    setLastBackup(getLastBackupDate());
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        // Run migrations so backups from older app versions import cleanly,
        // then check the shape so a bad file can't brick the app on next load.
        const migrated = validateAppState(migrate(JSON.parse(reader.result as string)));
        if (!migrated) {
          alert('Invalid backup file format.');
          return;
        }
        if (confirm('This will replace all current data. Continue?')) {
          dispatch({ type: 'LOAD_STATE', payload: migrated });
          onClose();
        }
      } catch {
        alert('Could not read backup file.');
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  const adjustRest = (delta: number) => {
    const next = Math.min(REST_MAX, Math.max(REST_MIN, state.restSeconds + delta));
    dispatch({ type: 'SET_REST_SECONDS', payload: { seconds: next } });
  };

  const otherUnit = state.unit === 'lbs' ? 'kg' : 'lbs';

  const handleSaveProgram = () => {
    if (state.dayOrder.length === 0) return;
    const name = prompt('Program name:', state.dayOrder.map(id => state.days[id].name).join(' / '));
    if (name && name.trim()) dispatch({ type: 'SAVE_PROGRAM', payload: { name: name.trim() } });
  };

  const handleLoadProgram = (programId: string, name: string) => {
    if (state.activeSession) {
      alert('Finish or discard the current workout before switching programs.');
      return;
    }
    if (confirm(`Switch to "${name}"? Your current days will be replaced (save them as a program first if you want to come back).`)) {
      dispatch({ type: 'LOAD_PROGRAM', payload: { programId } });
      onClose();
    }
  };

  const handleShareProgram = async (programId: string) => {
    const program = state.programs.find(p => p.id === programId);
    if (!program) return;
    const link = encodeProgramLink(program);
    try {
      if (navigator.share) {
        await navigator.share({ title: `${program.name} (Workout program)`, url: link });
        setShareStatus('Shared');
      } else {
        await navigator.clipboard.writeText(link);
        setShareStatus('Link copied');
      }
    } catch {
      setShareStatus('Could not share');
    }
    setTimeout(() => setShareStatus(null), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="settings-content">
        <div className="settings-section">
          <h3 className="settings-section-title">Rest Timer</h3>
          <div className="settings-row">
            <span className="settings-row-label">Default rest</span>
            <div className="stepper">
              <button className="stepper-btn" aria-label="Less rest" onClick={() => adjustRest(-REST_STEP)}>-</button>
              <span className="stepper-value settings-rest-value">{formatElapsed(state.restSeconds)}</span>
              <button className="stepper-btn" aria-label="More rest" onClick={() => adjustRest(REST_STEP)}>+</button>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Units &amp; Bar</h3>
          <div className="settings-row">
            <span className="settings-row-label">Weights in <strong>{state.unit}</strong></span>
            <button
              className="settings-small-btn"
              onClick={() => dispatch({ type: 'SET_UNIT', payload: { unit: otherUnit, convert: false } })}
              title="Change the label without converting any numbers"
            >
              Relabel as {otherUnit}
            </button>
          </div>
          <p className="settings-hint">The header toggle converts every recorded weight. Use "relabel" only if the numbers were already entered in {otherUnit}.</p>
          <div className="settings-row">
            <span className="settings-row-label">Bar weight ({state.unit})</span>
            <NumericInput
              value={state.barWeight[state.unit]}
              onChange={v => { if (v != null && v >= 0) dispatch({ type: 'SET_BAR_WEIGHT', payload: { unit: state.unit, weight: v } }); }}
              placeholder={state.unit}
            />
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Programs</h3>
          <p className="settings-hint">A program is a saved copy of your days. Switch between splits or share one as a link.</p>
          <button className="btn btn--full settings-import-btn" onClick={handleSaveProgram} disabled={state.dayOrder.length === 0}>
            Save current days as a program
          </button>
          {state.programs.length > 0 && (
            <div className="program-list">
              {state.programs.map(p => (
                <div key={p.id} className="program-item">
                  <div className="program-info">
                    <span className="program-name">{p.name}</span>
                    <span className="program-meta">
                      {p.dayOrder.length} day{p.dayOrder.length === 1 ? '' : 's'} · {p.dayOrder.map(id => p.days[id].name).join(', ')}
                    </span>
                  </div>
                  <div className="program-actions">
                    <button className="settings-small-btn" onClick={() => handleLoadProgram(p.id, p.name)}>Use</button>
                    <button className="settings-small-btn" onClick={() => handleShareProgram(p.id)}>Share</button>
                    <button
                      className="settings-small-btn settings-small-btn--danger"
                      aria-label={`Delete program ${p.name}`}
                      onClick={() => { if (confirm(`Delete program "${p.name}"?`)) dispatch({ type: 'DELETE_PROGRAM', payload: { programId: p.id } }); }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {shareStatus && <p className="settings-hint" role="status">{shareStatus}</p>}
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Data</h3>
          <button className="btn btn--accent btn--full" onClick={handleExport}>
            Export Backup (JSON)
          </button>
          <button
            className="btn btn--full settings-import-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Import Backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <p className="settings-backup-status">
            Last backup: {describeLastBackup(lastBackup)}
          </p>
        </div>
      </div>
    </Modal>
  );
}
