import React from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { LandingClient } from '@/components/landing-client';

export default async function LandingPage() {
  let events: any[] = [];
  
  try {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('public_visible', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Helper to convert Firestore Timestamps to plain ISO strings
    const sanitizeData = (val: any): any => {
      if (val === null || val === undefined) return val;
      
      // Handle Firestore Timestamps (both class instances and plain objects)
      if (typeof val.toDate === 'function') {
        return val.toDate().toISOString();
      }
      if (typeof val === 'object' && typeof val.seconds === 'number' && typeof val.nanoseconds === 'number') {
        return new Date(val.seconds * 1000).toISOString();
      }
      
      if (Array.isArray(val)) {
        return val.map(sanitizeData);
      }
      
      if (typeof val === 'object' && val.constructor.name === 'Object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(val)) {
          sanitized[key] = sanitizeData(value);
        }
        return sanitized;
      }
      
      // If it's a plain object but constructor name isn't 'Object' (can happen with some Firestore versions)
      if (typeof val === 'object' && Object.getPrototypeOf(val) === Object.prototype) {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(val)) {
          sanitized[key] = sanitizeData(value);
        }
        return sanitized;
      }
      
      return val;
    };

    events = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...sanitizeData(doc.data())
      }))
      .sort((a: any, b: any) => {
        const dateA = a.start_date || '';
        const dateB = b.start_date || '';
        return dateA.localeCompare(dateB);
      });
  } catch (err) {
    console.error('Unexpected error fetching events server-side:', err);
  }

  return <LandingClient initialEvents={events} />;
}
