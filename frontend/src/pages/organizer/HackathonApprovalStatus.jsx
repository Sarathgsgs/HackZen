import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
    Check, 
    Eye, 
    Flag, 
    AlertTriangle, 
    Clock, 
    Edit3, 
    BookOpen, 
    CheckCircle2, 
    MessageSquare, 
    ShieldCheck, 
    Megaphone,
    X
} from 'lucide-react';
import { fetchHackathonApprovalStatus, toggleApprovalStep } from '../../services/organizer/organizerPagesApi';

export default function HackathonApprovalStatus() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const hackathonId = searchParams.get('id');

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [guidelinesOpen, setGuidelinesOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToastMessage({ text: msg, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    useEffect(() => {
        const loadStatus = async () => {
            try {
                setLoading(true);
                const res = await fetchHackathonApprovalStatus(hackathonId);
                setData(res);
            } catch (error) {
                console.error("Failed to load approval status:", error);
                showToast("Displaying review standing snapshot.", "info");
            } finally {
                setLoading(false);
            }
        };
        loadStatus();
    }, [hackathonId]);

    const handleToggleStep = async (stepId, currentStatus) => {
        const nextStatus = !currentStatus;
        setData(prev => ({
            ...prev,
            nextSteps: prev.nextSteps.map(s => s.id === stepId ? { ...s, completed: nextStatus } : s)
        }));

        try {
            await toggleApprovalStep(stepId, nextStatus);
            showToast(nextStatus ? "Marked next step as completed." : "Item marked pending.");
        } catch (error) {
            console.error("Error updating step status:", error);
        }
    };

    const handleEditAndResubmit = () => {
        if (hackathonId) {
            navigate('/organizer/create-hackathon/step-1', { state: { hackathonId, editMode: true } });
        } else {
            navigate('/organizer/create-hackathon/step-1');
        }
    };

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 space-y-4">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-[#2563eb] rounded-full animate-spin"></div>
                <p className="text-sm text-slate-400 font-medium">Retrieving event review standing...</p>
            </div>
        );
    }

    const approvalData = data || {
        eventTitle: "Global Fintech Hack 2024",
        organizerName: "Alex Morgan",
        submittedAt: "Oct 12, 2024",
        status: "Under Review",
        stepper: [
            { id: "draft", label: "Draft", date: "Oct 10", status: "completed" },
            { id: "submitted", label: "Submitted", date: "Oct 12", status: "completed" },
            { id: "under_review", label: "Under Review", date: "Current", status: "active" },
            { id: "decision", label: "Decision", date: "Pending", status: "pending" }
        ],
        adminFeedback: {
            quote: "The problem statement for the 'Banking Security' track needs more specific evaluation criteria. Please refine and resubmit.",
            urgency: "Action required before final approval."
        },
        reviewHistory: [
            { id: "h_1", title: "Changes requested by Admin", date: "Oct 14, 2024 • 02:30 PM", type: "action" },
            { id: "h_2", title: "Submitted for review", date: "Oct 12, 2024 • 10:15 AM", type: "neutral" },
            { id: "h_3", title: "Draft created", date: "Oct 10, 2024 • 09:00 AM", type: "neutral" }
        ],
        requiredDocuments: [
            { id: "doc_1", name: "Problem Statement", status: "Verified" },
            { id: "doc_2", name: "Prize Structure", status: "Pending" },
            { id: "doc_3", name: "Timeline & Rules", status: "Verified" }
        ],
        nextSteps: [
            { id: "step_1", title: "Refine Evaluation Criteria", description: "Address admin feedback on Banking Security track.", completed: false },
            { id: "step_2", title: "Update Prize Structure", description: "Upload finalized prize distribution matrix.", completed: false }
        ],
        reviewerTeam: [
            { id: "rev_1", name: "Jane Smith", role: "Lead Hackathon Admin", initials: "JS" },
            { id: "rev_2", name: "Michael Doe", role: "Technical Reviewer", initials: "MD" }
        ]
    };

    return (
        <div className="space-y-7 animate-in fade-in duration-300 pb-16 max-w-7xl mx-auto">
            {/* Toast notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border backdrop-blur-md bg-slate-900/90 text-white border-white/10 animate-in slide-in-from-bottom-5">
                    <span className="text-sm font-medium">{toastMessage.text}</span>
                </div>
            )}

            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Hackathon Approval Status
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                        Review the current standing and feedback for your submitted event.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setGuidelinesOpen(true)}
                        className="px-4 py-2.5 rounded-xl border border-blue-500/40 hover:border-[#2563eb] text-[#2563eb] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                        View Detailed Guidelines
                    </button>
                    <button
                        onClick={handleEditAndResubmit}
                        className="px-4 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                    >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit & Resubmit</span>
                    </button>
                </div>
            </div>

            {/* Main Content 2-Column Grid matching Figma Screenshot 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column (Span 7): Event Card & Stepper, Review History, Required Documents */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* Event Overview & Stepper Card */}
                    <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#111625] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-7">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    {approvalData.eventTitle}
                                </h2>
                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-gray-400 mt-1">
                                    <span>👤 {approvalData.organizerName}</span>
                                    <span>•</span>
                                    <span>📄 Submitted: {approvalData.submittedAt}</span>
                                </div>
                            </div>

                            <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                {approvalData.status}
                            </span>
                        </div>

                        {/* Horizontal 4-Step Progress Stepper */}
                        <div className="relative pt-4 pb-2">
                            {/* Horizontal connector line */}
                            <div className="absolute top-[34px] left-[12%] right-[12%] h-[2px] bg-slate-200 dark:bg-slate-700 z-0">
                                <div className="h-full bg-[#2563eb] transition-all duration-500" style={{ width: '66%' }}></div>
                            </div>

                            <div className="grid grid-cols-4 relative z-10 text-center">
                                {approvalData.stepper.map((st) => {
                                    const isDone = st.status === 'completed';
                                    const isActive = st.status === 'active';

                                    return (
                                        <div key={st.id} className="flex flex-col items-center">
                                            <div className="relative">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                                                    isDone 
                                                        ? 'bg-[#2563eb] text-white ring-4 ring-blue-100 dark:ring-blue-950/40' 
                                                        : isActive 
                                                        ? 'bg-white dark:bg-[#111625] text-[#2563eb] border-2 border-[#2563eb] ring-4 ring-blue-100 dark:ring-blue-950/40' 
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-white/10'
                                                }`}>
                                                    {isDone ? (
                                                        <Check className="w-4 h-4 stroke-[3]" />
                                                    ) : isActive ? (
                                                        <Eye className="w-4 h-4 text-[#2563eb]" />
                                                    ) : (
                                                        <Flag className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </div>

                                                {/* Glowing dot for current active step */}
                                                {isActive && (
                                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#2563eb] ring-2 ring-white dark:ring-[#111625] animate-pulse"></span>
                                                )}
                                            </div>

                                            <div className="mt-3">
                                                <div className={`text-xs font-bold ${isActive ? 'text-[#2563eb] dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                                    {st.label}
                                                </div>
                                                <div className="text-[11px] text-slate-400 mt-0.5">
                                                    {st.date}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Review History Card */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-[#111625] border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-4">
                            Review History
                        </h2>

                        <div className="space-y-4">
                            {approvalData.reviewHistory.map((item, idx) => {
                                const isAction = item.type === 'action';
                                return (
                                    <div key={item.id || idx} className="flex items-start gap-3.5">
                                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${isAction ? 'bg-[#2563eb]' : 'bg-slate-400'}`}></div>
                                        <div>
                                            <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                                                {item.title}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                                {item.date}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Required Documents Card */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-[#111625] border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-4">
                            Required Documents
                        </h2>

                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {approvalData.requiredDocuments.map((doc, idx) => {
                                const isVerified = doc.status === 'Verified';
                                return (
                                    <div key={doc.id || idx} className="py-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                                isVerified ? 'text-[#2563eb]' : 'text-slate-400'
                                            }`}>
                                                {isVerified ? <CheckCircle2 className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                                            </div>
                                            <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                {doc.name}
                                            </span>
                                        </div>

                                        <span className={`text-xs font-semibold ${
                                            isVerified ? 'text-[#2563eb] dark:text-blue-300' : 'text-slate-400'
                                        }`}>
                                            {doc.status}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

                {/* Right Column (Span 5): Admin Feedback, Next Steps Checklist, Reviewer Team */}
                <div className="lg:col-span-5 space-y-6">
                    
                    {/* Admin Feedback Card with Alert Styling */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-[#111625] border border-rose-200 dark:border-rose-900/40 shadow-xs relative overflow-hidden">
                        {/* Faint megaphone background illustration */}
                        <div className="absolute top-2 right-2 text-rose-500/10 pointer-events-none">
                            <Megaphone className="w-24 h-24 transform -rotate-12" />
                        </div>

                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                                    !
                                </div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Admin Feedback
                                </h3>
                            </div>

                            <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
                                    "{approvalData.adminFeedback.quote}"
                                </p>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 pt-1">
                                <Clock className="w-4 h-4 text-slate-500" />
                                <span>{approvalData.adminFeedback.urgency}</span>
                            </div>
                        </div>
                    </div>

                    {/* Next Steps Checklist Card */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-[#111625] border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-4">
                            Next Steps
                        </h2>

                        <div className="space-y-3">
                            {approvalData.nextSteps.map((step) => (
                                <div 
                                    key={step.id} 
                                    onClick={() => handleToggleStep(step.id, step.completed)}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                                        step.completed 
                                            ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-500/40' 
                                            : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/10 hover:border-slate-300'
                                    }`}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={step.completed} 
                                        onChange={() => {}}
                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb] cursor-pointer"
                                    />
                                    <div className="min-w-0">
                                        <div className={`text-xs sm:text-sm font-bold ${step.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                            {step.title}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                                            {step.description}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reviewer Team Card */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-[#111625] border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-4">
                            Reviewer Team
                        </h2>

                        <div className="space-y-4">
                            {approvalData.reviewerTeam.map((rev) => {
                                const isLead = rev.role.includes('Lead');
                                const avatarBg = isLead 
                                    ? 'bg-blue-100 dark:bg-blue-950/60 text-[#2563eb] dark:text-blue-300' 
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300';

                                return (
                                    <div key={rev.id} className="flex items-center gap-3.5">
                                        <div className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ${avatarBg}`}>
                                            {rev.initials}
                                        </div>
                                        <div>
                                            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                {rev.name}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                                {rev.role}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>

            {/* Detailed Guidelines Modal */}
            {guidelinesOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#111625] border border-slate-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                            <div className="flex items-center gap-2.5">
                                <BookOpen className="w-5 h-5 text-[#2563eb]" />
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Platform Approval Guidelines</h3>
                            </div>
                            <button
                                onClick={() => setGuidelinesOpen(false)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
                            <p><strong>1. Problem Statement:</strong> Must articulate target user pain points, domain constraints, and sample technical inputs.</p>
                            <p><strong>2. Evaluation Criteria:</strong> Scoring rubrics must include originality, technical execution, user experience, and track adherence with assigned weights.</p>
                            <p><strong>3. Prize Distribution:</strong> Cash rewards or sponsor tiers must clearly detail eligibility and disbursement timelines.</p>
                            <p><strong>4. Moderation & Code of Conduct:</strong> Event organizers must acknowledge platform plagiarism checks and mentor dispute processes.</p>
                        </div>
                        <div className="pt-2 text-right">
                            <button
                                onClick={() => setGuidelinesOpen(false)}
                                className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
