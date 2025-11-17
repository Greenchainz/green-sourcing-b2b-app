import React from 'react';
import { Link } from 'react-router-dom';
import {
  CubeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import Sidebar from '../../components/SupplierDashboard/Sidebar';

// MOCK DATA (replace with Supabase query in Phase 1)
const MOCK_STATS = {
  totalProducts: 12,
  rfqsReceived: 8,
  profileViews: 143
};

const MOCK_RECENT_ACTIVITY = [
  {
    id: 1,
    type: 'rfq',
    message: 'New RFQ received for Warmcel Insulation',
    timestamp: '2 hours ago'
  },
  {
    id: 2,
    type: 'view',
    message: 'LPA Design Studios viewed your profile',
    timestamp: '1 day ago'
  },
  {
    id: 3,
    type: 'product',
    message: 'You published Greenfiber Low-VOC Flooring',
    timestamp: '3 days ago'
  }
];

export default function SupplierDashboard() {
  return (
    <div className="min-h-screen bg-background flex">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-8">

        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, Warmcel Insulation Ltd
          </h1>
          <p className="text-muted-foreground">
            Manage your products and connect with qualified buyers.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex gap-4">
          <Link
            to="/dashboard/supplier/products/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add New Product
          </Link>
          <Link
            to="/dashboard/supplier/products"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors"
          >
            Manage Products
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          {/* Stat 1: Total Products */}
          <div className="bg-background border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <CubeIcon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-3xl font-bold text-foreground">{MOCK_STATS.totalProducts}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Products</p>
          </div>

          {/* Stat 2: RFQs Received */}
          <div className="bg-background border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <DocumentTextIcon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-3xl font-bold text-foreground">{MOCK_STATS.rfqsReceived}</span>
            </div>
            <p className="text-sm text-muted-foreground">RFQs This Month</p>
          </div>

          {/* Stat 3: Profile Views */}
          <div className="bg-background border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-3xl font-bold text-foreground">{MOCK_STATS.profileViews}</span>
            </div>
            <p className="text-sm text-muted-foreground">Profile Views</p>
          </div>

        </div>

        {/* Recent Activity Feed */}
        <div className="bg-background border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {MOCK_RECENT_ACTIVITY.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-foreground">{activity.message}</p>
                  <p className="text-sm text-muted-foreground mt-1">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

    </div>
  );
}
