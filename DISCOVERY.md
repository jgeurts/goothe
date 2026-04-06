# Goothe — Bay View Bark Booking UI Replacement

## Discovery & Implementation Plan

### Problem

The existing booking UI at `booking.goose.pet/bay-view-bark` is a 7-step wizard that's painfully slow for repeat customers. Jim primarily books overnight boarding (multi-night stays) and occasionally single-day daycare for Potato G. (Brittany Spaniel, 38 lbs). The goal is a streamlined interface that reduces this to 2–3 clicks.

---

## Platform Overview

Bay View Bark uses **Goose** (`goose.pet`), a SaaS platform for pet care businesses. There is no public API documentation. The frontend is a Vite-built vanilla JS app with a clean REST API underneath.

- **API Base URL:** `https://api.goose.pet/api/v1/client/bay-view-bark`
- **Auth:** AWS Cognito (via Amplify) with PKCE. See Authentication section below.
- **Location ID:** `cmgbhhwy80bn7urfv5ctc2z9n`

### Authentication Details (verified April 2026)

Goose uses **AWS Cognito** for authentication, integrated via the **Amplify** SDK. This gives us access to a **refresh token** that can silently obtain new access tokens — eliminating the need to manually log in every 60 minutes.

#### Cognito Configuration

| Field | Value |
|---|---|
| User Pool | `us-east-2_IqPUw1L4C` |
| Region | `us-east-2` |
| Client ID | `4qv4b8pvtsqigsontd3vfmf6kf` |
| Token endpoint | `https://cognito-idp.us-east-2.amazonaws.com/` |

#### localStorage Keys

Cognito stores tokens under a prefixed key pattern. All keys for the current user:

| Key | Contains |
|---|---|
| `CognitoIdentityServiceProvider.{clientId}.{email}.accessToken` | Access token (JWT, 60-min lifetime) — **this is what `BookingUserState.user.token` uses** |
| `CognitoIdentityServiceProvider.{clientId}.{email}.idToken` | ID token (JWT, 60-min lifetime) |
| `CognitoIdentityServiceProvider.{clientId}.{email}.refreshToken` | Refresh token (JWE, 30-day default lifetime) |
| `CognitoIdentityServiceProvider.{clientId}.{email}.userData` | Cached user attributes (sub, email) |
| `CognitoIdentityServiceProvider.{clientId}.{email}.clockDrift` | Clock drift compensation (typically `"0"`) |
| `CognitoIdentityServiceProvider.{clientId}.LastAuthUser` | Last authenticated email |
| `amplify-signin-with-hostedUI` | `"false"` — not using hosted UI |
| `BookingUserState` | Goose app state: `{ user: { token, id, idHash, claims, username, email, userId, lupId }, currentLocation, userLUPs }` |

Where `{clientId}` = `4qv4b8pvtsqigsontd3vfmf6kf` and `{email}` = `jim@biacreations.com`.

**Key discovery:** `BookingUserState.user.token` is the **access token** (not the ID token). After refreshing, both the Cognito key AND `BookingUserState` must be updated.

#### Token Lifetimes

| Token | Lifetime | Format |
|---|---|---|
| Access token | **60 minutes** | JWT (decodable, has `exp` claim) |
| ID token | **60 minutes** | JWT (decodable, has `exp` claim) |
| Refresh token | **~30 days** (Cognito default, server-configured) | JWE (encrypted, expiry not client-readable) |

#### Silent Token Refresh (verified working)

Call the Cognito `InitiateAuth` API with the refresh token to get fresh access + ID tokens:

```
POST https://cognito-idp.us-east-2.amazonaws.com/
Headers:
  Content-Type: application/x-amz-json-1.1
  X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth

Body:
{
  "AuthFlow": "REFRESH_TOKEN_AUTH",
  "ClientId": "4qv4b8pvtsqigsontd3vfmf6kf",
  "AuthParameters": {
    "REFRESH_TOKEN": "<refresh token from localStorage>"
  }
}

Response (200 OK):
{
  "AuthenticationResult": {
    "AccessToken": "<new access token>",
    "IdToken": "<new id token>",
    "ExpiresIn": 3600,
    "TokenType": "Bearer"
  }
}
```

**Note:** The response does NOT include a new refresh token — the existing one remains valid until it expires server-side.

#### Goothe Auth Startup Flow

On every launch, goothe should:

```
1. Read refresh token from localStorage (Cognito key)
   → If missing: show "Please log in" with link to booking.goose.pet/bay-view-bark/

2. Read access token from localStorage, decode JWT, check exp
   → If NOT expired (with 5-min buffer): use it directly, skip refresh
   → If expired or within 5 min of expiry: proceed to step 3

3. Call Cognito InitiateAuth with REFRESH_TOKEN_AUTH
   → If 200 OK:
     a. Update Cognito localStorage keys (accessToken, idToken)
     b. Update BookingUserState.user.token with new access token
     c. Proceed with fresh token
   → If error (NotAuthorizedException):
     Refresh token expired. Show "Session expired — please log in"
     with link to booking.goose.pet/bay-view-bark/

4. Optionally: set a setTimeout to auto-refresh 5 minutes before
   the new access token expires (every ~55 min), so the session
   stays alive indefinitely while the app is open
```

