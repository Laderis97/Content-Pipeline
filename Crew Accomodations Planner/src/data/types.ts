export type IATA = string;
export type UUID = string;

export interface FlightLeg { 
  flightNo: string; 
  carrier: string; 
  depIata: IATA; 
  arrIata: IATA; 
  depUtc: string; 
  arrUtc: string; 
  equipment?: string; 
}

export interface CrewPairing { 
  id: UUID; 
  airlineId: UUID; 
  crewSize: number; 
  legs: FlightLeg[]; 
}

export interface HotelRate { 
  hotelId: UUID; 
  currency: 'USD'; 
  nightly: number; 
  taxesFees?: number; 
}

export interface HotelCandidate { 
  id: UUID; 
  name: string; 
  brand?: string; 
  lat: number; 
  lon: number; 
  address?: string; 
  city?: string; 
  rating?: number; 
  reviews?: number; 
  rate?: HotelRate; 
  distanceKm?: number; 
  etaMinutes?: number; 
  notes?: string[]; 
}

export interface Constraints { 
  maxCommuteMinutes?: number; 
  minHotelRating?: number; 
  maxNightlyUsd?: number; 
  preferredBrands?: string[]; 
  minReviews?: number; 
  minRestHours?: number; 
  sameHotelForCrew?: boolean; 
}

export interface DecisionRecord { 
  stage: string; 
  subjectId?: string; 
  outcome: 'accept'|'reject'|'score'; 
  score?: number; 
  reasons: string[]; 
  details?: Record<string, unknown>; 
}

export interface PlanResult { 
  city: string; 
  arrAirport: IATA; 
  candidates: HotelCandidate[]; 
  chosen?: HotelCandidate; 
  audit: DecisionRecord[]; 
}
