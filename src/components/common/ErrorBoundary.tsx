import { Component, type ReactNode } from 'react';
import { CorruptStateError, clearState, getRawState } from '../../storage/localStorage';
import './ErrorBoundary.css';

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Last line of defence. Without this, a corrupt localStorage blob or an
 * unexpected render error leaves a blank screen with no way back short of
 * the browser's dev tools — which, on a phone, means the data is stuck.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  handleDownload = () => {
    const raw = getRawState() ?? '';
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-raw-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  handleReset = () => {
    if (confirm('Erase all saved workout data and restart the app? Download your data first if you want to keep it.')) {
      clearState();
      window.location.reload();
    }
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const corrupt = error instanceof CorruptStateError;
    return (
      <div className="error-screen">
        <h1 className="error-title">{corrupt ? 'Saved data could not be loaded' : 'Something went wrong'}</h1>
        <p className="error-message">
          {corrupt
            ? 'The workout data stored on this device is damaged or from an incompatible version.'
            : 'The app hit an unexpected error. Reloading usually fixes it.'}
        </p>
        <pre className="error-detail">{error.message}</pre>
        <div className="error-actions">
          <button className="btn btn--accent btn--full" onClick={() => window.location.reload()}>
            Reload
          </button>
          <button className="btn btn--outline btn--full" onClick={this.handleDownload}>
            Download raw data
          </button>
          <button className="btn btn--danger btn--full" onClick={this.handleReset}>
            Erase data and restart
          </button>
        </div>
      </div>
    );
  }
}