**Result:** Jim only needs to manually log in once every ~30 days. As long as he uses goothe at least once a month, the refresh token stays alive and goothe silently handles token renewal.

#### Cognito Groups (from token claims)

The access token includes `cognito:groups` with role-based identifiers:
- `USR:{userId}:SELF` — self-service user role
- `USR:{email}:EMAIL` — email-based identity
- `LUP:bay-view-bark:{lupId}` — location user profile binding

---

## API Endpoints

### Booking Search

| Endpoint | Method | Purpose |
|---|---|---|
| `/booking/search/{serviceType}/days?type=PRIMARY` | POST | Get available offers + pricing for a service type |
| `/booking/search/{serviceType}?type=PRIMARY&start=X&end=Y` | POST | Get primary offers for a date range (boarding) |
| `/booking/search/{serviceType}?type=PET&start=X&end=Y` | POST | Get PET add-ons (PM pickups) |
| `/booking/search/{serviceType}?type=SERVICE&start=X&end=Y` | POST | Get SERVICE add-ons |
| `/booking/search/grooming/days?type=PRIMARY` | POST | Get grooming add-ons for boarding stays |
| `/booking/search/configs/{serviceType}` | GET | Get booking config (lead times, hours, booking window) |

**Search request body (same for all):**
```json
{
  "petGroups": [{
    "locationSpecies": "cmgbhj17722b7s3zvl1slzvmj",
    "petCount": 1,
    "pets": [{
      "locationPetProfileId": "cmhawm4rp0b9q4hczz1kkqc5h",
      "displayName": "Potato G.",
      "breedId": "clamtxnhj006cse0j5j6mgw66",
      "weight": 38
    }]
  }]
}
```

**Search response shape:**
```json
{
  "results": [{
    "offer": { "id", "name", "displayName", "type", "prices": [...], "priceVaries", "serviceOffers": [...] },
    "availabilityGroups": [{
      "pricingStrategy": "NIGHTLY",
      "availabilities": [{
        "qty": 1,
        "available": true/false,
        "price": { "currency": "USD", "value": 74, "rate": 74, "discounts": [] }
      }]
    }],
    "eligibleForConsumableBenefits": false,
    "hasRequiredAddons": false
  }],
  "nextToken": null,
  "locationServiceType": { ... }
}
```

### Reservation Flow

| Endpoint | Method | Purpose |
|---|---|---|
| `/booking/reservation` | POST | Create a draft reservation (returns order with orderId) |
| `/booking/reservation/{orderId}` | GET | Get reservation details |
| `/booking/reservation/{orderId}` | PUT | Update reservation with check-in/out times + contact info (see below) |
| `/booking/reservation/{orderId}/confirm` | POST | Confirm the reservation (body: `{ payment: { type: "ADYEN" } }`) |
| `/booking/reservation/{orderId}/payment` | POST | Initiate payment (body: `{ payment: {} }`) |
| `/booking/reservation/{orderId}/payment/submit` | POST | Submit payment (Adyen) |
| `/booking/reservation/{orderId}/payment/{paymentId}/cancel` | POST | Cancel a payment |
| `/receipt/{orderId}?step=PAYMENT` | GET | Get receipt/order summary for payment step |

#### Full Reservation Flow (verified April 2026)

1. **POST** `/booking/reservation` — creates draft order with dates, offers, pet details
2. **PUT** `/booking/reservation/{orderId}` — sets check-in/out times + contact info
3. **POST** `/booking/reservation/{orderId}/payment` — initiates payment (body: `{ payment: {} }`)
4. Payment handled by Adyen drop-in component on the Goose payment page

**PUT reservation body shape:**
```json
{
  "data": {
    "checkInTime": "07:30",
    "checkOutTime": "18:00"
  },
  "userData": {
    "firstName": "Jim",
    "lastName": "G",
    "phone": "...",
    "email": "...",
    "data": {
      "mailingAddress": {
        "street": "...",
        "street2": "",
        "city": "Milwaukee",
        "state": "Wisconsin",
        "zip": "53207",
        "country": "US"
      }
    }
  }
}
```

**Time format:** 24-hour string, e.g. `"07:30"`, `"18:00"`. Values must fall within the allowed check-in/check-out windows (see Booking Config below).

