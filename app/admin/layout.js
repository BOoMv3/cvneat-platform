'use client';

import { AdminAccessProvider } from '../../components/AdminAccessContext';

export default function AdminLayout({ children }) {
  return <AdminAccessProvider>{children}</AdminAccessProvider>;
}
