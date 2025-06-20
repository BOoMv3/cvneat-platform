import './globals.css';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';
import { ThemeProvider } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'CVNeat - Livraison de repas',
  description: 'Commandez vos plats préférés et faites-vous livrer rapidement',
  keywords: 'livraison, repas, restaurant, food delivery',
};

export default function RootLayout({ children }) {
  if (typeof window !== 'undefined') {
    window.supabase = supabase;
  }

  return (
    <html lang="fr" className="scroll-smooth">
      <body className={`${inter.className} transition-colors duration-300`}>
        <ThemeProvider>
          <Navbar />
          {children}
          <Footer />
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
