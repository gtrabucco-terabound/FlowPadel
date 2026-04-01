import React from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { EventManagementClient } from '@/components/event-management-client';

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

export default async function EventManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const eventDoc = await getDoc(doc(db, 'events', id));
  const event = eventDoc.exists() ? { id: eventDoc.id, ...sanitizeData(eventDoc.data()) } : null;

  return (
    <EventManagementClient 
      initialEvent={event}
      initialRegistrations={[]}
      initialTeams={[]}
      initialZones={[]}
      initialMatches={[]}
    />
  );
}