**Reservation request body (boarding + PM pickup):**
```json
{
  "serviceTypeName": "boarding",
  "isSubStatusV2": true,
  "pets": [{
    "locationPetProfileId": "cmhawm4rp0b9q4hczz1kkqc5h",
    "displayName": "Potato G.",
    "locationSpeciesId": "cmgbhj17722b7s3zvl1slzvmj",
    "breedId": "clamtxnhj006cse0j5j6mgw66",
    "weight": 38,
    "birthdate": "2021-08-07",
    "sex": "FEMALE",
    "altered": true
  }],
  "reservations": [{
    "serviceTypeName": "boarding",
    "petIndexes": [0],
    "startDate": "2026-04-10",
    "endDate": "2026-04-12",
    "primaryOffers": [{
      "id": "cmgijclgp04p1el8lquex1884",
      "qty": 1,
      "serviceOffers": [],
      "petOffers": [
        { "id": "cmh1154uj4u76ftbgzekgx5kh", "qty": 1, "petIndex": 0 }
      ]
    }]
  }]
}
```

**Reservation request body (daycare, no add-ons):**
```json
{
  "serviceTypeName": "daycare",
  "isSubStatusV2": true,
  "pets": [{ ...same pet object... }],
  "reservations": [{
    "serviceTypeName": "daycare",
    "petIndexes": [0],
    "startDate": "2026-04-07",
    "endDate": "2026-04-08",
    "primaryOffers": [{
      "id": "cmgijjoap05r3lf9r4d9xj0w4",
      "qty": 1,
      "serviceOffers": [],
      "petOffers": []
    }]
  }]
}
```

**Reservation response shape:**
```json
{
  "order": {
    "id": "...",
    "orderStatus": "PENDING",
    "total": 392.21,
    "subtotal": 363.50,
    "tax": 28.71,
    "amountDue": 0,
    "invoices": [{
      "total": 392.21,
      "subtotal": 363.50,
      "tax": 28.71,
      "items": [
        {
          "name": "stay-play-overnight-care",
          "displayName": "Stay & Play Overnight Care",
          "type": "OFFER",
          "offerType": "PRIMARY",
          "qty": 1,
          "price": 280,
          "rate": 70,
          "pricingStrategy": "NIGHTLY",
          "subtotal": 280,
          "tax": 22.12,
          "taxRate": 0.079,
          "total": 302.12
        },
        {
          "name": "pm-pick-up-mon-fre-4-7-pm-1-dog",
          "displayName": "PM Pick Up Mon-Fri 4-7pm 1 Dog",
          "type": "OFFER",
          "offerType": "...",
          "qty": 1,
          "price": 45.50,
          "rate": 45.50,
          "pricingStrategy": "NIGHTLY",
          "subtotal": 45.50,
          "tax": 3.59,
          "taxRate": 0.079,
          "total": 49.09
        }
      ],
      "period": [{ "startDate": "2026-05-07", "endDate": "2026-05-11" }]
    }]
  },
  "checkInHour": [...],
  "checkOutHour": [...],
  "operationHour": [...],
  "clientSecret": "...",
  "storePaymentMethod": "..."
}
```

**Tax rate:** 7.9% applied to all line items. Item `total` = `subtotal` + `tax`. Order `total` = sum of all item totals.

### User & Pet Data

| Endpoint | Method | Purpose |
|---|---|---|
| `/location-user-profiles/{lupId}` | GET | Get user profile + pet profiles |
| `/location-user-profiles/{lupId}/location-pet-profiles` | GET | Get pet profiles only |
| `/location-user-profiles/{lupId}/location-pet-profiles/{lppId}` | GET | Get single pet |
| `/orders?limit=25&includes[]=invoices.items.petRelations&sort=updatedAt&order=desc` | GET | List past/upcoming bookings |
| `/reportcard/by-pet/{petId}` | GET | Get pet report cards |

### Catalog / Config Endpoints (verified April 2026)

These endpoints return dynamic data — use these instead of hardcoding IDs where possible.

| Endpoint | Method | Purpose | Notes |
|---|---|---|---|
| `/location-service-types` | GET | List all service types (daycare, boarding, memberships, grooming, etc.) | Paginated: `{ results: [...], nextToken }`. Each has `id`, `name`, `displayName`. |
| `/location-booking-confs` | GET | Get booking configurations (7 configs) | Each config has `personalInfoRequired`, `vetRequired`, `vaccinationRequired`, `requestDates`, `requestTime`, etc. |
| `/offers` | GET | List ALL offers (32 total) | Paginated. Each offer has `id`, `name`, `displayName`, `type` (PRIMARY/PET/SERVICE/VOUCHER_OFFER), `locationServiceTypeId`, `locationSpeciesId`. **No prices** — prices come from the search endpoint contextually. |
| `/offers/{offerId}` | GET | Single offer detail | **403 Forbidden** — not exposed to client role. |

**Offers by locationServiceTypeId:**

