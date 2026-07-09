import { useRef, useState } from 'react';
import { Modal } from '../common/Modal';
import { useWorkout } from '../../hooks/useWorkout';
import { getLastBackupDate, recordBackup, migrate } from '../../storage/localStorage';
import { formatDate, formatElapsed } from '../../utils/date';
import type { AppState } from '../../types';
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
        const parsed = JSON.parse(reader.result as string) as AppState;
        if (!parsed.schemaVersion || !parsed.days || !Array.isArray(parsed.history)) {
          alert('Invalid backup file format.');
          return;
        }
        if (confirm('This will replace all current data. Continue?')) {
          // Run migrations so backups from older app versions import cleanly.
          dispatch({ type: 'LOAD_STATE', payload: migrate(parsed) });
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

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="settings-content">
        <div className="settings-section">
          <h3 className="settings-section-title">Rest Timer</h3>
          <div className="settings-row">
            <span className="settings-row-label">Default rest</span>
            <div className="stepper">
              <button className="stepper-btn" onClick={() => adjustRest(-REST_STEP)}>-</button>
              <span className="stepper-value settings-rest-value">{formatElapsed(state.restSeconds)}</span>
              <button className="stepper-btn" onClick={() => adjustRest(REST_STEP)}>+</button>
            </div>
          </div>
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
