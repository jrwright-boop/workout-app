import './DayTab.css';

interface DayTabProps {
  name: string;
  active: boolean;
  onClick: () => void;
}

export function DayTab({ name, active, onClick }: DayTabProps) {
  return (
    <button
      className={`day-tab ${active ? 'day-tab--active' : ''}`}
      onClick={onClick}
    >
      {name}
    </button>
  );
}
