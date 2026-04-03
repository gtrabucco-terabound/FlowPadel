import React from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { LandingClient } from '@/components/landing-client';
import { Event } from '@/lib/types';

/**
 * Server Component to fetch initial event data from Firestore.
 * Next.js 15 requires plain serializable data for props.
 */
export default async function LandingPage() {
  let events: Event[] = [];
  
  // Helper to convert Firestore Timestamps to plain ISO strings server-side
  const sanitizeData = (val: any): any => {
    if (val === null || val === undefined) return val;
    if (typeof val.toDate === 'function') return val.toDate().toISOString();
    if (typeof val === 'object' && typeof val.seconds === 'number' && typeof val.nanoseconds === 'number') {
      return new Date(val.seconds * 1000).toISOString();
    }
    if (Array.isArray(val)) return val.map(sanitizeData);
    if (typeof val === 'object' && (val.constructor.name === 'Object' || Object.getPrototypeOf(val) === Object.prototype)) {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(val)) {
        sanitized[key] = sanitizeData(value);
      }
      return sanitized;
    }
    return val;
  };

  try {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('public_visible', '==', true));
    const querySnapshot = await getDocs(q);
    
    events = querySnapshot.docs
      .map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...sanitizeData(doc.data())
      } as Event))
      .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
  } catch (err) {
    console.error('Unexpected error fetching events server-side:', err);
  }

  return <LandingClient initialEvents={events} />;
}
