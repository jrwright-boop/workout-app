import './DayTab.css';

interface DayTabProps {
  name: string;
  active: boolean;
  /** e.g. "3d ago · 52m" */
  sublabel?: string | null;
  onClick: () => void;
}

export function DayTab({ name, active, sublabel, onClick }: DayTabProps) {
  return (
    <button
      className={`day-tab ${active ? 'day-tab--active' : ''} ${sublabel ? 'day-tab--with-sub' : ''}`}
      onClick={onClick}
      aria-label={sublabel ? `${name}, last ${sublabel}` : name}
    >
      <span className="day-tab-name">{name}</span>
      {sublabel && <span className="day-tab-sub">{sublabel}</span>}
    </button>
  );
}
