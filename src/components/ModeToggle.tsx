export type BookingMode = 'boarding' | 'daycare';

interface ModeToggleProps {
  mode: BookingMode;
  onChange: (mode: BookingMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex bg-surface-alt rounded-lg p-1 gap-1">
      <ToggleButton
        active={mode === 'boarding'}
        onClick={() => onChange('boarding')}
      >
        Boarding
      </ToggleButton>
      <ToggleButton
        active={mode === 'daycare'}
        onClick={() => onChange('daycare')}
      >
        Daycare
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 px-4 rounded-md text-sm font-semibold transition-all ${
        active
          ? 'bg-bvb-teal text-white shadow-sm'
          : 'text-text-secondary hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}
