/** Goose API response types */

export interface BookingUserState {
  user: {
    token: string;
    id: string;
    idHash: string;
    claims: string[];
    username: string;
    email: string;
    userId: string;
    lupId: string;
  };
  currentLocation: {
    id: string;
    name: string;
    displayName: string;
  };
  userLUPs: unknown[];
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  streetAddress: string;
  streetAddress2: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface PetProfile {
  id: string;
  displayName: string;
  locationSpeciesId: string;
  breedId: string;
  weight: number;
  birthdate: string;
  sex: string;
  altered: boolean;
}

export interface ServiceType {
  id: string;
  name: string;
  displayName: string;
}

export interface Offer {
  id: string;
  name: string;
  displayName: string;
  type: 'PRIMARY' | 'PET' | 'SERVICE' | 'VOUCHER_OFFER';
  locationServiceTypeId: string;
  locationSpeciesId?: string;
}

export interface SearchResult {
  results: Array<{
    offer: {
      id: string;
      name: string;
      displayName: string;
      type: string;
      prices: unknown[];
      priceVaries: boolean;
      serviceOffers: unknown[];
    };
    availabilityGroups: Array<{
      pricingStrategy: string;
      availabilities: Array<{
        qty: number;
        available: boolean;
        price: {
          currency: string;
          value: number;
          rate: number;
          discounts: unknown[];
        };
      }>;
    }>;
    eligibleForConsumableBenefits: boolean;
    hasRequiredAddons: boolean;
  }>;
  nextToken: string | null;
  locationServiceType: unknown;
}

export interface BookingConfig {
  leadTime: number;
  maxBookingWindow: number;
  checkInHour: Array<{
    periods: Array<{
      dayOfWeek: string[];
      start: string;
      end: string;
      interval: number;
    }>;
  }>;
  checkOutHour: Array<{
    periods: Array<{
      dayOfWeek: string[];
      start: string;
      end: string;
      interval: number;
    }>;
  }>;
}

export interface ReservationResponse {
  order: {
    id: string;
    orderStatus: string;
    total: number;
    subtotal: number;
    tax: number;
    amountDue: number;
    invoices: Array<{
      total: number;
      subtotal: number;
      tax: number;
      items: Array<{
        name: string;
        displayName: string;
        type: string;
        offerType: string;
        qty: number;
        price: number;
        rate: number;
        pricingStrategy: string;
        subtotal: number;
        tax: number;
        taxRate: number;
        total: number;
      }>;
      period: Array<{ startDate: string; endDate: string }>;
    }>;
  };
  checkInHour: unknown[];
  checkOutHour: unknown[];
  operationHour: unknown[];
  clientSecret: string;
  storePaymentMethod: string;
}

export interface OrderSummary {
  id: string;
  orderStatus: string;
  total: number;
  subtotal: number;
  tax: number;
  invoices: Array<{
    items: Array<{
      name: string;
      displayName: string;
      offerType: string;
      rate: number;
      subtotal: number;
    }>;
    period: Array<{ startDate: string; endDate: string }>;
  }>;
}

export interface PaginatedResponse<T> {
  results: T[];
  nextToken: string | null;
}