| locationServiceTypeId | Service | Offers |
|---|---|---|
| `cmgbhj9at30kyir8t8hn5aocw` | Boarding | 1 PRIMARY (Stay & Play) + 6 PET (PM Pickups) |
| `cmgbhjcpk0bnaurfvzhq64ja7` | Daycare | 2 PRIMARY (Mon-Fri, Saturday) |
| `cmgim09bn4h3wir8tippls7z1` | Memberships | ~20 VOUCHER_OFFER (daycare packs) |
| _(grooming type)_ | Grooming | PRIMARY grooming offers |

**Key implication for the UI:** We can dynamically fetch offers from `/offers`, filter by `locationServiceTypeId` and `type`, and match them to the right service. This means if Bay View Bark changes offer names/IDs, the UI can adapt automatically.

---

## Known IDs & Pricing

### Pet: Potato G.

| Field | Value |
|---|---|
| locationPetProfileId | `cmhawm4rp0b9q4hczz1kkqc5h` |
| locationSpeciesId | `cmgbhj17722b7s3zvl1slzvmj` |
| breedId | `clamtxnhj006cse0j5j6mgw66` |
| locationUserProfileId | `cmhats1kf21qteq0ma8bvh3bo` |
| weight | 38 lbs |
| birthdate | 2021-08-07 |
| sex | FEMALE |
| altered | true |
| breed | Brittany Spaniel |

### Boarding

| Offer | ID | Price (1 dog) |
|---|---|---|
| Stay & Play Overnight Care | `cmgijclgp04p1el8lquex1884` | $70.00/night |

Rate is $70/night for 1 dog regardless of day of week. Pricing strategy: `NIGHTLY`. Tax rate: 7.9%.

**Verified via reservation**: 4-night stay (Thu May 7 – Mon May 11, 2026) = $280 subtotal + $22.12 tax = $302.12 total.

### Daycare

| Offer | ID | Price (1 dog) |
|---|---|---|
| Smart Doggy Day Care - Mon-Fri | `cmgijjoap05r3lf9r4d9xj0w4` | $45.50/day |
| Smart Doggy Day Care - Saturday | `cmh0q7rui04v5zncxaixsd28v` | $38.00/day |

### PM Pickup Add-ons (PET type)

| Name | ID | Price |
|---|---|---|
| PM Pick Up Mon-Fri 4-7pm 1 Dog | `cmh1154uj4u76ftbgzekgx5kh` | $45.50/each |
| PM Pick Up Mon-Fri 4-7pm 2nd/3rd/4th Dog | `cmh11i8ry25qczncxqfzqqo0x` | $44.00/each |
| PM Pick Up Sat/Sun 4-5pm 1 Dog | `cmh9crgj810cueq0mknbz57j5` | $38.00/each |
| PM Pick Up Sat/Sun 4-5pm 2nd/3rd/4th Dog | `cmh9crt2l02c9etcncm7fvxie` | $36.00/each |
| PM Pick Up Holiday 4-5pm 1 Dog | `cmh9csf7t0wjqxhlv2z0dyn47` | $54.00/each |
| PM Pick Up Holiday 4-5pm 2nd/3rd/4th Dog | `cmh9csu7s10te107zbc74ulp3` | $52.00/each |

#### PM Pickup Pricing Model (verified)

PM Pickup is a **flat fee per variant**, NOT per-night. You add `qty: 1` for each applicable variant and the API charges one flat rate regardless of how many weekday or weekend nights are in the stay.

**Verified example** (Thu May 7 – Mon May 11, 2 weekday + 2 weekend nights):
- PM Mon-Fri: $45.50 flat (subtotal) + $3.59 tax = $49.09
- PM Sat/Sun: $38.00 flat (subtotal) + $3.00 tax = $41.00

For mixed stays (weekdays + weekend), **both Mon-Fri and Sat/Sun PM pickup variants must be added as separate petOffers** in the reservation body, each with `qty: 1` and `petIndex: 0`.

For weekday-only stays, only include the Mon-Fri variant. For weekend-only stays, only include the Sat/Sun variant. The API determines applicability based on the date range — the client just needs to include the right variants.

### Grooming Add-ons (from grooming/days search)

| Name | ID |
|---|---|
| Full Groom | `cmgimauri4h7eir8tbhp6xsz0` |
| Mini Groom | `cmgimaqvy06yglf9rhv0aixtm` |
| Bath, Brush, & More - Doodle/Extra Long | `cmgiman654i35v3bnlh9funtg` |
| Bath, Brush, & More - Double/Long Coated | `cmgimak1r06yalf9rqyi34go6` |
| Bath, Brush, & More - Smooth/Short Coated | `cmgimaf104isqfpd0yx9gkzs8` |
| Nail Clipping | `cmgimayhc4i42v3bnwstbpsd8` |
| Brush Out | `cmh3mxnfb77w9cf4uib2n8oof` |
| Gland Expression | `cmgimb9js4i4iv3bnzcufjdrx` |
| Ear Cleaning | `cmgimb2h54i46v3bnr9d440eo` |
| Teeth Brushing | `cmgimb5sf0609el8lg9b66lf9` |

