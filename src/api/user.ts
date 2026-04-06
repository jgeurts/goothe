import type { GooseClient } from "./client";
import type { OrderSummary, PetProfile, UserProfile } from "./types";

/** Fetch user profile */
export async function fetchUserProfile(client: GooseClient, lupId: string): Promise<UserProfile> {
  return client.get(`/location-user-profiles/${lupId}`);
}

/** Fetch pet profiles */
export async function fetchPetProfiles(client: GooseClient, lupId: string): Promise<PetProfile[]> {
  const resp = await client.get<{ results?: PetProfile[] } | PetProfile[]>(
    `/location-user-profiles/${lupId}/location-pet-profiles`,
  );
  // Handle both array and paginated response formats
  if (Array.isArray(resp)) return resp;
  return resp.results ?? [];
}

/** Fetch recent orders */
export async function fetchOrders(client: GooseClient, limit = 5): Promise<OrderSummary[]> {
  const resp = await client.get<{ results: OrderSummary[] }>(
    `/orders?limit=${limit}&includes[]=invoices.items.petRelations&sort=updatedAt&order=desc`,
  );
  return resp.results ?? [];
}
