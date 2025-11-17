import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import Logo from '../Logo';

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard/supplier', icon: HomeIcon },
    { name: 'My Products', path: '/dashboard/supplier/products', icon: CubeIcon },
    { name: 'RFQ History', path: '/dashboard/supplier/rfqs', icon: DocumentTextIcon },
    { name: 'Settings', path: '/dashboard/supplier/settings', icon: Cog6ToothIcon }
  ];

  return (
    <aside className="w-64 bg-muted border-r border-border flex-shrink-0">
      <div className="p-6">
        <div className='mb-6'>
          <Logo height={40} showText={true}/>
        </div>
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
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
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
