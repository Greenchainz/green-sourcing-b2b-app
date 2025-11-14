import { RFQ } from '../types';

export function RfqsTab({ rfqs }: { rfqs: RFQ[] }) {
    return (
        <div>
            <h2 className="text-2xl font-bold text-white mb-6">Recent RFQs</h2>
            <div className="space-y-4">
                {rfqs.map((rfq, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">{rfq.company}</h3>
                                <p className="text-slate-400 text-sm">{rfq.project}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${rfq.status === 'New' ? 'bg-sky-500/10 border border-sky-500/30 text-sky-400' :
                                    rfq.status === 'Responded' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
                                        'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                                }`}>
                                {rfq.status}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Product: {rfq.product}</span>
                            <span className="text-slate-500">{rfq.date}</span>
                        </div>
                        <div className="mt-4 flex gap-3">
                            <button className="flex-1 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors">
                                Respond
                            </button>
                            <button className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 transition-colors">
                                View Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