Grooming prices show as $0 in the search response — likely weight-based or dynamically priced.

### Boarding Included Services

These are bundled into the Stay & Play offer (not add-ons):
Guest Room, Smart Doggy Day Care Add-On, Training Session, Warm-Up Pack, Morning Group Playtime, Afternoon Group Playtime, Lunch/Nap Time

---

## Booking Config Highlights

- **Lead time:** 1440 minutes (24 hours minimum notice)
- **Max booking window:** 525,960 minutes (~365 days out, through Jan 31, 2027 shown in UI)
- **Late pickup fee:** $1/minute after scheduled pickup

### Check-In Windows (arrival at start of stay)

| Day | Window | 30-min slots |
|---|---|---|
| Mon-Fri | 07:00–08:00 | 07:00, 07:30 |
| Sat-Sun | 09:00–10:00 | 09:00, 09:30 |

### Check-Out Windows (departure at end of stay)

| Day | AM Pickup | PM Pickup |
|---|---|---|
| Mon-Fri | 08:00–10:00 | 16:00–19:00 |
| Sat-Sun | 09:00–10:00 | 16:00–17:00 |

All times in 30-minute increments. Dropdowns in the UI list every 30-min slot within each window.

### Jim's Default Time Preferences

| Scenario | checkInTime | checkOutTime |
|---|---|---|
| Weekday start + PM pickup departure (weekday) | `07:30` | `18:00` |
| Weekday start + PM pickup departure (weekend) | `07:30` | `16:30` |
| Weekend start + PM pickup departure (weekday) | `08:30` | `18:00` |
| Weekend start + PM pickup departure (weekend) | `08:30` | `16:30` |
| Weekday start + AM pickup departure (weekday) | `07:30` | `07:30` |
| Weekday start + AM pickup departure (weekend) | `07:30` | `08:30` |
| Weekend start + AM pickup departure (weekday) | `08:30` | `07:30` |
| Weekend start + AM pickup departure (weekend) | `08:30` | `08:30` |

**Logic:** Check-in defaults to 7:30am weekday / 8:30am weekend (based on start date). Check-out defaults to 6:00pm weekday / 4:30pm weekend for PM pickup, or 7:30am weekday / 8:30am weekend for AM pickup (based on end date). These are pre-selected values in dropdowns that can be changed.

---

## Existing UI Flow (7 steps — what we're replacing)

1. Select service type (Daycare / Boarding / Grooming)
2. Select dates (range picker for boarding, multi-select for daycare)
3. Select pet(s) + room configuration
4. Click Search
5. Select offer
6. Add pet perks (grooming, PM pickup)
7. Details & policies (contact info, arrival time, agree to policies)
8. Payment

---

## Implementation Plan

### Dynamic vs Hardcoded Audit (April 2026)

Everything below should be **fetched from the API at startup** rather than hardcoded. Hardcoded values serve only as fallbacks.

| Data | Fetch From | Hardcode? |
|---|---|---|
| Auth token + lupId | `localStorage.BookingUserState` | No — always read from state |
| Location name | `localStorage.BookingUserState.currentLocation.name` | No |
| Pet list (id, species, breed, weight, birthdate, sex, altered) | `GET /location-user-profiles/{lupId}/location-pet-profiles` | No — fetch dynamically, supports multiple pets |
| Contact info (firstName, lastName, phone, email) | `GET /location-user-profiles/{lupId}` | No — fetch from profile |
| Mailing address (street, city, state, zip) | `GET /location-user-profiles/{lupId}` (fields: `streetAddress`, `streetAddress2`, `city`, `state`, `zipCode`) | No — fetch from profile |
| Service types + IDs | `GET /location-service-types` | No — filter by `name` ("boarding", "daycare") |
| All offers + IDs + types | `GET /offers` | No — filter by `locationServiceTypeId` + `type` (PRIMARY, PET) |
| Offer pricing | `POST /booking/search/{serviceType}?type=PRIMARY&start=X&end=Y` | No — always from search |
| PM pickup availability + pricing | `POST /booking/search/{serviceType}?type=PET&start=X&end=Y` | No — always from search |
| Check-in/out hour windows | `GET /booking/search/configs/boarding` → `checkInHour[0].periods`, `checkOutHour[0].periods` | No — build dropdown slots dynamically from periods |
| Lead time + max booking window | `GET /booking/search/configs/boarding` → `leadTime`, `maxBookingWindow` | No |
| Tax rate | Returned in reservation response (`taxRate: 0.079` on each line item) | No |

**Only these should be hardcoded as preferences/defaults:**

| Data | Value | Why |
|---|---|---|
| Jim's default check-in time (weekday) | `07:30` | Personal preference |
| Jim's default check-in time (weekend) | `08:30` | Personal preference |
| Jim's default checkout time PM (weekday) | `18:00` | Personal preference |
| Jim's default checkout time PM (weekend) | `16:30` | Personal preference |
| Jim's default checkout time AM (weekday) | `07:30` | Personal preference |
| Jim's default checkout time AM (weekend) | `08:30` | Personal preference |
| Country default | `US` | Not in user profile, always US |
| PM pickup default | on | Jim's typical preference |

