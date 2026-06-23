'use client';

export type EventName =
  | 'public_trip_viewed'
  | 'public_trip_saved'
  | 'public_trip_unsaved'
  | 'public_trip_cloned'
  | 'public_trip_shared'
  | 'affiliate_clicked'
  | 'explore_card_clicked';

export interface TrackEventProps {
  event:   EventName;
  roomId?: string;
  userId?: string | null;
  meta?:   Record<string, string | number | boolean | null>;
}

export function trackEvent(props: TrackEventProps): void {
  fetch('/api/events', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(props),
  }).catch(() => {});
}
