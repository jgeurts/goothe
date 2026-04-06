import { useState } from "react";

import type { OrderSummary } from "@/api/types";
import { nightCount, parseDate } from "@/lib/dates";

interface UpcomingBookingsProps {
  orders: OrderSummary[];
}

const ACTIVE_STATUSES = new Set(["CONFIRMED", "PENDING", "CHECK_IN"]);

export default function UpcomingBookings({ orders }: UpcomingBookingsProps) {
  const upcoming = orders.filter((o) => ACTIVE_STATUSES.has(o.orderStatus));
  const [expanded, setExpanded] = useState(upcoming.length > 0);

  if (upcoming.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden bg-surface-alt">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-text hover:bg-border/30 transition-colors"
      >
        <span>
          Upcoming Bookings{" "}
          <span className="text-text-secondary font-normal">({upcoming.length})</span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          className={`text-text-secondary transition-transform ${expanded ? "rotate-180" : ""}`}
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
        <div className="divide-y divide-border/50">
          {upcoming.map((order) => (
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
  const primaryItem = invoice?.items.find((i) => i.offerType === "PRIMARY");
  const addonItems = invoice?.items.filter((i) => i.offerType !== "PRIMARY") ?? [];

  const start = period?.startDate ? parseDate(period.startDate) : null;
  const end = period?.endDate ? parseDate(period.endDate) : null;
  const nights = start && end ? nightCount(start, end) : 0;

  const dateDisplay =
    start && end ? `${formatFullDate(start)} – ${formatFullDate(end)}` : "Unknown dates";

  const detailUrl = `https://booking.goose.pet/bay-view-bark/booking/receipt?orderId=${order.id}`;

  return (
    <a
      href={detailUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block px-4 py-3 text-sm hover:bg-border/20 transition-colors"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-text truncate">
            {primaryItem?.displayName ?? "Booking"}
          </p>
          <p className="text-text-secondary mt-0.5">{dateDisplay}</p>
          {nights > 0 && (
            <p className="text-text-secondary">
              {nights} night{nights !== 1 ? "s" : ""}
              {primaryItem ? ` @ $${primaryItem.rate.toFixed(2)}/night` : ""}
            </p>
          )}
          {addonItems.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {addonItems.map((item) => (
                <p key={item.name} className="text-xs text-text-secondary">
                  + {item.displayName}{" "}
                  <span className="text-text">${item.subtotal.toFixed(2)}</span>
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-base">${order.total.toFixed(2)}</p>
          <StatusBadge status={order.orderStatus} />
        </div>
      </div>
    </a>
  );
}

function StatusBadge({ status }: { status: string }) {
  let className = "inline-block text-xs font-medium px-2 py-0.5 rounded-full ";
  if (status === "CONFIRMED") {
    className += "bg-success/10 text-success";
  } else if (status === "PENDING") {
    className += "bg-bvb-gold/15 text-bvb-gold-d";
  } else if (status === "CHECK_IN") {
    className += "bg-bvb-teal/10 text-bvb-teal-d";
  } else {
    className += "bg-border text-text-secondary";
  }
  return <span className={className}>{formatStatus(status)}</span>;
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