---

## Build Plan

### Stack: React + Vite + TypeScript + Tailwind CSS v4

Modeled on the bg1 project architecture — a proven pattern for bookmarklet-injected React apps.

| Layer | Choice | Rationale |
|---|---|---|
| UI framework | React 19 | Componentized, hooks for state, same as bg1 |
| Build tool | Vite 7 | Fast builds, deterministic output filenames, same as bg1 |
| Language | TypeScript | Type safety on API response shapes, same as bg1 |
| Styling | Tailwind CSS v4 | Utility classes, `@theme` for BVB brand colors, same as bg1 |
| Date handling | `date-fns` or native `Intl`/`Date` | Lightweight date math for calendar, day-of-week checks |
| Testing | Jest + React Testing Library | Same as bg1 |
| Hosting | GitHub Pages (`jgeurts/goothe`) | Free, cacheable, simple deploy |

### Repo: `jgeurts/goothe`

```
goothe/
├── DISCOVERY.md                # This document
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.mts
├── eslint.config.mjs
├── .prettierrc.js
├── src/
│   ├── goothe.tsx              # Entry point — mounts React app (like bg1.tsx)
│   ├── goothe.css              # Tailwind entry + @theme with BVB brand colors
│   ├── components/
│   │   ├── App.tsx             # Root component — auth check, data loading, routing
│   │   ├── Calendar.tsx        # Date range picker (boarding) / single date (daycare)
│   │   ├── TimeSelect.tsx      # Check-in / check-out time dropdowns
│   │   ├── PriceSummary.tsx    # Live price breakdown
│   │   ├── BookingForm.tsx     # Combines calendar + times + PM pickup + submit
│   │   ├── UpcomingBookings.tsx# List of recent/upcoming orders
│   │   ├── ModeToggle.tsx      # Boarding / Daycare switch
│   │   └── Spinner.tsx         # Loading state
│   ├── api/
│   │   ├── client.ts           # GooseClient class — auth, base URL, fetch wrapper
│   │   ├── cognito.ts          # Cognito token refresh (InitiateAuth w/ REFRESH_TOKEN_AUTH)
│   │   ├── types.ts            # TypeScript interfaces for all API responses
│   │   ├── booking.ts          # Search, reservation, confirm endpoints
│   │   ├── catalog.ts          # Service types, offers, configs
│   │   └── user.ts             # User profile, pet profiles, orders
│   ├── contexts/
│   │   ├── AuthContext.ts      # Token + lupId + refresh state
│   │   ├── BookingContext.ts   # Selected dates, offers, PM pickup state
│   │   └── CatalogContext.ts   # Loaded service types, offers, configs
│   ├── hooks/
│   │   ├── useAuth.ts          # Read Cognito tokens, silent refresh, update BookingUserState
│   │   ├── useBooking.ts       # Booking state management
│   │   └── useCatalog.ts       # Fetch and cache catalog data
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   ├── BookingProvider.tsx
│   │   └── CatalogProvider.tsx
│   └── lib/
│       ├── dates.ts            # Date utilities (isWeekday, nightCount, etc.)
│       ├── defaults.ts         # Jim's hardcoded time preferences
│       └── pricing.ts          # Client-side price estimation
├── dist/                       # Vite build output (deployed to GitHub Pages)
│   ├── goothe.js
│   └── goothe.css
└── bookmarklet.js              # Human-readable bookmarklet source
```

### Vite Config

Modeled on bg1's config with deterministic output filenames:

```typescript
export default defineConfig({
  base: '/goothe/',
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: ['src/goothe.tsx', 'src/goothe.css'],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  plugins: [react(), tailwindcss()],
});
```

This produces `dist/goothe.js` and `dist/goothe.css` — predictable URLs for the bookmarklet to load.

### Bookmarklet

A `javascript:` URL saved as a browser bookmark. When tapped on `booking.goose.pet`:

```javascript
javascript:void((function(){
  if(!location.hostname.includes('booking.goose.pet')){
    alert('Navigate to booking.goose.pet first');return;
  }
  var e=document.getElementById('goothe');
  if(e){e.remove();return;}
  var b='https://jgeurts.github.io/goothe/';
  var l=document.createElement('link');
  l.rel='stylesheet';l.href=b+'goothe.css';
  document.head.appendChild(l);
  var sc=document.createElement('script');
  sc.type='module';sc.src=b+'goothe.js';
  document.head.appendChild(sc);
})())
```

