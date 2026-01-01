'use client'; // If using Next.js 13+ App Router

import { Link } from 'react-router-dom';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  BookmarkIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';


export default function BuyerDashboard() {
  // Placeholder data (replace with API calls in Phase 2)
  const user = {
    companyName: 'LPA Design Studios' // From Supabase auth + profile
  };

  const stats = {
    productsSaved: 12,
    rfqsSentThisMonth: 8,
    newVerifiedMaterials: 47
  };

  const recentActivity = [
    {
      id: 1,
      type: 'rfq_sent',
      message: 'You requested a quote for Warmcel Cellulose Insulation',
      timestamp: '2 days ago',
      link: '/dashboard/rfqs/123'
    },
    {
      id: 2,
      type: 'product_saved',
      message: 'You saved Greenfiber Low-VOC Flooring to your project',
      timestamp: '4 days ago',
      link: '/dashboard/saved'
    },
    {
      id: 3,
      type: 'new_material',
      message: '15 new FSC-certified roofing materials added',
      timestamp: '1 week ago',
      link: '/dashboard/search?category=roofing'
    }
  ];

  return (
    <div className="min-h-screen bg-background flex">

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-muted border-r border-border flex-shrink-0">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">GreenChainz</h2>
          <nav className="space-y-2">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-4 py-3 text-primary bg-primary/10 rounded-md font-medium"
            >
              <HomeIcon className="w-5 h-5" />
              Dashboard
            </Link>
            <Link
              to="/dashboard/search"
              className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
              Product Search
            </Link>
            <Link
              to="/dashboard/projects"
              className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
            >
              <FolderIcon className="w-5 h-5" />
              My Projects
            </Link>
            <Link
              to="/dashboard/saved"
              className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
            >
              <BookmarkIcon className="w-5 h-5" />
              Saved Materials
            </Link>
            <Link
              to="/dashboard/rfqs"
              className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
            >
              <DocumentTextIcon className="w-5 h-5" />
              RFQ History
            </Link>
            <Link
              to="/dashboard/settings"
              className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
            >
              <Cog6ToothIcon className="w-5 h-5" />
              Account Settings
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Dashboard Panel */}
      <main className="flex-1 p-8">

        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user.companyName}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your sustainable material sourcing.
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          {/* Stat 1: Products Saved */}
          <div className="bg-background border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BookmarkSolidIcon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-3xl font-bold text-foreground">{stats.productsSaved}</span>
            </div>
            <p className="text-sm text-muted-foreground">Products Saved</p>
          </div>

          {/* Stat 2: RFQs Sent This Month */}
          <div className="bg-background border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-3xl font-bold text-foreground">{stats.rfqsSentThisMonth}</span>
            </div>
            <p className="text-sm text-muted-foreground">RFQs Sent This Month</p>
          </div>

          {/* Stat 3: New Verified Materials */}
          <div className="bg-background border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <SparklesIcon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-3xl font-bold text-foreground">{stats.newVerifiedMaterials}</span>
            </div>
            <p className="text-sm text-muted-foreground">New Verified Materials</p>
          </div>

        </div>

        {/* Recent Activity Feed */}
        <div className="bg-background border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div className="flex-1">
                  <Link to={activity.link} className="text-foreground hover:text-primary transition-colors">
                    {activity.message}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
          {recentActivity.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No recent activity yet. Start by exploring materials!
            </p>
          )}
        </div>

      </main>

    </div>
  );
}
