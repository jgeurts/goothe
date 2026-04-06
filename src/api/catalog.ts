import type { GooseClient } from "./client";
import type { BookingConfig, Offer, PaginatedResponse, ServiceType } from "./types";

/** Fetch all pages of a paginated endpoint */
async function fetchAllPages<T>(client: GooseClient, basePath: string): Promise<T[]> {
  const all: T[] = [];
  let token: string | null = null;

  for (;;) {
    const path = token ? `${basePath}?nextToken=${token}` : basePath;
    const resp: PaginatedResponse<T> = await client.get(path);
    all.push(...resp.results);
    token = resp.nextToken;
    if (!token) break;
  }

  return all;
}

/** Fetch all service types */
export function fetchServiceTypes(client: GooseClient): Promise<ServiceType[]> {
  return fetchAllPages<ServiceType>(client, "/location-service-types");
}

/** Fetch all offers */
export function fetchOffers(client: GooseClient): Promise<Offer[]> {
  return fetchAllPages<Offer>(client, "/offers");
}

/** Fetch booking config for a service type */
export function fetchBookingConfig(
  client: GooseClient,
  serviceType: string,
): Promise<BookingConfig> {
  return client.get(`/booking/search/configs/${serviceType}`);
}
