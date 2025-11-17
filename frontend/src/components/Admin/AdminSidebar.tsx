import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  DocumentCheckIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function AdminSidebar() {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: HomeIcon },
    { name: 'Content Moderation', path: '/admin/content', icon: DocumentCheckIcon },
    { name: 'User Management', path: '/admin/users', icon: UserGroupIcon },
    { name: 'Analytics', path: '/admin/analytics', icon: ChartBarIcon }
  ];

  return (
    <aside className="w-64 bg-muted border-r border-border flex-shrink-0">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">Admin Panel</h2>
        <p className="text-sm text-muted-foreground mb-6">Content Moderation</p>
        <nav className="space-y-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-colors ${
                  isActive
                    ? 'text-primary bg-primary-light'
                    : 'text-muted-foreground hover:text-primary hover:bg-primary-light'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
