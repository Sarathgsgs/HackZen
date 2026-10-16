import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const CreateHackathon = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Determine current step from URL path (/step-1, /step-2, /step-3, /step-4)
    const [currentStep, setCurrentStep] = useState(() => {
        const pathParts = location.pathname.split('/');
        const stepPart = pathParts[pathParts.length - 1];
        const stepMatch = stepPart.match(/step-(\d)/);
        return stepMatch ? parseInt(stepMatch[1]) : 1;
    });

    useEffect(() => {
        const pathParts = location.pathname.split('/');
        const stepPart = pathParts[pathParts.length - 1];
        const stepMatch = stepPart.match(/step-(\d)/);
        if (stepMatch) {
            setCurrentStep(parseInt(stepMatch[1]));
        }
    }, [location.pathname]);

    // Initial draft schema supporting all 4 wizard steps
    const [draft, setDraft] = useState(() => {
        const saved = sessionStorage.getItem('hackathonDraft');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Error reading saved draft:", e);
            }
        }
        return {
            title: '',
            description: '',
            category: 'AI & Machine Learning',
            themes: ['AI & Machine Learning'],
            mode: 'Online',
            minTeamSize: 1,
            maxTeamSize: 4,
            tracks: [
                { id: 1, title: 'AI & Machine Learning', description: 'Build innovative machine learning applications and generative models.' }
            ],
            guidelines: 'Ensure all submissions are open source with clean code and presentation video.',
            startDate: '',
            endDate: '',
            registrationStart: '',
            registrationEnd: '',
            judgingStart: '',
            resultsDate: '',
            isPublic: true,
            autoApprove: false,
            posterFile: null,
            posterPreview: '',
            posterDataUrl: ''
        };
    });

    const steps = [
        { id: 1, title: 'Basic Details' },
        { id: 2, title: 'Rules & Problems' },
        { id: 3, title: 'Timeline' },
        { id: 4, title: 'Review' }
    ];

    const handleStepChange = (step) => {
        setCurrentStep(step);
        navigate(`/organizer/create-hackathon/step-${step}`);
    };

    const contextValue = {
        draft,
        setDraft,
        currentStep,
        setCurrentStep,
        handleStepChange,
        steps
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300 pb-16 max-w-5xl mx-auto">
            {/* Header matching Figma Screenshot 2 */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Create Hackathon
                </h1>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                    Configure your event details and guidelines.
                </p>
            </div>

            {/* 4-Step Stepper Bar matching Figma Screenshot 2 */}
            <div className="bg-white dark:bg-navy-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
                <div className="flex items-center justify-between relative">
                    {steps.map((step, index) => {
                        const isCurrent = currentStep === step.id;
                        const isCompleted = currentStep > step.id;

                        return (
                            <React.Fragment key={step.id}>
                                <div className="flex items-center gap-3 z-10">
                                    <button
                                        onClick={() => handleStepChange(step.id)}
                                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                                            isCurrent
                                                ? 'bg-[#7C65F6] text-white shadow-md shadow-[#7C65F6]/30'
                                                : isCompleted
                                                ? 'bg-purple-100 text-[#7C65F6] dark:bg-purple-500/20 dark:text-purple-300'
                                                : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-gray-500'
                                        }`}
                                    >
                                        {isCompleted ? '✓' : step.id}
                                    </button>

                                    <div className="hidden sm:block">
                                        <p className={`text-xs font-bold ${
                                            isCurrent 
                                                ? 'text-[#7C65F6]' 
                                                : isCompleted 
                                                ? 'text-slate-800 dark:text-white font-semibold' 
                                                : 'text-slate-400 dark:text-gray-500 font-medium'
                                        }`}>
                                            {step.title}
                                        </p>
                                    </div>
                                </div>

                                {index < steps.length - 1 && (
                                    <div className="flex-1 mx-3 sm:mx-6 h-0.5 bg-slate-100 dark:bg-white/10 relative">
                                        <div 
                                            className={`h-full transition-all duration-300 ${
                                                currentStep > step.id ? 'bg-[#7C65F6]' : 'bg-transparent'
                                            }`} 
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Step Content Container */}
            <div className="min-h-[500px]">
                <Outlet context={contextValue} />
            </div>
        </div>
    );
};

export default CreateHackathon;
