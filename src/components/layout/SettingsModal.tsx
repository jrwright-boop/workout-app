import { useRef } from 'react';
import { Modal } from '../common/Modal';
import { useWorkout } from '../../hooks/useWorkout';
import type { AppState } from '../../types';
import './SettingsModal.css';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { state, dispatch } = useWorkout();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          dispatch({ type: 'LOAD_STATE', payload: parsed });
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

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="settings-content">
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
        </div>
      </div>
    </Modal>
  );
}
