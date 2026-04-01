import React from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { EventDetailClient } from '@/components/event-detail-client';

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  let event = null;
  let matches: any[] = [];
  let standings: any[] = [];
  let zones: any[] = [];

  // Helper to convert Firestore Timestamps to plain ISO strings
  const sanitizeData = (val: any): any => {
    if (val === null || val === undefined) return val;
    if (typeof val.toDate === 'function') return val.toDate().toISOString();
    if (typeof val === 'object' && typeof val.seconds === 'number' && typeof val.nanoseconds === 'number') {
      return new Date(val.seconds * 1000).toISOString();
    }
    if (Array.isArray(val)) return val.map(sanitizeData);
    if (typeof val === 'object' && (val.constructor.name === 'Object' || Object.getPrototypeOf(val) === Object.prototype)) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(val)) {
        sanitized[key] = sanitizeData(value);
      }
      return sanitized;
    }
    return val;
  };

  try {
    const eventsRef = collection(db, 'events');
    const eventQuery = query(eventsRef, where('slug', '==', slug), limit(1));
    const eventSnapshot = await getDocs(eventQuery);

    if (!eventSnapshot.empty) {
      const eventDoc = eventSnapshot.docs[0];
      event = { id: eventDoc.id, ...sanitizeData(eventDoc.data()) };
      
      // Fetch zones (Sorted in memory to avoid index requirement)
      const zonesRef = collection(db, 'zones');
      const zonesQuery = query(zonesRef, where('event_id', '==', event.id));
      const zonesSnapshot = await getDocs(zonesQuery);
      zones = zonesSnapshot.docs
        .map(d => ({ id: d.id, ...sanitizeData(d.data()) }))
        .sort((a, b) => (a.stage_order || 0) - (b.stage_order || 0));

      // Fetch matches (Sorted in memory to avoid index requirement)
      const matchesRef = collection(db, 'matches');
      const matchesQuery = query(matchesRef, where('event_id', '==', event.id));
      const matchesSnapshot = await getDocs(matchesQuery);
      matches = matchesSnapshot.docs
        .map(d => ({ id: d.id, ...sanitizeData(d.data()) }))
        .sort((a, b) => {
          const dateA = a.scheduled_at || '';
          const dateB = b.scheduled_at || '';
          return dateA.localeCompare(dateB);
        });

      // Fetch standings (Sorted in memory to avoid index requirement)
      const standingsRef = collection(db, 'standings');
      const standingsQuery = query(standingsRef, where('event_id', '==', event.id));
      const standingsSnapshot = await getDocs(standingsQuery);
      standings = standingsSnapshot.docs
        .map(d => ({ id: d.id, ...sanitizeData(d.data()) }))
        .sort((a, b) => {
          if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0);
          return (b.games_diff || 0) - (a.games_diff || 0);
        });
    }
  } catch (err) {
    console.error('Unexpected error fetching event data server-side:', err);
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center">Evento no encontrado</div>;
  }

  return (
    <EventDetailClient 
      initialEvent={event}
      initialMatches={matches}
      initialStandings={standings}
      initialZones={zones}
      slug={slug}
    />
  );
}