**How it works:**
1. Domain check — confirms we're on `booking.goose.pet` (required for same-origin localStorage access)
2. Toggle — if already injected, removes it (click again to dismiss)
3. Injects CSS + JS from GitHub Pages into the host page
4. The React app mounts, calls `document.close()` to wipe the Goose UI, and takes over (same pattern as bg1)
5. Auth is handled by the React app — it reads the Cognito refresh token from localStorage and silently refreshes if needed (no manual login required unless refresh token has expired)

**Since the script runs on `booking.goose.pet`:**
- Same-origin access to `localStorage` (auth token)
- Same-origin API calls to `api.goose.pet` (no CORS issues — the Goose frontend already makes these calls)

**Mobile bookmark setup (iOS Safari):**
1. Go to `booking.goose.pet/bay-view-bark/` and log in
2. Add a regular bookmark
3. Edit the bookmark, replace the URL with the `javascript:...` code
4. Tap the bookmark to launch Goothe

### Startup Sequence

```
Bookmarklet tapped on booking.goose.pet
  → Domain check (must be booking.goose.pet)
  → Inject goothe.css + goothe.js
  → React app mounts, wipes host page (document.close())

Phase 1 — Auth (before any API calls):
  → Read refresh token from Cognito localStorage key
    → If missing: show "Please log in" + link to booking.goose.pet/bay-view-bark/
  → Read access token, decode JWT, check exp claim
    → If valid (>5 min remaining): use as-is
    → If expired or expiring soon:
      → Call Cognito InitiateAuth with REFRESH_TOKEN_AUTH
      → If 200: update Cognito keys + BookingUserState in localStorage
      → If error: refresh token expired, show "Please log in" message
  → Extract lupId from BookingUserState

Phase 2 — Data loading (parallel, using fresh token):
  → Promise.all:
     1. GET /location-user-profiles/{lupId}                     → contact info
     2. GET /location-user-profiles/{lupId}/location-pet-profiles → pet list
     3. GET /location-service-types                              → service type IDs
     4. GET /offers                                              → all offers
     5. GET /booking/search/configs/boarding                     → check-in/out windows, lead time
     6. GET /orders?limit=5&sort=updatedAt&order=desc            → upcoming bookings

Phase 3 — Build state + render:
  → Map service types by name → id
  → Map offers by locationServiceTypeId + type
  → Identify boarding PRIMARY offer, daycare PRIMARY offers, PET offers
  → Build check-in/out dropdown options from config periods
  → Pre-select first pet
  → Pre-fill contact info from user profile
  → Render UI
  → Set timer to auto-refresh token ~55 min from now
```

If any Phase 2 call returns 401/403, attempt one token refresh and retry. If refresh fails, show "Session expired" with a link to re-login on `booking.goose.pet/bay-view-bark/`.

---

### UI/UX Design

#### Layout (mobile-first)

```
┌──────────────────────────────┐
│  Bay View Bark  ·  Potato G. │  ← header: location name + active pet
├──────────────────────────────┤
│  [Boarding]  [Daycare]       │  ← mode toggle (boarding selected by default)
├──────────────────────────────┤
│                              │
│      ◄  May 2026  ►         │  ← calendar (current/next month)
│  Mo Tu We Th Fr Sa Su        │
│      ...date grid...         │  ← tap start date, tap end date (boarding)
│                              │  ← tap single date (daycare)
├──────────────────────────────┤
│  Check-in: [07:30am ▼]      │  ← arrival time dropdown (pre-selected)
│  Check-out: [06:00pm ▼]     │  ← departure time dropdown (pre-selected)
│                              │
│  ☑ PM Pickup                 │  ← toggle, on by default
│    Mon-Fri: $45.50           │  ← shown if range includes weekdays
│    Sat/Sun: $38.00           │  ← shown if range includes weekends
├──────────────────────────────┤
│  Boarding: 4 nights × $70   │  ← price summary
│  PM Pickup Mon-Fri: $45.50  │
│  PM Pickup Sat/Sun: $38.00  │
│  Subtotal: $383.50          │
│  Tax (7.9%): $30.30         │
│  Estimated Total: $413.80   │
├──────────────────────────────┤
│  [ Book & Pay → ]           │  ← primary action button
├──────────────────────────────┤
│  Upcoming Bookings           │  ← collapsible section
│  · May 2-4  Boarding  $150  │
│  · Apr 28   Daycare   $45   │
└──────────────────────────────┘
```

#### Mode: Boarding (default)

1. Tap a **start date** on the calendar → highlighted in teal
2. Tap an **end date** → range highlighted, night count shown
3. Check-in dropdown auto-selects based on start date day-of-week
4. Check-out dropdown auto-selects based on end date day-of-week + PM pickup toggle
5. PM Pickup toggle is **on by default**. When on:
   - App determines which PM pickup variants apply (Mon-Fri, Sat/Sun, or both)
   - Shows the applicable flat fees
   - Check-out dropdown shows PM window slots
6. When PM pickup is toggled **off**:
   - Check-out dropdown switches to AM window slots
   - PM pickup fees removed from price summary
