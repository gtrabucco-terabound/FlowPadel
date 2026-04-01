import React from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { RegistrationClient } from '@/components/registration-client';

export default async function RegistrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  let event = null;

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
    }
  } catch (err) {
    console.error('Unexpected error fetching event data server-side:', err);
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center">Evento no encontrado</div>;
  }

  return <RegistrationClient initialEvent={event} slug={slug} />;
}
