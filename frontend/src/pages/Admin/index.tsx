import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserGroupIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import AdminSidebar from '../../components/Admin/AdminSidebar';

// MOCK DATA (replace with Supabase query in Phase 1)
const MOCK_STATS = {
  pendingSuppliers: 5,
  pendingProducts: 12,
  totalUsers: 143,
  totalRFQs: 87
};

export default function AdminDashboard() {
  const [stats] = useState(MOCK_STATS);

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Admin Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          {/* Pending Suppliers */}
          <Link to="/admin/content?type=suppliers" className="bg-background border border-border rounded-lg p-6 hover:bg-muted transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <BuildingStorefrontIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-3xl font-bold text-foreground">{stats.pendingSuppliers}</span>
            </div>
            <p className="text-sm text-muted-foreground">Pending Suppliers</p>
          </Link>

          {/* Pending Products */}
          <Link to="/admin/content?type=products" className="bg-background border border-border rounded-lg p-6 hover:bg-muted transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <DocumentTextIcon className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-3xl font-bold text-foreground">{stats.pendingProducts}</span>
            </div>
            <p className="text-sm text-muted-foreground">Pending Products</p>
          </Link>

          {/* Total Users */}
          <Link to="/admin/users" className="bg-background border border-border rounded-lg p-6 hover:bg-muted transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <UserGroupIcon className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-3xl font-bold text-foreground">{stats.totalUsers}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </Link>

          {/* Total RFQs */}
          <Link to="/admin/analytics" className="bg-background border border-border rounded-lg p-6 hover:bg-muted transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-3xl font-bold text-foreground">{stats.totalRFQs}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total RFQs</p>
          </Link>

        </div>

        {/* Recent Activity */}
        <div className="bg-background border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <p className="text-sm text-foreground">New supplier registration: <span className="font-medium">Warmcel Insulation Ltd</span></p>
              <span className="text-xs text-muted-foreground ml-auto">2 hours ago</span>
            </div>
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <p className="text-sm text-foreground">New product submitted: <span className="font-medium">Greenfiber Low-VOC Flooring</span></p>
              <span className="text-xs text-muted-foreground ml-auto">5 hours ago</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm text-foreground">Product approved: <span className="font-medium">Warmcel Cellulose Insulation</span></p>
              <span className="text-xs text-muted-foreground ml-auto">1 day ago</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
