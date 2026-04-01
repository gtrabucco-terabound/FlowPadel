import React from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { AdminDashboardClient } from '@/components/admin-dashboard-client';

export default async function AdminDashboard() {
  return <AdminDashboardClient initialEvents={[]} />;
}
