import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Heart,
  Phone,
  Bell,
  MessageSquare,
  LayoutDashboard,
  User,
  Calendar,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  serverStatus?: 'online' | 'offline' | 'checking';
  databaseStatus?: any;
  onRefreshHealth?: () => void;
  isRefreshingHealth?: boolean;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { user } = useAuth();
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/reminders', label: 'Reminders', icon: Bell },
    { to: '/appointments', label: 'Appointments', icon: Calendar },
    { to: '/calls', label: 'Video Calls', icon: Phone },
    { to: '/chat', label: 'AI Companion', icon: MessageSquare },
  ];



  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Heart className="w-7 h-7 fill-white/20 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
                ElderCare<span className="text-brand-600 font-black">AI</span>
              </span>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Family Health & Wellness
              </span>
            </div>
          </Link>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-base font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 stroke-[2]" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-4">

            {user ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-800 text-sm font-semibold transition-colors border border-brand-200"
                title="Manage Profile & Contacts"
              >
                <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline">{user.name.split(' ')[0]}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-xs transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