7. **Price summary** updates live. Uses search API rate for boarding, known flat fees for PM pickup. Tax estimated at 7.9%.
8. Tap **"Book & Pay →"** to submit.

#### Mode: Daycare

1. Tap a **single date** on the calendar
2. Auto-selects correct offer (Mon-Fri vs Saturday)
3. Sunday dates disabled (no daycare)
4. No PM pickup option
5. Price shown for the single day
6. Tap **"Book & Pay →"** to submit

#### Calendar Behavior

- Mobile: single month with prev/next arrows, touch-friendly 44px+ tap targets
- Desktop: current + next month side by side
- Dates before today + lead time (24hr) grayed out
- Dates beyond max booking window grayed out
- After selecting dates, search API verifies availability. Unavailable → date turns red, "Not available — call (414) 763-1304"
- Boarding: first tap = start, second tap = end, third tap = reset
- Daycare: single tap selects/deselects

#### Time Dropdowns

Built dynamically from `/booking/search/configs/boarding` periods. Lists 30-min slots within the window for the relevant day-of-week. Jim's defaults pre-selected.

---

### Booking Submission Flow

When **"Book & Pay →"** is tapped:

```
1. VALIDATE
   - Dates selected?
   - Within allowed window?
   - Search API confirms availability?

2. POST /booking/reservation  →  Create draft order
   Body: {
     serviceTypeName, isSubStatusV2: true,
     pets: [{ ...from pet profile API... }],
     reservations: [{
       serviceTypeName, petIndexes: [0],
       startDate, endDate,
       primaryOffers: [{
         id: "<boarding offer id>", qty: 1,
         serviceOffers: [],
         petOffers: [
           // conditional on PM toggle + date range:
           { id: "<pm-mon-fri id>", qty: 1, petIndex: 0 },
           { id: "<pm-sat-sun id>", qty: 1, petIndex: 0 }
         ]
       }]
     }]
   }
   → Returns: order.id, order.total, clientSecret

3. PUT /booking/reservation/{orderId}  →  Set times + contact info
   Body: {
     data: { checkInTime, checkOutTime },
     userData: {
       firstName, lastName, phone, email,
       data: { mailingAddress: { street, street2, city, state, zip, country: "US" } }
     }
   }

4. REDIRECT to booking.goose.pet/bay-view-bark/booking/payment
   → Goose payment page loads the pending reservation
   → Adyen drop-in handles card entry / 3DS / saved cards
   → User completes payment on Goose, sees Goose confirmation
```

**Why redirect to Goose for payment?**
- Adyen requires merchant-specific client key
- Handling card data has PCI compliance implications
- Goose payment page already works and handles edge cases

**After payment:** User sees Goose confirmation. Tap bookmarklet again to return to Goothe — "Upcoming Bookings" will show the new booking.

---

### Error Handling

| Error | User sees | Action |
|---|---|---|
| Token expired (401/403) | Auto-refresh via Cognito. If refresh fails: "Session expired. Please log in." | Attempt silent refresh → retry. If refresh token expired: link to `booking.goose.pet/bay-view-bark/` |
| Dates unavailable | Date turns red, "Not available" tooltip | Pick different dates or call (414) 763-1304 |
| Reservation POST fails (occupancy) | "These dates just filled up" | Return to calendar |
| PUT fails | "Could not save booking details" | Retry or proceed (times are optional) |
| Network error | "Connection lost" | Retry button |

---

### Tailwind Theme

```css
@import 'tailwindcss';

@theme {
  --color-bvb-teal: #5f9ea0;
  --color-bvb-teal-d: #4a8a8c;
  --color-bvb-gold: #d4a843;
  --color-bvb-gold-d: #b8922e;
}
```

---

### Open Questions

1. ~~**Session expiry mid-flow:**~~ **SOLVED.** Goothe refreshes the access token on startup using the Cognito refresh token. If a 401 occurs mid-flow (e.g., between POST and PUT), goothe will auto-refresh and retry. The user only needs to manually log in if the refresh token itself has expired (~30 days of inactivity).
2. **Holiday PM pickup:** No API for holiday dates. Skip holiday detection — only add Mon-Fri and Sat/Sun variants. Handle API rejection gracefully if a holiday is involved.
3. **Concurrent reservations:** If Jim has a PENDING (unpaid) reservation from a previous attempt, creating a new one might conflict. Check for PENDING orders on startup.
4. **Goose payment page state:** Verify that after our POST + PUT, the Goose payment page picks up our reservation (likely loads most recent PENDING order).
5. **GitHub Pages deploy:** Set up GitHub Actions to build and deploy `dist/` to GitHub Pages on push to `main`.
6. **Refresh token lifetime:** Cognito default is 30 days, but it's configured server-side by Goose. We can't read the expiry from the client. If Goose has set it shorter or longer, we'll discover this empirically when the refresh fails.
