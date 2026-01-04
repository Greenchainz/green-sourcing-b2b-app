"use client";

import React from "react";

export default function BuyerSettings() {
  return (
    <div className="gc-page min-h-screen p-6 md:p-10">
      <div className="gc-container max-w-4xl">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">
          Account Settings
        </h1>

        {/* Profile Section */}
        <div className="gc-card p-0 overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">
              Profile Information
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Manage your public profile and contact details.
            </p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded-lg flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl">
                JD
              </div>
              <div>
                <div className="font-bold text-slate-900">John Doe</div>
                <div className="text-sm text-slate-500">
                  Architect • Lead Buyer
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="gc-label" htmlFor="organization">
                  Organization
                </label>
                <input
                  id="organization"
                  type="text"
                  className="gc-input"
                  defaultValue="Green Build Architects LLC"
                />
              </div>
              <div>
                <label className="gc-label" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className="gc-input"
                  defaultValue="john.doe@example.com"
                  disabled
                />
              </div>
            </div>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
            <button className="gc-btn gc-btn-primary">Save Changes</button>
          </div>
        </div>

        {/* Verification Status */}
        <div className="gc-card p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            Verification Status
          </h2>

          <div className="space-y-4">
            {/* LinkedIn */}
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0077b5] rounded flex items-center justify-center text-white font-bold text-xl">
                  in
                </div>
                <div>
                  <div className="font-bold text-slate-800">
                    LinkedIn Verified
                  </div>
                  <div className="text-xs text-slate-500">
                    Connected on Jan 15, 2024
                  </div>
                </div>
              </div>
              <span className="text-emerald-600 font-bold text-sm flex items-center gap-1">
                ✓ Connected
              </span>
            </div>

            {/* Deposit */}
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded flex items-center justify-center text-emerald-600">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    ></path>
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-slate-800">
                    Security Deposit
                  </div>
                  <div className="text-xs text-slate-500">
                    Required for awarding high-value RFQs.
                  </div>
                </div>
              </div>
              <span className="text-emerald-600 font-bold text-sm flex items-center gap-1">
                ✓ Verified ($25.00)
              </span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="gc-card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            Notification Preferences
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 accent-emerald-600"
                defaultChecked
              />
              <span className="text-slate-700 font-medium">
                Email me when a new quote is received
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 accent-emerald-600"
                defaultChecked
              />
              <span className="text-slate-700 font-medium">
                Email me about RFQ status updates
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 accent-emerald-600" />
              <span className="text-slate-700 font-medium">
                Marketing and feature announcements
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
