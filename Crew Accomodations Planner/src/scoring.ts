import { HotelCandidate } from './data/types';

export function scoreHotel(h: HotelCandidate) {
  const eta = h.etaMinutes ?? 100;
  const rating = h.rating ?? 0;
  const nightly = h.rate?.nightly ?? 200;
  return (100 - eta) + rating * 10 - nightly / 10;
}
