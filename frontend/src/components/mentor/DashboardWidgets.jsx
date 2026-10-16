import React, { useState, useEffect } from 'react';
import { getDashboardOverview, getMentorMeetings, getMentorTasks } from '../../api/mentorApi';

export const DashboardOverview = () => {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOverview = async () => {
            try {
                setLoading(true);
                const data = await getDashboardOverview();
                setOverview(data);
            } catch (err) {
                setError(err.message || 'Failed to load overview');
                console.error('Error loading overview:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOverview();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-200">{error}</p>
            </div>
        );
    }

    if (!overview) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Total Students Card */}
            <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-6 border border-blue-700/50">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-blue-200 text-sm font-medium">Total Students</p>
                        <p className="text-4xl font-bold text-white mt-2">{overview.totalStudents || 0}</p>
                    </div>
                    <div className="text-4xl">👥</div>
                </div>
            </div>

            {/* Upcoming Meetings Card */}
            <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-6 border border-purple-700/50">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-purple-200 text-sm font-medium">Upcoming Meetings</p>
                        <p className="text-4xl font-bold text-white mt-2">{overview.upcomingMeetings || 0}</p>
                    </div>
                    <div className="text-4xl">📅</div>
                </div>
            </div>

            {/* Pending Tasks Card */}
            <div className="bg-gradient-to-br from-orange-900 to-orange-800 rounded-lg p-6 border border-orange-700/50">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-orange-200 text-sm font-medium">Pending Tasks</p>
                        <p className="text-4xl font-bold text-white mt-2">{overview.pendingTasks || 0}</p>
                    </div>
                    <div className="text-4xl">✓</div>
                </div>
            </div>

            {/* Quick Action Card */}
            <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-lg p-6 border border-green-700/50">
                <div className="flex flex-col justify-between h-full">
                    <p className="text-green-200 text-sm font-medium">Quick Action</p>
                    <button className="mt-4 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                        + New Task
                    </button>
                </div>
            </div>
        </div>
    );
};


// ============= UPCOMING MEETINGS WIDGET =============
export const UpcomingMeetings = () => {
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMeetings = async () => {
            try {
                const data = await getMentorMeetings(true);
                setMeetings(data.slice(0, 5)); // Show top 5
            } catch (err) {
                console.error('Error loading meetings:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMeetings();
    }, []);

    return (
        <div className="bg-navy-900/50 border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">📅 Upcoming Meetings</h3>
            {loading ? (
                <div className="text-center py-8">
                    <p className="text-gray-400">Loading meetings...</p>
                </div>
            ) : meetings.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-400">No upcoming meetings</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {meetings.map((meeting) => (
                        <div key={meeting._id} className="bg-navy-800/50 rounded-lg p-4 border border-white/5 hover:border-purple-500/30 transition-colors cursor-pointer">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="font-semibold text-white">{meeting.title}</h4>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {new Date(meeting.startTime).toLocaleString()}
                                    </p>
                                    {meeting.meetingLink && (
                                        <a 
                                            href={meeting.meetingLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-purple-400 text-sm hover:text-purple-300 mt-2 inline-block"
                                        >
                                            Join Meeting →
                                        </a>
                                    )}
                                </div>
                                <span className="bg-purple-900/50 text-purple-200 px-3 py-1 rounded-full text-xs font-medium">
                                    {meeting.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// ============= PENDING TASKS WIDGET =============
export const PendingTasks = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const data = await getMentorTasks();
                const pending = data.filter(t => t.status === 'pending').slice(0, 5);
                setTasks(pending);
            } catch (err) {
                console.error('Error loading tasks:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, []);

    return (
        <div className="bg-navy-900/50 border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">✓ Pending Tasks</h3>
            {loading ? (
                <div className="text-center py-8">
                    <p className="text-gray-400">Loading tasks...</p>
                </div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-400">All tasks completed!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tasks.map((task) => (
                        <div key={task._id} className="bg-navy-800/50 rounded-lg p-4 border border-white/5 hover:border-orange-500/30 transition-colors">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="font-semibold text-white">{task.title}</h4>
                                    <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            task.priority === 'high' ? 'bg-red-900/50 text-red-200' :
                                            task.priority === 'medium' ? 'bg-yellow-900/50 text-yellow-200' :
                                            'bg-green-900/50 text-green-200'
                                        }`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">
                                        Due: {new Date(task.deadline).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
