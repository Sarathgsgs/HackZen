import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    fetchHackathonChangeRequest, 
    sendReminderNotification, 
    markAsResolved, 
    withdrawRequestAndReject,
    fetchHackathonSubmissionDetails,
    sendMessageToOrganizer
} from '../../services/admin/hackathonApprovalsApi';

const HackathonChangeRequest = () => {
    const navigate = useNavigate();
    const { requestId } = useParams();
    const [requestData, setRequestData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [submissionData, setSubmissionData] = useState(null);
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageContent, setMessageContent] = useState('');
    const [messageSending, setMessageSending] = useState(false);
    const [messageError, setMessageError] = useState('');
    const [reminderFeedback, setReminderFeedback] = useState(null);

    const targetId = requestId || requestData?.id || requestData?._id;

    useEffect(() => {
        const loadRequests = async () => {
            setIsLoading(true);
            try {
                const data = await fetchHackathonChangeRequest(requestId);
                setRequestData(data);
            } catch (error) {
                console.error("Failed to fetch request data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadRequests();
    }, [requestId]);

    const handleAction = async (actionFn, actionName) => {
        const activeId = requestId || requestData?.id || requestData?._id;
        setActionLoading(actionName);
        try {
            await actionFn(activeId);
            const newData = await fetchHackathonChangeRequest(activeId);
            setRequestData(newData);
            if (actionName === 'reject') {
                navigate('/admin/dashboard');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReminder = async () => {
        const activeId = requestId || requestData?.id || requestData?._id;
        setActionLoading('reminder');
        try {
            const res = await sendReminderNotification(activeId);
            setReminderFeedback(res.message || 'Reminder notification sent successfully.');
            setTimeout(() => setReminderFeedback(null), 4000);
        } catch (error) {
            console.error(error);
            setReminderFeedback('Failed to send reminder notification.');
            setTimeout(() => setReminderFeedback(null), 4000);
        } finally {
            setActionLoading(null);
        }
    };

    const handleViewSubmission = async () => {
        const activeId = requestId || requestData?.id || requestData?._id;
        try {
            const data = await fetchHackathonSubmissionDetails(activeId);
            setSubmissionData(data);
            setShowSubmissionModal(true);
        } catch (error) {
            console.error('Failed to fetch submission details:', error);
        }
    };

    const handleOpenMessageModal = () => {
        setMessageContent('');
        setMessageError('');
        setShowMessageModal(true);
    };

    const handleSendMessage = async () => {
        if (!messageContent.trim()) {
            setMessageError('Message cannot be empty.');
            return;
        }

        const activeId = requestId || requestData?.id || requestData?._id;
        setMessageSending(true);
        try {
            const result = await sendMessageToOrganizer(activeId, messageContent);
            if (result.success) {
                setShowMessageModal(false);
                setMessageContent('');
                setMessageError('');
                setReminderFeedback('Message sent successfully to organizer.');
                setTimeout(() => setReminderFeedback(null), 4000);
            } else {
                setMessageError(result.message);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessageError('Failed to send message. Please try again.');
        } finally {
            setMessageSending(false);
        }
    };

    if (isLoading || !requestData) {
        return (
            <div className="flex justify-center py-24">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-16 max-w-7xl mx-auto">
            {reminderFeedback && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>{reminderFeedback}</span>
                    </div>
                    <button onClick={() => setReminderFeedback(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold cursor-pointer">Dismiss</button>
                </div>
            )}

            {/* Main Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{requestData.title}</h1>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                            requestData.status === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30' :
                            requestData.status === 'Rejected' ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30' :
                            'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30'
                        }`}>
                            {requestData.status}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                            {requestData.organizerAvatar && (
                                <img src={requestData.organizerAvatar} className="w-4 h-4 rounded-full" alt="" />
                            )}
                            <span className="font-bold text-slate-700 dark:text-slate-300">{requestData.organizerName}</span>
                        </div>
                        <span>•</span>
                        <span>Submitted on {requestData.submittedOn}</span>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
                    <button 
                        onClick={handleViewSubmission} 
                        className="w-full sm:w-auto justify-center px-5 py-2.5 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        <span>View Submission</span>
                    </button>
                    <button 
                        onClick={handleOpenMessageModal} 
                        className="w-full sm:w-auto justify-center px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] !text-white shadow-sm shadow-blue-500/20 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                        <span>Message Organizer</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left Side: Requested Changes */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-5">
                    <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 overflow-hidden shadow-sm flex flex-col">
                        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between">
                            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
                                <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-500/20">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </span>
                                <span>Requested Changes</span>
                            </h2>
                            <span className="text-[10px] text-slate-500 dark:text-gray-400 font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full border border-slate-200 dark:border-white/10">
                                {requestData.changeItems?.length || 3} Items Total
                            </span>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {requestData.changeItems.map((item, index) => (
                                <div key={item.id} className="p-3.5 sm:p-4 flex items-start gap-3.5 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors group">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition-all ${item.status === 'Resolved' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-500/20' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-500/20'}`}>
                                        {item.icon}
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                {index + 1}. {item.title}
                                            </h3>
                                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${item.status === 'Resolved' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30'}`}>
                                                {item.status === 'Resolved' && (
                                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                )}
                                                <span>{item.status}</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed font-normal">
                                            {item.description}
                                        </p>
                                        <div className="flex items-center gap-2 pt-0.5">
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-gray-500">Action Required:</span>
                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] text-slate-700 dark:text-gray-300 font-bold">
                                                {item.actionRequired}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-3.5 sm:p-4 bg-slate-50/60 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <button 
                                onClick={handleReminder}
                                disabled={actionLoading === 'reminder' || requestData.status !== 'Changes Requested'}
                                className="w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-400 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
                            >
                                {actionLoading === 'reminder' ? 'Sending...' : (
                                    <>
                                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                                        <span>Send Reminder Notification</span>
                                    </>
                                )}
                            </button>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-gray-400 font-medium">
                                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span>Last updated by {requestData.lastUpdatedBy?.toLowerCase()} {requestData.lastUpdated}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Timeline & Actions */}
                <div className="space-y-4 sm:space-y-5">
                    {/* Activity Timeline Card */}
                    <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 overflow-hidden shadow-sm">
                        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]">
                            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span>Activity Timeline</span>
                            </h2>
                        </div>
                        <div className="p-4 sm:p-5 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-[34px] top-6 bottom-6 w-px bg-slate-200 dark:bg-white/10"></div>

                            <div className="space-y-4 relative">
                                {requestData.timeline.map((event) => (
                                    <div key={event.id} className="flex items-start gap-3">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 shrink-0 ${event.isActive ? (event.status === 'Rejected' ? 'bg-rose-50 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/50' : 'bg-blue-50 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/50') : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10'}`}>
                                            <div className={`w-2 h-2 rounded-full ${event.isActive ? (event.status === 'Rejected' ? 'bg-rose-500' : 'bg-blue-600') : 'bg-slate-400'}`}></div>
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-xs font-bold uppercase tracking-wider ${event.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-gray-400'}`}>{event.status}</p>
                                            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">{event.timestamp}</p>
                                            {event.actor && (
                                                <p className={`text-[10px] font-bold uppercase mt-1 ${event.isActive ? (event.status === 'Rejected' ? 'text-rose-600' : 'text-blue-600 dark:text-blue-400') : 'text-slate-400'}`}>
                                                    {event.actor}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Admin Actions Card */}
                    <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-navy-900 overflow-hidden shadow-sm">
                        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]">
                            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                <span>Admin Actions</span>
                            </h2>
                        </div>
                        <div className="p-4 sm:p-5 space-y-3">
                            <div className="space-y-1.5">
                                <button 
                                    onClick={() => handleAction(markAsResolved, 'resolve')}
                                    disabled={actionLoading !== null || requestData.status !== 'Changes Requested'}
                                    className="disabled:opacity-50 disabled:cursor-not-allowed w-full py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] !text-white shadow-sm shadow-blue-500/20 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {actionLoading === 'resolve' ? 'Processing...' : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                            <span>Mark as Resolved</span>
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-slate-500 dark:text-gray-400 text-center px-2">Confirms all requested changes are met and advances to final approval.</p>
                            </div>

                            <div className="h-px bg-slate-100 dark:bg-white/5 my-1.5"></div>

                            <div className="space-y-1.5">
                                <button 
                                    onClick={() => handleAction(withdrawRequestAndReject, 'reject')}
                                    disabled={actionLoading !== null || requestData.status !== 'Changes Requested'}
                                    className="disabled:opacity-50 disabled:cursor-not-allowed w-full py-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                >
                                    {actionLoading === 'reject' ? 'Withdrawing...' : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            <span>Withdraw Request & Reject</span>
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-slate-500 dark:text-gray-400 text-center px-2">Cancels the change request and issues an immediate rejection of the submission.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Submission Details Modal */}
            {showSubmissionModal && submissionData && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl custom-scrollbar">
                        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-navy-900/95 backdrop-blur-md z-10">
                            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">{submissionData.title}</h2>
                            <button onClick={() => setShowSubmissionModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg cursor-pointer">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-5 text-xs">
                            <div className="flex items-center gap-3">
                                {submissionData.organizerAvatar && (
                                    <img src={submissionData.organizerAvatar} alt="" className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10" />
                                )}
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{submissionData.organizerName}</p>
                                    <p className="text-slate-500 dark:text-gray-400">Submitted on {submissionData.submittedOn}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-extrabold text-slate-900 dark:text-white mb-1.5 uppercase tracking-wider text-[11px]">Description</h3>
                                <p className="text-slate-600 dark:text-gray-300 leading-relaxed">{submissionData.description}</p>
                            </div>

                            <div>
                                <h3 className="font-extrabold text-slate-900 dark:text-white mb-2 uppercase tracking-wider text-[11px]">Event Details</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                                        <p className="text-[10px] text-slate-500 dark:text-gray-400 font-extrabold uppercase mb-0.5">Start Date</p>
                                        <p className="text-slate-900 dark:text-white font-bold">{submissionData.details?.startDate}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                                        <p className="text-[10px] text-slate-500 dark:text-gray-400 font-extrabold uppercase mb-0.5">End Date</p>
                                        <p className="text-slate-900 dark:text-white font-bold">{submissionData.details?.endDate}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                                        <p className="text-[10px] text-slate-500 dark:text-gray-400 font-extrabold uppercase mb-0.5">Expected Participants</p>
                                        <p className="text-slate-900 dark:text-white font-bold">{submissionData.details?.expectedParticipants}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                                        <p className="text-[10px] text-slate-500 dark:text-gray-400 font-extrabold uppercase mb-0.5">Prize Pool</p>
                                        <p className="text-slate-900 dark:text-white font-bold">{submissionData.details?.prizePool}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-extrabold text-slate-900 dark:text-white mb-2 uppercase tracking-wider text-[11px]">Documents</h3>
                                <div className="space-y-2">
                                    {(submissionData.documents || []).map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">{doc.type}</p>
                                                <p className="text-slate-500 dark:text-gray-400 text-[11px]">{doc.name} • {doc.size}</p>
                                            </div>
                                            <p className="text-slate-400 text-[10px] font-mono">{doc.uploaded}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Message Organizer Modal */}
            {showMessageModal && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-xl w-full shadow-2xl p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Message {requestData.organizerName}</h2>
                            <button onClick={() => setShowMessageModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1.5">Message Content</label>
                                <textarea
                                    value={messageContent}
                                    onChange={(e) => {
                                        setMessageContent(e.target.value);
                                        setMessageError('');
                                    }}
                                    placeholder="Enter your message to the organizer..."
                                    rows="4"
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 p-3.5 text-xs focus:outline-none focus:border-[#2563eb] resize-none leading-relaxed"
                                />
                            </div>
                            {messageError && (
                                <p className="text-xs text-rose-600 font-bold">{messageError}</p>
                            )}
                            <div className="flex gap-2.5 justify-end pt-2">
                                <button
                                    onClick={() => setShowMessageModal(false)}
                                    className="px-4 py-2 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-white/10 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={messageSending || !messageContent.trim()}
                                    className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] !text-white shadow-sm shadow-blue-500/20 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                                >
                                    {messageSending ? 'Sending...' : 'Send Message'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HackathonChangeRequest;
