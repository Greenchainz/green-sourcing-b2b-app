import { useState } from 'react';
import { Link } from 'react-router-dom';

export function NetworkBoard() {
    const [activeChannel, setActiveChannel] = useState('general');

    const channels = [
        { id: 'general', name: 'General Discussion', count: 247 },
        { id: 'architects', name: 'Architect Corner', count: 89 },
        { id: 'suppliers', name: 'Supplier Announcements', count: 156 },
        { id: 'expert-qa', name: 'Expert Q&A', count: 42 },
        { id: 'standards', name: 'Standardization Program', count: 28 }
    ];

    const messages = [
        {
            id: 1,
            author: 'Sarah Chen',
            role: 'Architect',
            avatar: '👩‍💼',
            content: 'Has anyone worked with cross-laminated timber (CLT) for mid-rise buildings? Looking for supplier recommendations with FSC certification.',
            timestamp: '2 hours ago',
            replies: 12,
            likes: 24
        },
        {
            id: 2,
            author: 'EcoSteel Industries',
            role: 'Supplier - Founding 50',
            avatar: '🏭',
            content: '🎉 Excited to announce: We just achieved B Corp certification! All our recycled steel products now carry dual FSC + B Corp credentials. AMA about the process!',
            timestamp: '5 hours ago',
            replies: 34,
            likes: 89,
            isPinned: true
        },
        {
            id: 3,
            author: 'Marcus Rivera',
            role: 'Sustainability Consultant',
            avatar: '🌱',
            content: 'Question for the group: What\'s the biggest barrier to adopting circular materials in your projects? Cost? Availability? Certification complexity?',
            timestamp: '1 day ago',
            replies: 56,
            likes: 43
        }
    ];

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400" />
                            <span className="font-bold text-white">GreenChainz Network</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <button className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors">
                                New Post
                            </button>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-4 gap-6">
                    {/* Channels Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 sticky top-24">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Channels</h3>
                            <div className="space-y-1">
                                {channels.map((channel) => (
                                    <button
                                        key={channel.id}
                                        onClick={() => setActiveChannel(channel.id)}
                                        className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${activeChannel === channel.id
                                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">#{channel.name}</span>
                                            <span className="text-xs">{channel.count}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-800">
                                <h4 className="text-sm font-semibold text-slate-400 mb-3">Quick Stats</h4>
                                <div className="space-y-2">
                                    <div className="text-sm">
                                        <span className="text-slate-500">Online Now:</span>
                                        <span className="text-white font-medium ml-2">127</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-slate-500">Total Members:</span>
                                        <span className="text-white font-medium ml-2">1,842</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Feed */}
                    <div className="lg:col-span-3">
                        <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30">
                            <h2 className="text-xl font-bold text-white mb-2">💡 Welcome to the GreenChainz Network</h2>
                            <p className="text-slate-300 text-sm">
                                Connect with architects, suppliers, and sustainability experts. Share insights, ask questions,
                                and collaborate on building a greener future.
                            </p>
                        </div>

                        {/* Post Composer */}
                        <div className="mb-6 p-6 rounded-2xl bg-slate-900 border border-slate-800">
                            <textarea
                                placeholder="Share your thoughts, ask a question, or announce a product..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                                rows={3}
                            />
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex gap-2">
                                    <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                    <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                    </button>
                                </div>
                                <button className="px-6 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors">
                                    Post
                                </button>
                            </div>
                        </div>

                        {/* Messages Feed */}
                        <div className="space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`p-6 rounded-2xl bg-slate-900 border transition-colors ${message.isPinned
                                            ? 'border-yellow-500/30 bg-yellow-500/5'
                                            : 'border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    {message.isPinned && (
                                        <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-3">
                                            📌 Pinned Post
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        <div className="text-4xl">{message.avatar}</div>
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h4 className="font-bold text-white">{message.author}</h4>
                                                    <p className="text-sm text-slate-400">
                                                        {message.role}
                                                        {message.role.includes('Founding 50') && (
                                                            <span className="ml-2 px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs">
                                                                🏆
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <span className="text-sm text-slate-500">{message.timestamp}</span>
                                            </div>

                                            <p className="text-slate-300 mb-4 leading-relaxed">{message.content}</p>

                                            <div className="flex items-center gap-6">
                                                <button className="flex items-center gap-2 text-slate-400 hover:text-sky-400 transition-colors">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                    </svg>
                                                    <span className="text-sm font-medium">{message.replies} replies</span>
                                                </button>

                                                <button className="flex items-center gap-2 text-slate-400 hover:text-pink-400 transition-colors">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                    </svg>
                                                    <span className="text-sm font-medium">{message.likes} likes</span>
                                                </button>

                                                <button className="text-slate-400 hover:text-slate-300 transition-colors ml-auto">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Load More */}
                        <div className="mt-6 text-center">
                            <button className="px-6 py-3 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white transition-colors">
                                Load More Posts
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
