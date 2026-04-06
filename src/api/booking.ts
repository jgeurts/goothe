import type { GooseClient } from './client';
import type { PetProfile, ReservationResponse, SearchResult } from './types';

interface SearchBody {
  petGroups: Array<{
    locationSpecies: string;
    petCount: number;
    pets: Array<{
      locationPetProfileId: string;
      displayName: string;
      breedId: string;
      weight: number;
    }>;
  }>;
}

function buildSearchBody(pet: PetProfile): SearchBody {
  return {
    petGroups: [
      {
        locationSpecies: pet.locationSpeciesId,
        petCount: 1,
        pets: [
          {
            locationPetProfileId: pet.id,
            displayName: pet.displayName,
            breedId: pet.breedId,
            weight: pet.weight,
          },
        ],
      },
    ],
  };
}

/** Search for primary offers (boarding/daycare availability + pricing) */
export async function searchPrimary(
  client: GooseClient,
  serviceType: string,
  startDate: string,
  endDate: string,
  pet: PetProfile
): Promise<SearchResult> {
  return client.post(
    `/booking/search/${serviceType}?type=PRIMARY&start=${startDate}&end=${endDate}`,
    buildSearchBody(pet)
  );
}

/** Search for PET add-ons (PM pickups) */
export async function searchPetAddons(
  client: GooseClient,
  serviceType: string,
  startDate: string,
  endDate: string,
  pet: PetProfile
): Promise<SearchResult> {
  return client.post(
    `/booking/search/${serviceType}?type=PET&start=${startDate}&end=${endDate}`,
    buildSearchBody(pet)
  );
}

/** Create a draft reservation */
export async function createReservation(
  client: GooseClient,
  opts: {
    serviceType: string;
    pet: PetProfile;
    startDate: string;
    endDate: string;
    primaryOfferId: string;
    petOfferIds: Array<{ id: string }>;
  }
): Promise<ReservationResponse> {
  return client.post('/booking/reservation', {
    serviceTypeName: opts.serviceType,
    isSubStatusV2: true,
    pets: [
      {
        locationPetProfileId: opts.pet.id,
        displayName: opts.pet.displayName,
        locationSpeciesId: opts.pet.locationSpeciesId,
        breedId: opts.pet.breedId,
        weight: opts.pet.weight,
        birthdate: opts.pet.birthdate,
        sex: opts.pet.sex,
        altered: opts.pet.altered,
      },
    ],
    reservations: [
      {
        serviceTypeName: opts.serviceType,
        petIndexes: [0],
        startDate: opts.startDate,
        endDate: opts.endDate,
        primaryOffers: [
          {
            id: opts.primaryOfferId,
            qty: 1,
            serviceOffers: [],
            petOffers: opts.petOfferIds.map(o => ({
              id: o.id,
              qty: 1,
              petIndex: 0,
            })),
          },
        ],
      },
    ],
  });
}

/** Update reservation with check-in/out times and contact info */
export async function updateReservation(
  client: GooseClient,
  orderId: string,
  opts: {
    checkInTime: string;
    checkOutTime: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    street: string;
    street2: string;
    city: string;
    state: string;
    zip: string;
  }
): Promise<unknown> {
  return client.put(`/booking/reservation/${orderId}`, {
    data: {
      checkInTime: opts.checkInTime,
      checkOutTime: opts.checkOutTime,
    },
    userData: {
      firstName: opts.firstName,
      lastName: opts.lastName,
      phone: opts.phone,
      email: opts.email,
      data: {
        mailingAddress: {
          street: opts.street,
          street2: opts.street2,
          city: opts.city,
          state: opts.state,
          zip: opts.zip,
          country: 'US',
        },
      },
    },
  });
}
