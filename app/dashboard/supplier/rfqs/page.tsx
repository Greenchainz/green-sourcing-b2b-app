'use client';

import React, { useEffect, useState } from 'react';
import { Search, MessageSquare, Filter, DollarSign } from 'lucide-react';

interface RFQ {
   id: string;
   project_name?: string;
   buyer_name?: string;
   product_name?: string;
   quantity?: number;
   unit?: string;
   status?: string;
   received_at?: string;
   created_at?: string;
   message?: string;
}

export default function RFQsPage() {
   const [rfqs, setRfqs] = useState<RFQ[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      fetch('/api/supplier/rfqs')
         .then(res => res.json())
         .then(data => {
            setRfqs(data);
            setLoading(false);
         });
   }, []);

   return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <div>
               <h2 className="text-2xl font-bold text-slate-900">RFQ Inbox</h2>
               <p className="text-slate-500">Manage incoming requests and send quotes.</p>
            </div>
         </div>

         {/* Search Bar */}
         <div className="flex gap-4">
            <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input
                  type="text"
                  placeholder="Search by project or buyer..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm shadow-sm"
               />
            </div>
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg flex items-center gap-2 text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
               <Filter size={18} /> Filters
            </button>
         </div>

         {/* RFQ List */}
         <div className="space-y-4">
            {loading ? (
               <div className="text-center p-8 text-slate-500">Loading RFQs...</div>
            ) : (
               rfqs.map((rfq) => {
                  const status = rfq.status ?? 'pending';
                  const badgeClass = status === 'pending'
                     ? 'bg-blue-50 text-blue-600 border-blue-100'
                     : status === 'quoted'
                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                        : 'bg-slate-50 text-slate-600 border-slate-100';
                  const receivedDate = new Date(rfq.received_at || rfq.created_at || Date.now()).toLocaleDateString();

                  return (
                     <div key={rfq.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-green-300 transition-all cursor-pointer group">
                        <div className="flex justify-between items-start">
                           <div>
                              <div className="flex items-center gap-3 mb-1">
                                 <h3 className="font-semibold text-lg text-slate-900 group-hover:text-green-700 transition-colors">
                                    {rfq.project_name}
                                 </h3>
                                 <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${badgeClass}`}>
                                    {status.toUpperCase()}
                                 </span>
                              </div>
                              <p className="text-slate-500 text-sm">from <span className="font-medium text-slate-700">{rfq.buyer_name}</span></p>
                           </div>
                           <div className="text-right">
                              <span className="text-xs text-slate-400 font-medium">Received</span>
                              <p className="text-sm font-medium text-slate-700">{receivedDate}</p>
                           </div>
                        </div>

                        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div>
                              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Product</span>
                              <p className="text-sm font-medium text-slate-900 mt-1">{rfq.product_name}</p>
                           </div>
                           <div>
                              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Quantity</span>
                              <p className="text-sm font-medium text-slate-900 mt-1">{rfq.quantity} {rfq.unit}</p>
                           </div>
                           <div>
                              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Message</span>
                              <p className="text-sm text-slate-600 mt-1 truncate">{rfq.message}</p>
                           </div>
                        </div>

                        <div className="mt-4 flex gap-3 justify-end">
                           <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors">
                              <MessageSquare size={16} /> Message
                           </button>
                           <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 shadow-sm transition-colors">
                              <DollarSign size={16} /> Send Quote
                           </button>
                        </div>
                     </div>
                  );
               })
            )}
         </div>
      </div>
   );
}
