'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import {
  FaChartBar,
  FaFileInvoice,
  FaMotorcycle,
  FaShoppingCart,
  FaStore,
  FaBuilding,
  FaSignOutAlt,
} from 'react-icons/fa';

const NAV = [
  { href: '/comptable', label: 'Tableau de bord', icon: FaChartBar, exact: true },
  { href: '/comptable/factures-restaurants', label: 'Factures restaurants', icon: FaFileInvoice },
  { href: '/comptable/factures-livreurs', label: 'Factures livreurs', icon: FaMotorcycle },
  { href: '/comptable/commandes', label: 'Commandes livrées', icon: FaShoppingCart },
  { href: '/comptable/partenaires', label: 'Partenaires (légal)', icon: FaStore },
  { href: '/comptable/entreprise', label: 'CVN\'EAT (émetteur)', icon: FaBuilding },
];

export default function ComptableShell({ children, userEmail }) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (item) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden lg:flex w-64 flex-col bg-slate-900 text-white shrink-0">
        <div className="p-6 border-b border-slate-700">
          <p className="text-xs uppercase tracking-wider text-slate-400">Espace comptabilité</p>
          <h1 className="text-lg font-bold mt-1">CVN&apos;EAT</h1>
          {userEmail ? <p className="text-xs text-slate-400 mt-2 truncate">{userEmail}</p> : null}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <FaSignOutAlt />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <span className="font-semibold">Comptabilité CVN&apos;EAT</span>
          <button type="button" onClick={logout} className="text-sm text-slate-300">
            Déconnexion
          </button>
        </header>
        <div className="lg:hidden overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 flex gap-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium ${
                isActive(item) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
