import { useState } from 'react';

import type { OrderSummary } from '@/api/types';
import { parseDate } from '@/lib/dates';

interface UpcomingBookingsProps {
  orders: OrderSummary[];
}

export default function UpcomingBookings({ orders }: UpcomingBookingsProps) {
  const [expanded, setExpanded] = useState(false);

  const upcoming = orders.filter(
    o => o.orderStatus === 'CONFIRMED' || o.orderStatus === 'PENDING'
  );

  if (upcoming.length === 0) return null;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-text-secondary hover:bg-surface-alt transition-colors"
      >
        <span>Upcoming Bookings ({upcoming.length})</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {upcoming.map(order => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderRow({ order }: { order: OrderSummary }) {
  const invoice = order.invoices[0];
  const period = invoice?.period[0];
  const primaryItem = invoice?.items.find(i => i.offerType === 'PRIMARY');

  const start = period?.startDate
    ? parseDate(period.startDate)
    : null;
  const end = period?.endDate
    ? parseDate(period.endDate)
    : null;

  const dateDisplay =
    start && end
      ? `${formatShortDate(start)} – ${formatShortDate(end)}`
      : 'Unknown dates';

  return (
    <div className="px-4 py-3 flex justify-between items-center text-sm">
      <div>
        <p className="font-medium">{primaryItem?.displayName ?? 'Booking'}</p>
        <p className="text-text-secondary text-xs">{dateDisplay}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold">${order.total.toFixed(2)}</p>
        <p
          className={`text-xs ${
            order.orderStatus === 'CONFIRMED'
              ? 'text-success'
              : 'text-bvb-gold'
          }`}
        >
          {order.orderStatus}
        </p>
      </div>
    </div>
  );
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
