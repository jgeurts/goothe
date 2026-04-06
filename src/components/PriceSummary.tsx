import type { PriceEstimate } from '@/lib/pricing';

interface PriceSummaryProps {
  estimate: PriceEstimate | null;
  mode: 'boarding' | 'daycare';
  daycareRate?: number;
}

export default function PriceSummary({
  estimate,
  mode,
  daycareRate,
}: PriceSummaryProps) {
  if (!estimate && mode === 'daycare' && daycareRate) {
    // Simple daycare display
    const tax = Math.round(daycareRate * 0.079 * 100) / 100;
    const total = Math.round((daycareRate + tax) * 100) / 100;
    return (
      <div className="bg-surface-alt rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Price Estimate
        </h3>
        <div className="space-y-1.5">
          <Row label="Daycare" value={`$${daycareRate.toFixed(2)}`} />
          <div className="border-t border-border my-2" />
          <Row label="Tax (7.9%)" value={`$${tax.toFixed(2)}`} muted />
          <Row label="Total" value={`$${total.toFixed(2)}`} bold />
        </div>
      </div>
    );
  }

  if (!estimate) return null;

  return (
    <div className="bg-surface-alt rounded-xl p-4 space-y-2">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
        Price Estimate
      </h3>
      <div className="space-y-1.5">
        <Row
          label={`Boarding: ${estimate.nights} night${estimate.nights !== 1 ? 's' : ''} × $${estimate.boardingRate.toFixed(2)}`}
          value={`$${estimate.boardingSubtotal.toFixed(2)}`}
        />
        {estimate.pmPickupMonFri !== null && (
          <Row
            label="PM Pickup Mon-Fri"
            value={`$${estimate.pmPickupMonFri.toFixed(2)}`}
          />
        )}
        {estimate.pmPickupSatSun !== null && (
          <Row
            label="PM Pickup Sat/Sun"
            value={`$${estimate.pmPickupSatSun.toFixed(2)}`}
          />
        )}
        <div className="border-t border-border my-2" />
        <Row
          label="Subtotal"
          value={`$${estimate.subtotal.toFixed(2)}`}
        />
        <Row
          label="Tax (7.9%)"
          value={`$${estimate.tax.toFixed(2)}`}
          muted
        />
        <Row
          label="Estimated Total"
          value={`$${estimate.total.toFixed(2)}`}
          bold
        />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-semibold text-base' : ''} ${muted ? 'text-text-secondary' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
