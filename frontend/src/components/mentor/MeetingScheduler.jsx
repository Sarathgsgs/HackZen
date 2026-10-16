import React, { useState, useEffect } from 'react';
import { createMeeting, getMentorMeetings } from '../../api/mentorApi';

export const MeetingScheduler = ({ studentIds, teamId }) => {
    const [showForm, setShowForm] = useState(false);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        meetingLink: '',
        location: '',
    });

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        try {
            const data = await getMentorMeetings(true);
            setMeetings(data);
        } catch (err) {
            console.error('Error fetching meetings:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const meetingData = {
                ...formData,
                studentIds,
                teamId,
                startTime: new Date(formData.startTime),
                endTime: new Date(formData.endTime),
            };

            await createMeeting(meetingData);
            alert('Meeting created successfully!');
            setFormData({
                title: '',
                description: '',
                startTime: '',
                endTime: '',
                meetingLink: '',
                location: '',
            });
            setShowForm(false);
            fetchMeetings();
        } catch (err) {
            alert('Failed to create meeting: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getMeetingStatus = (startTime) => {
        const now = new Date();
        const meetingTime = new Date(startTime);
        const diffMinutes = (meetingTime - now) / (1000 * 60);

        if (diffMinutes < 0) return 'Past';
        if (diffMinutes < 15) return 'Starting Soon';
        if (diffMinutes < 60) return 'In 1 hour';
        if (diffMinutes < 1440) return 'Today';
        return 'Upcoming';
    };

    return (
        <div className="space-y-6">
            {/* Create Meeting Button */}
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">📅 Meeting Scheduler</h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    + Schedule Meeting
                </button>
            </div>

            {/* Create Meeting Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-navy-900/50 border border-white/10 rounded-xl p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Meeting Title</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="w-full bg-navy-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                placeholder="e.g., Weekly Sync, Code Review"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Location/Platform</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({...formData, location: e.target.value})}
                                className="w-full bg-navy-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                placeholder="e.g., Room 101, Zoom"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full bg-navy-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 h-20 resize-none"
                            placeholder="Meeting agenda and objectives"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                            <input
                                type="datetime-local"
                                required
                                value={formData.startTime}
                                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                                className="w-full bg-navy-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                            <input
                                type="datetime-local"
                                required
                                value={formData.endTime}
                                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                                className="w-full bg-navy-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Meeting Link (Optional)</label>
                        <input
                            type="url"
                            value={formData.meetingLink}
                            onChange={(e) => setFormData({...formData, meetingLink: e.target.value})}
                            className="w-full bg-navy-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            placeholder="https://zoom.us/my/meeting"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            {loading ? 'Creating...' : 'Schedule Meeting'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Meetings List */}
            <div className="bg-navy-900/50 border border-white/10 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Scheduled Meetings</h4>
                {meetings.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-400">No meetings scheduled</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {meetings.map((meeting) => (
                            <div
                                key={meeting._id}
                                className="bg-navy-800/50 rounded-lg p-4 border border-white/5 hover:border-purple-500/30 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h5 className="font-semibold text-white">{meeting.title}</h5>
                                        <p className="text-sm text-gray-400 mt-1">{meeting.description}</p>
                                        
                                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                                            <span>📅 {new Date(meeting.startTime).toLocaleString()}</span>
                                            {meeting.location && <span>📍 {meeting.location}</span>}
                                        </div>

                                        {meeting.meetingLink && (
                                            <a
                                                href={meeting.meetingLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block"
                                            >
                                                Join Meeting →
                                            </a>
                                        )}
                                    </div>

                                    <div className="text-right">
                                        <span className="bg-purple-900/50 text-purple-200 px-3 py-1 rounded-full text-xs font-medium block">
                                            {getMeetingStatus(meeting.startTime)}
                                        </span>
                                        <span className="text-xs text-gray-500 mt-2 block">
                                            {meeting.attendees.length} attending
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


// ============= CALENDAR VIEW COMPONENT =============
export const CalendarView = ({ meetings }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className="bg-navy-900/50 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">{monthName}</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                        className="bg-navy-800 hover:bg-navy-700 text-white px-3 py-1 rounded text-sm"
                    >
                        ← Prev
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                        className="bg-navy-800 hover:bg-navy-700 text-white px-3 py-1 rounded text-sm"
                    >
                        Next →
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-gray-400 text-xs font-semibold py-2">
                        {day}
                    </div>
                ))}

                {days.map((day, idx) => (
                    <div
                        key={idx}
                        className={`h-16 rounded-lg border p-1 text-sm ${
                            day
                                ? 'bg-navy-800/50 border-white/10 hover:border-purple-500/30'
                                : 'border-transparent'
                        }`}
                    >
                        {day && (
                            <>
                                <p className="text-white font-semibold">{day}</p>
                                {/* Show meeting indicators */}
                                <div className="mt-1 space-y-0.5">
                                    {meetings
                                        .filter((m) => new Date(m.startTime).getDate() === day)
                                        .slice(0, 2)
                                        .map((m) => (
                                            <div
                                                key={m._id}
                                                className="text-xs bg-purple-900/30 text-purple-200 px-1 py-0.5 rounded truncate"
                                            >
                                                {m.title}
                                            </div>
                                        ))}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
