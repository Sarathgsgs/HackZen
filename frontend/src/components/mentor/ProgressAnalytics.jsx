import React, { useState, useEffect } from 'react';
import { getStudentProgress, getPerformanceMetrics, generateStudentReport } from '../../api/mentorApi';

// ============= PROGRESS TRACKER COMPONENT =============
export const ProgressTracker = ({ studentId, studentName }) => {
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const data = await getStudentProgress(studentId);
                setProgress(data);
            } catch (err) {
                console.error('Error loading progress:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProgress();
    }, [studentId]);

    if (loading) {
        return <div className="text-center py-8 text-gray-400">Loading progress...</div>;
    }

    if (!progress) return null;

    const progressPercentage = progress.progressPercentage || 0;

    return (
        <div className="bg-navy-900/50 border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">📊 Progress Tracking</h3>
            
            <div className="space-y-4">
                {/* Student Info */}
                <div>
                    <p className="text-gray-400 text-sm">Student</p>
                    <p className="text-white font-semibold">{studentName}</p>
                </div>

                {/* Progress Bar */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-400 text-sm">Overall Progress</p>
                        <span className="text-white font-semibold">{progressPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-navy-900 rounded-full h-3 overflow-hidden border border-white/10">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                {/* Task Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-navy-800/50 rounded-lg p-4 border border-white/5">
                        <p className="text-gray-400 text-sm">Total Tasks</p>
                        <p className="text-2xl font-bold text-white">{progress.totalTasks}</p>
                    </div>
                    <div className="bg-navy-800/50 rounded-lg p-4 border border-white/5">
                        <p className="text-gray-400 text-sm">Completed</p>
                        <p className="text-2xl font-bold text-green-400">{progress.completedTasks}</p>
                    </div>
                </div>

                {/* Last Updated */}
                <p className="text-xs text-gray-500">
                    Last updated: {new Date(progress.lastUpdated).toLocaleString()}
                </p>
            </div>
        </div>
    );
};


// ============= PERFORMANCE ANALYTICS COMPONENT =============
export const PerformanceAnalytics = ({ studentId, studentName }) => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const data = await getPerformanceMetrics(studentId);
                setMetrics(data);
            } catch (err) {
                console.error('Error loading performance metrics:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [studentId]);

    if (loading) {
        return <div className="text-center py-8 text-gray-400">Loading analytics...</div>;
    }

    if (!metrics) return null;

    const MetricCard = ({ label, value, icon, color }) => (
        <div className={`bg-gradient-to-br from-${color}-900 to-${color}-800 rounded-lg p-4 border border-${color}-700/50`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className={`text-${color}-200 text-sm font-medium`}>{label}</p>
                    <p className="text-2xl font-bold text-white mt-2">{value}</p>
                </div>
                <div className="text-3xl">{icon}</div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-semibold text-white mb-4">📈 Performance Analytics</h3>
                
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <MetricCard 
                        label="Task Completion" 
                        value={`${metrics.avgTaskCompletion.toFixed(1)}%`}
                        icon="✓"
                        color="green"
                    />
                    <MetricCard 
                        label="Avg Rating" 
                        value={metrics.avgFeedbackRating.toFixed(1)}
                        icon="⭐"
                        color="yellow"
                    />
                    <MetricCard 
                        label="Attendance" 
                        value={`${metrics.attendanceRate.toFixed(1)}%`}
                        icon="📅"
                        color="blue"
                    />
                    <MetricCard 
                        label="Activity Score" 
                        value={metrics.activityScore.toFixed(1)}
                        icon="🎯"
                        color="purple"
                    />
                </div>

                {/* Strengths & Improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="bg-navy-900/50 border border-white/10 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-green-400 mb-4">💪 Strengths</h4>
                        <ul className="space-y-2">
                            {metrics.strengths && metrics.strengths.length > 0 ? (
                                metrics.strengths.map((strength, idx) => (
                                    <li key={idx} className="text-gray-300 flex items-center gap-2">
                                        <span className="text-green-400">✓</span> {strength}
                                    </li>
                                ))
                            ) : (
                                <li className="text-gray-400">No data available</li>
                            )}
                        </ul>
                    </div>

                    {/* Improvement Areas */}
                    <div className="bg-navy-900/50 border border-white/10 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-orange-400 mb-4">🎯 Areas for Improvement</h4>
                        <ul className="space-y-2">
                            {metrics.improvementAreas && metrics.improvementAreas.length > 0 ? (
                                metrics.improvementAreas.map((area, idx) => (
                                    <li key={idx} className="text-gray-300 flex items-center gap-2">
                                        <span className="text-orange-400">→</span> {area}
                                    </li>
                                ))
                            ) : (
                                <li className="text-gray-400">Keep it up!</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};


// ============= REPORT GENERATOR COMPONENT =============
export const ReportGenerator = ({ studentId, studentName }) => {
    const [reportType, setReportType] = useState('weekly');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showReport, setShowReport] = useState(false);

    const handleGenerateReport = async () => {
        setLoading(true);
        try {
            const data = await generateStudentReport(studentId, reportType);
            setReport(data);
            setShowReport(true);
        } catch (err) {
            alert('Error generating report: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!report) return;

        const html = `
            <html>
                <head>
                    <title>Student Report - ${studentName}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #333; }
                        .section { margin: 20px 0; page-break-inside: avoid; }
                        .metric { display: inline-block; width: 48%; margin-right: 2%; }
                        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>📊 Student Progress Report</h1>
                    <p><strong>Student:</strong> ${report.studentName}</p>
                    <p><strong>Team:</strong> ${report.teamName}</p>
                    <p><strong>Report Type:</strong> ${report.reportType}</p>
                    <p><strong>Generated:</strong> ${new Date(report.generatedAt).toLocaleString()}</p>

                    <div class="section">
                        <h2>📋 Tasks Summary</h2>
                        <table>
                            <tr>
                                <th>Metric</th>
                                <th>Count</th>
                            </tr>
                            <tr>
                                <td>Total Tasks</td>
                                <td>${report.tasksSummary.total}</td>
                            </tr>
                            <tr>
                                <td>Completed</td>
                                <td>${report.tasksSummary.completed}</td>
                            </tr>
                            <tr>
                                <td>Pending</td>
                                <td>${report.tasksSummary.pending}</td>
                            </tr>
                            <tr>
                                <td>Blocked</td>
                                <td>${report.tasksSummary.blocked}</td>
                            </tr>
                        </table>
                    </div>

                    <div class="section">
                        <h2>💬 Feedback Summary</h2>
                        <p><strong>Total Feedback:</strong> ${report.feedbackSummary.total}</p>
                        <p><strong>Average Rating:</strong> ${report.feedbackSummary.avgRating.toFixed(2)}/5</p>
                    </div>

                    <div class="section">
                        <h2>📈 Performance Metrics</h2>
                        <div class="metric">
                            <strong>Task Completion:</strong> ${report.performanceMetrics.avgTaskCompletion.toFixed(1)}%
                        </div>
                        <div class="metric">
                            <strong>Feedback Rating:</strong> ${report.performanceMetrics.avgFeedbackRating.toFixed(1)}/5
                        </div>
                        <div class="metric">
                            <strong>Attendance:</strong> ${report.performanceMetrics.attendanceRate.toFixed(1)}%
                        </div>
                        <div class="metric">
                            <strong>Activity Score:</strong> ${report.performanceMetrics.activityScore.toFixed(1)}
                        </div>
                    </div>

                    <div class="section">
                        <h2>💡 Recommendations</h2>
                        <ul>
                            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                </body>
            </html>
        `;

        const newWindow = window.open();
        newWindow.document.write(html);
        newWindow.document.close();
        newWindow.print();
    };

    return (
        <div className="bg-navy-900/50 border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">📄 Report Generation</h3>
            
            {!showReport ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Report Type</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full bg-navy-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                        >
                            <option value="weekly">Weekly Report</option>
                            <option value="monthly">Monthly Report</option>
                            <option value="final">Final Report</option>
                        </select>
                    </div>

                    <button
                        onClick={handleGenerateReport}
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        {loading ? 'Generating...' : 'Generate Report'}
                    </button>
                </div>
            ) : report ? (
                <div className="space-y-4">
                    <div className="bg-navy-800/50 rounded-lg p-4 border border-white/5 space-y-2">
                        <p className="text-gray-300"><strong>Student:</strong> {report.studentName}</p>
                        <p className="text-gray-300"><strong>Team:</strong> {report.teamName}</p>
                        <p className="text-gray-300"><strong>Type:</strong> {report.reportType}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-navy-800/50 rounded-lg p-3 border border-white/5">
                            <p className="text-gray-400">Tasks Completed</p>
                            <p className="text-xl font-bold text-white">{report.tasksSummary.completed}/{report.tasksSummary.total}</p>
                        </div>
                        <div className="bg-navy-800/50 rounded-lg p-3 border border-white/5">
                            <p className="text-gray-400">Avg Rating</p>
                            <p className="text-xl font-bold text-white">{report.feedbackSummary.avgRating.toFixed(1)}/5</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadPDF}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            📥 Download PDF
                        </button>
                        <button
                            onClick={() => setShowReport(false)}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Back
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
};
