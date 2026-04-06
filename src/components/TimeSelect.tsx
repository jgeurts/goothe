import { formatTime } from "@/lib/defaults";

interface TimeSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export default function TimeSelect({ label, value, options, onChange }: TimeSelectProps) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-text-secondary">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface border border-border rounded-lg px-3 py-2 text-sm font-medium min-w-[120px] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-bvb-teal/40"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {formatTime(opt)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Generate 30-min time slots between start and end (inclusive) */
export function generateTimeSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  if (startH === undefined || startM === undefined) return slots;
  if (endH === undefined || endM === undefined) return slots;

  let h = startH;
  let m = startM;

  while (h < endH || (h === endH && m <= endM)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m >= 60) {
      m = 0;
      h += 1;
    }
  }

  return slots;
}
