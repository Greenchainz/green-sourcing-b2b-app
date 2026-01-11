import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  FileText,
  Award,
  BarChart3,
  Settings,
  Bell,
  Search,
  User
} from 'lucide-react';

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-50">
      <style>{`
        .gc-header, .gc-footer { display: none !important; }
      `}</style>
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-slate-900">
              G
            </div>
            GreenChainz
          </h1>
          <p className="text-xs text-slate-500 mt-2 uppercase tracking-wider font-semibold">Supplier Workspace</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem href="/dashboard/supplier" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem href="/dashboard/supplier/rfqs" icon={<FileText size={20} />} label="RFQs" badge="3" />
          <NavItem href="/dashboard/supplier/products" icon={<Package size={20} />} label="Products" />
          <NavItem href="/dashboard/supplier/certifications" icon={<Award size={20} />} label="Certifications" />
          <NavItem href="/dashboard/supplier/analytics" icon={<BarChart3 size={20} />} label="Analytics" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <NavItem href="/dashboard/supplier/settings" icon={<Settings size={20} />} label="Settings" />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-4 flex-1">
             <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search RFQs, Products..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-md focus:ring-2 focus:ring-green-500 outline-none text-sm"
                />
             </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-slate-500 hover:text-slate-700">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <div className="text-sm font-medium text-slate-900">Acme Suppliers</div>
                <div className="text-xs text-slate-500">Verified Partner</div>
              </div>
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600">
                <User size={20} />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, badge }: { href: string; icon: React.ReactNode; label: string; badge?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <span className="group-hover:text-green-400 transition-colors">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      {badge && (
        <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}
