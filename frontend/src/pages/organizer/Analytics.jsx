import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- Animated Value Component for Stats ---
const StatValue = ({ value, duration = 1000, decimals = 0 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
        let startTime;
        const startValue = displayValue;
        const diff = value - startValue;
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(startValue + diff * easeOut);
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value]);
    return <span>{displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
};

const Analytics = () => {
    // --- State Management ---
    const [timeRange, setTimeRange] = useState(() => sessionStorage.getItem('analytics_timeRange') || '30days');
    const [growthPeriod, setGrowthPeriod] = useState(() => sessionStorage.getItem('analytics_growthPeriod') || 'weekly');
    const [isLoading, setIsLoading] = useState(true);

    const [stats, setStats] = useState([]);
    const [growthData, setGrowthData] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [loadError, setLoadError] = useState('');

    // --- Persistence ---
    useEffect(() => {
        sessionStorage.setItem('analytics_timeRange', timeRange);
        sessionStorage.setItem('analytics_growthPeriod', growthPeriod);
    }, [timeRange, growthPeriod]);

    // Analytics endpoints are not connected for this view yet.
    useEffect(() => {
        setStats([]);
        setGrowthData([]);
        setReviews([]);
        setRegistrations([]);
        setLoadError('Analytics data is unavailable from the current service.');
        setIsLoading(false);
    }, [timeRange, growthPeriod]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
                    <p className="text-sm text-gray-400">Track key metrics and platform growth</p>
                    {loadError && <p role="status" className="mt-3 text-sm text-amber-300">{loadError}</p>}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                        {['7days', '30days', '90days'].map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                                    timeRange === range
                                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                                        : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                {range.replace('days', 'd')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoading ? (
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="glass h-32 rounded-xl border border-white/5 animate-pulse"></div>
                    ))
                ) : (
                    stats.map((stat, idx) => (
                        <div key={idx} className="glass p-6 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-2xl">{stat.icon}</span>
                                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                                    stat.isPositive
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                    {stat.change}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mb-1">{stat.title}</p>
                            <p className="text-2xl font-bold text-white">
                                <StatValue value={stat.value} decimals={stat.decimals || 0} />
                            </p>
                        </div>
                    ))
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Growth Chart */}
                <div className="lg:col-span-2 glass rounded-xl border border-white/5 flex flex-col">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-white mb-1">Growth Trend</h2>
                            <p className="text-sm text-gray-400">User acquisition over time</p>
                        </div>
                        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                            {['daily', 'weekly'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setGrowthPeriod(p)}
                                    className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                                        growthPeriod === p
                                            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                                            : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-8 flex-1 flex items-end justify-between gap-3 h-64" key={`${timeRange}-${growthPeriod}`}>
                        {growthData.map((v, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-3 group h-full justify-end animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${i * 80}ms` }}>
                                <div className="relative w-full flex justify-center items-end h-full">
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-gray-900 text-xs font-semibold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 shadow-lg pointer-events-none">
                                        {v}
                                    </div>
                                    <div
                                        className="w-full max-w-6 rounded-t-lg transition-all duration-700 ease-out cursor-pointer bg-gradient-to-t from-cyan-600/40 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 hover:shadow-lg hover:shadow-cyan-500/30"
                                        style={{ height: `${(v / Math.max(...growthData)) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="text-xs text-gray-400 font-medium">
                                    {growthPeriod === 'daily' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i % 7] : `W${i + 1}`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reviews Section */}
                <div className="glass rounded-xl border border-white/5 flex flex-col">
                    <div className="p-6 border-b border-white/5">
                        <h2 className="text-lg font-bold text-white mb-1">Feedback</h2>
                        <p className="text-sm text-gray-400">Recent user reviews</p>
                    </div>
                    <div className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                        {reviews.map(review => (
                            <div key={review.id} className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5 space-y-2 group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-xs font-semibold text-cyan-400">
                                            {review.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{review.name}</p>
                                            <p className="text-xs text-gray-500">{review.role}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-amber-400 font-semibold">★ {review.rating}</span>
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed">"{review.feedback}"</p>
                                <p className="text-xs text-gray-600 pt-2 border-t border-white/5">{review.time}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Registrations */}
            <div className="glass rounded-xl border border-white/5">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white mb-1">Recent Registrations</h2>
                        <p className="text-sm text-gray-400">Latest platform access</p>
                    </div>
                    <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/5 transition-all active:scale-95">
                        View All
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 label-protocol uppercase">
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {registrations.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">No registration data available.</td></tr>
                            ) : registrations.map(user => (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-semibold text-gray-400">
                                                {user.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">{user.name}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-medium text-gray-400">{user.role}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs text-gray-500">{user.time}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                            user.status === 'verified'
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-amber-500/10 text-amber-400 animate-pulse'
                                        }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                user.status === 'verified' ? 'bg-emerald-500' : 'bg-amber-500'
                                            }`}></div>
                                            {user.status === 'verified' ? 'Verified' : 'Pending'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
