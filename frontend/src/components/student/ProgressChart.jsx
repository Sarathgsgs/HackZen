import React, { useMemo, useState } from 'react';

const formatDay = (value) => new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short',
}).format(new Date(value));

const normaliseHistory = (teams) => {
    const byDay = new Map();

    teams.forEach((team) => {
        const history = Array.isArray(team.progressHistory) ? team.progressHistory : [];
        history.forEach((point) => {
            const date = new Date(point.updatedAt);
            const percentage = Number(point.percentage);
            if (Number.isNaN(date.valueOf()) || Number.isNaN(percentage)) return;
            const key = date.toISOString().slice(0, 10);
            const values = byDay.get(key) || [];
            values.push(Math.max(0, Math.min(100, percentage)));
            byDay.set(key, values);
        });

        // Older progress records may pre-date history support. Their latest
        // percentage is still a real value, so it is displayed as one point.
        if (!history.length && Number(team.progress) > 0 && team.lastUpdated) {
            const date = new Date(team.lastUpdated);
            if (!Number.isNaN(date.valueOf())) {
                const key = date.toISOString().slice(0, 10);
                const values = byDay.get(key) || [];
                values.push(Math.min(100, Number(team.progress)));
                byDay.set(key, values);
            }
        }
    });

    return [...byDay.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(-7)
        .map(([date, values]) => ({
            date,
            label: formatDay(`${date}T00:00:00`),
            value: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
        }));
};

export default function ProgressChart({ teams }) {
    const [hoveredPoint, setHoveredPoint] = useState(null);
    const points = useMemo(() => normaliseHistory(teams), [teams]);
    const currentValues = teams
        .map((team) => Number(team.progress))
        .filter((value) => Number.isFinite(value) && value > 0);
    const currentProgress = currentValues.length
        ? Math.round(currentValues.reduce((sum, value) => sum + value, 0) / currentValues.length)
        : null;

    if (!points.length || currentProgress === null) {
        return (
            <section className="glass-strong rounded-[2rem] border border-white/10 p-8 shadow-2xl bg-navy-950/20">
                <h2 className="text-xl font-bold text-white">My Progress</h2>
                <p className="mt-1 text-sm text-gray-400">Your completed task progress will appear here.</p>
                <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
                    <div className="text-3xl" aria-hidden="true">📈</div>
                    <p className="mt-3 font-semibold text-gray-300">No progress yet</p>
                    <p className="mt-1 text-sm text-gray-500">Complete or update a task to start tracking your progress.</p>
                </div>
            </section>
        );
    }

    const chartPoints = points.map((point, index) => {
        const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
        return { ...point, x, y: 100 - point.value };
    });
    const linePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');
    const areaPoints = `0,100 ${linePoints} 100,100`;

    return (
        <section className="glass-strong rounded-[2rem] border border-white/10 p-6 sm:p-8 shadow-2xl bg-navy-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">My Progress</h2>
                    <p className="mt-1 text-sm text-gray-400">Task completion trend from your team activity.</p>
                </div>
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-left sm:text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200">Current progress</p>
                    <p className="mt-1 text-3xl font-black tabular-nums text-white">{currentProgress}%</p>
                </div>
            </div>

            <div className="mt-7 overflow-x-auto pb-2">
                <div className="relative h-64 min-w-[420px] rounded-2xl border border-white/10 bg-black/20 px-8 pb-9 pt-6">
                    <div className="pointer-events-none absolute inset-x-8 top-6 bottom-9 flex flex-col justify-between">
                        {[100, 75, 50, 25, 0].map((value) => (
                            <div key={value} className="relative border-t border-dashed border-white/10">
                                <span className="absolute -left-7 -top-2.5 text-[10px] font-medium text-gray-500">{value}%</span>
                            </div>
                        ))}
                    </div>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="relative z-10 h-full w-full overflow-visible" role="img" aria-label="Progress percentage by day">
                        <defs>
                            <linearGradient id="student-progress-area" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.36" />
                                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <polygon points={areaPoints} fill="url(#student-progress-area)" />
                        <polyline points={linePoints} fill="none" stroke="#22d3ee" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                        {chartPoints.map((point, index) => (
                            <circle
                                key={point.date}
                                cx={point.x}
                                cy={point.y}
                                r="2.3"
                                fill="#fff"
                                stroke="#22d3ee"
                                strokeWidth="1.5"
                                vectorEffect="non-scaling-stroke"
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredPoint(index)}
                                onMouseLeave={() => setHoveredPoint(null)}
                                onFocus={() => setHoveredPoint(index)}
                                onBlur={() => setHoveredPoint(null)}
                                tabIndex="0"
                                aria-label={`${point.label}: ${point.value}%`}
                            ><title>{`${point.label}: ${point.value}%`}</title></circle>
                        ))}
                    </svg>
                    {hoveredPoint !== null && (
                        <div
                            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-cyan-300/30 bg-slate-950 px-3 py-2 text-xs font-bold text-white shadow-xl"
                            style={{ left: `${8 + (chartPoints[hoveredPoint].x * 0.84)}%`, top: `${24 + (chartPoints[hoveredPoint].y * 0.31)}%` }}
                        >
                            {chartPoints[hoveredPoint].label}: {chartPoints[hoveredPoint].value}%
                        </div>
                    )}
                </div>
                <div className="mt-3 grid gap-1 text-center" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
                    {points.map((point) => <div key={point.date} className="text-xs font-medium text-gray-400">{point.label}</div>)}
                </div>
            </div>
        </section>
    );
}
