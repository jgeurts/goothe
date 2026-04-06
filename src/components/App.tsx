import { useState, useEffect, useRef } from "react";

import { GooseClient } from "@/api/client";
import { ensureAuth, type AuthResult } from "@/api/cognito";
import { fetchBookingConfig, fetchOffers, fetchServiceTypes } from "@/api/catalog";
import type {
  BookingConfig,
  Offer,
  OrderSummary,
  PetProfile,
  ServiceType,
  UserProfile,
} from "@/api/types";
import { fetchOrders, fetchPetProfiles, fetchUserProfile } from "@/api/user";

import BookingForm from "./BookingForm";
import Spinner from "./Spinner";

type AppState =
  | { phase: "authenticating" }
  | { phase: "auth-failed"; message: string }
  | { phase: "loading"; auth: AuthResult }
  | { phase: "load-failed"; message: string }
  | {
      phase: "ready";
      auth: AuthResult;
      client: GooseClient;
      userProfile: UserProfile;
      pets: PetProfile[];
      serviceTypes: ServiceType[];
      offers: Offer[];
      orders: OrderSummary[];
      config: BookingConfig;
    };

export default function App() {
  const [state, setState] = useState<AppState>({ phase: "authenticating" });
  const clientRef = useRef<GooseClient | null>(null);

  // Phase 1: Authentication
  useEffect(() => {
    (async () => {
      const auth = await ensureAuth();
      if (!auth) {
        setState({
          phase: "auth-failed",
          message: "Please log in to Bay View Bark first.",
        });
        return;
      }
      setState({ phase: "loading", auth });
    })();
  }, []);

  // Phase 2: Data loading
  useEffect(() => {
    if (state.phase !== "loading") return;

    const auth = state.auth;
    const client = new GooseClient(auth.token);
    clientRef.current = client;

    (async () => {
      try {
        const [userProfile, pets, serviceTypes, offers, config, orders] = await Promise.all([
          fetchUserProfile(client, auth.lupId),
          fetchPetProfiles(client, auth.lupId),
          fetchServiceTypes(client),
          fetchOffers(client),
          fetchBookingConfig(client, "boarding"),
          fetchOrders(client),
        ]);

        setState({
          phase: "ready",
          auth,
          client,
          userProfile,
          pets,
          serviceTypes,
          offers,
          orders,
          config,
        });
      } catch (err: any) {
        if (err?.status === 401 || err?.status === 403) {
          setState({
            phase: "auth-failed",
            message: "Session expired. Please log in again.",
          });
        } else {
          setState({
            phase: "load-failed",
            message: err?.message ?? "Failed to load booking data.",
          });
        }
      }
    })();
  }, [state.phase === "loading" ? state.auth : null]);

  // Render based on state
  if (state.phase === "authenticating") {
    return <Spinner message="Signing in..." />;
  }

  if (state.phase === "auth-failed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="text-text font-medium">{state.message}</p>
        <a
          href="https://booking.goose.pet/bay-view-bark/"
          className="text-bvb-teal font-semibold underline underline-offset-2"
        >
          Go to Bay View Bark
        </a>
      </div>
    );
  }

  if (state.phase === "loading") {
    return <Spinner message="Loading your booking info..." />;
  }

  if (state.phase === "load-failed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <p className="text-danger font-medium">{state.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-bvb-teal font-semibold underline underline-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }

  // Ready — extract config periods
  const checkInPeriods = state.config.checkInHour?.[0]?.periods ?? [];
  const checkOutPeriods = state.config.checkOutHour?.[0]?.periods ?? [];

  const activePet = state.pets[0];

  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-10">
      {/* Header */}
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-text">Bay View Bark</h1>
          <p className="text-sm text-text-secondary">{state.userProfile.firstName}</p>
        </div>
        {activePet && (
          <div className="flex items-center gap-2 bg-bvb-teal/10 rounded-full px-3 py-1.5">
            <span className="text-base">🐾</span>
            <span className="text-sm font-semibold text-bvb-teal-d">{activePet.displayName}</span>
          </div>
        )}
      </header>

      {/* Booking form */}
      <BookingForm
        client={state.client}
        userProfile={state.userProfile}
        pets={state.pets}
        serviceTypes={state.serviceTypes}
        offers={state.offers}
        orders={state.orders}
        checkInPeriods={checkInPeriods}
        checkOutPeriods={checkOutPeriods}
        leadTimeMinutes={state.config.leadTime ?? 1440}
        maxBookingWindowMinutes={state.config.maxBookingWindow ?? 525960}
      />
    </div>
  );
}
