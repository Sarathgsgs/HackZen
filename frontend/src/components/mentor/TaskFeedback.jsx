import React, { useState } from 'react';
import { createTask } from '../../api/mentorApi';

export const TaskManagement = ({ studentId, teamId }) => {
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        deadline: '',
        priority: 'medium',
        category: 'development',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const taskData = {
                ...formData,
                studentId,
                teamId,
                deadline: new Date(formData.deadline),
            };
            
            await createTask(taskData);
            alert('Task created successfully!');
            setFormData({
                title: '',
                description: '',
                deadline: '',
                priority: 'medium',
                category: 'development',
            });
            setShowForm(false);
        } catch (err) {
            alert('Failed to create task: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-navy-900/50 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">📋 Task Management</h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    + New Task
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-navy-800/50 rounded-lg p-6 mb-6 border border-white/5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Task Title</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            className="w-full bg-navy-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            placeholder="Enter task title"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full bg-navy-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 h-24 resize-none"
                            placeholder="Enter task description"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Deadline</label>
                            <input
                                type="datetime-local"
                                required
                                value={formData.deadline}
                                onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                                className="w-full bg-navy-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                className="w-full bg-navy-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            {loading ? 'Creating...' : 'Create Task'}
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
        </div>
    );
};


// ============= FEEDBACK FORM =============
export const FeedbackForm = ({ studentId, taskId = null, onSubmit }) => {
    const [formData, setFormData] = useState({
        type: 'general',
        title: '',
        content: '',
        rating: 5,
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const feedbackData = {
                ...formData,
                studentId,
                taskId,
            };
            
            if (onSubmit) {
                await onSubmit(feedbackData);
            }
            
            setFormData({
                type: 'general',
                title: '',
                content: '',
                rating: 5,
            });
        } catch (err) {
            console.error('Error submitting feedback:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-navy-900/50 border border-white/10 rounded-xl p-6 space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">💬 Provide Feedback</h3>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Feedback Type</label>
                    <select
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full bg-navy-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    >
                        <option value="general">General</option>
                        <option value="code_review">Code Review</option>
                        <option value="performance">Performance</option>
                        <option value="improvement">Improvement</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Rating (1-5)</label>
                    <select
                        value={formData.rating}
                        onChange={(e) => setFormData({...formData, rating: parseInt(e.target.value)})}
                        className="w-full bg-navy-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    >
                        <option value="1">1 - Needs Improvement</option>
                        <option value="2">2 - Below Average</option>
                        <option value="3">3 - Average</option>
                        <option value="4">4 - Good</option>
                        <option value="5">5 - Excellent</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-navy-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    placeholder="Feedback title"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
                <textarea
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="w-full bg-navy-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 h-32 resize-none"
                    placeholder="Provide constructive feedback..."
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
                {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
        </form>
    );
};
