"use client";

import { useState } from "react";
import {
  Settings,
  Bell,
  Shield,
  CreditCard,
  Users,
  Globe,
  Save,
  Loader2,
  CheckCircle,
} from "lucide-react";

export default function SupplierSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("notifications");

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = [
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "team", label: "Team", icon: Users },
    { id: "integrations", label: "Integrations", icon: Globe },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600">
          Manage your account settings and preferences.
        </p>
      </div>

      {saved && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Settings saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeTab === tab.id
                    ? "bg-forest-50 text-forest-700 border-l-4 border-forest-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            {activeTab === "notifications" && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Bell className="h-5 w-5 text-forest-600" />
                  <h2 className="font-semibold text-slate-900">
                    Notification Preferences
                  </h2>
                </div>

                <div className="space-y-6">
                  <ToggleSetting
                    title="New RFQ Alerts"
                    description="Get notified when you receive a new RFQ matching your products"
                    defaultChecked={true}
                  />
                  <ToggleSetting
                    title="Quote Updates"
                    description="Receive updates when buyers respond to your quotes"
                    defaultChecked={true}
                  />
                  <ToggleSetting
                    title="Profile Views"
                    description="Weekly summary of who viewed your profile"
                    defaultChecked={false}
                  />
                  <ToggleSetting
                    title="Marketing Emails"
                    description="Tips and best practices for sustainable sourcing"
                    defaultChecked={true}
                  />
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Shield className="h-5 w-5 text-forest-600" />
                  <h2 className="font-semibold text-slate-900">
                    Privacy Settings
                  </h2>
                </div>

                <div className="space-y-6">
                  <ToggleSetting
                    title="Public Profile"
                    description="Allow your company profile to appear in search results"
                    defaultChecked={true}
                  />
                  <ToggleSetting
                    title="Show Contact Info"
                    description="Display contact information to verified buyers"
                    defaultChecked={true}
                  />
                  <ToggleSetting
                    title="Analytics Sharing"
                    description="Share anonymized data to improve platform recommendations"
                    defaultChecked={false}
                  />
                </div>
              </div>
            )}

            {activeTab === "billing" && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard className="h-5 w-5 text-forest-600" />
                  <h2 className="font-semibold text-slate-900">
                    Billing & Subscription
                  </h2>
                </div>

                <div className="p-4 bg-forest-50 border border-forest-200 rounded-lg mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-forest-900">
                        Professional Plan
                      </p>
                      <p className="text-sm text-forest-700">
                        Unlimited products, priority support
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-forest-900">
                      $99/mo
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded" />
                        <div>
                          <p className="font-medium text-slate-900">
                            •••• •••• •••• 4242
                          </p>
                          <p className="text-sm text-slate-500">Expires 12/26</p>
                        </div>
                      </div>
                      <button className="text-sm text-forest-600 hover:text-forest-700 font-medium">
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "team" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-forest-600" />
                    <h2 className="font-semibold text-slate-900">
                      Team Members
                    </h2>
                  </div>
                  <button className="px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white font-medium rounded-lg text-sm">
                    Invite Member
                  </button>
                </div>

                <div className="space-y-4">
                  <TeamMember
                    name="John Doe"
                    email="john@company.com"
                    role="Admin"
                  />
                  <TeamMember
                    name="Jane Smith"
                    email="jane@company.com"
                    role="Editor"
                  />
                  <TeamMember
                    name="Bob Wilson"
                    email="bob@company.com"
                    role="Viewer"
                  />
                </div>
              </div>
            )}

            {activeTab === "integrations" && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Globe className="h-5 w-5 text-forest-600" />
                  <h2 className="font-semibold text-slate-900">
                    Integrations
                  </h2>
                </div>

                <div className="space-y-4">
                  <IntegrationCard
                    name="ERP System"
                    description="Sync product data with your ERP"
                    connected={true}
                  />
                  <IntegrationCard
                    name="Salesforce"
                    description="Export leads and opportunities"
                    connected={false}
                  />
                  <IntegrationCard
                    name="Slack"
                    description="Get notifications in Slack"
                    connected={true}
                  />
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({
  title,
  description,
  defaultChecked,
}: {
  title: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? "bg-forest-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function TeamMember({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-forest-100 flex items-center justify-center text-forest-700 font-medium">
          {name.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-slate-900">{name}</p>
          <p className="text-sm text-slate-500">{email}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
          {role}
        </span>
        <button className="text-slate-400 hover:text-slate-600">
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function IntegrationCard({
  name,
  description,
  connected,
}: {
  name: string;
  description: string;
  connected: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
          <Globe className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <p className="font-medium text-slate-900">{name}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <button
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          connected
            ? "bg-green-100 text-green-700 hover:bg-green-200"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        {connected ? "Connected" : "Connect"}
      </button>
    </div>
  );
}
