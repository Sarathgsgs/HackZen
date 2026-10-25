import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchHomeHackathons } from '../services/homeApi';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import { usePlatformSettings } from '../context/PlatformSettingsContext';

// --- Shared Internal Components ---

const Button = ({ children, variant = 'primary', onClick, className = '', to, ...props }) => {
    const baseStyles = 'px-6 py-3 rounded-lg font-semibold transition-all duration-300 btn-hover relative z-10';
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 !text-white shadow-md shadow-blue-500/20 font-bold',
        secondary: 'glass text-blue-700 dark:text-blue-300 border-2 border-blue-600/40 hover:bg-blue-50 dark:hover:bg-blue-500/10 font-bold',
        outline: 'border-2 border-blue-600/40 dark:border-blue-400/30 text-blue-700 dark:text-blue-300 hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 font-bold',
    };
    const buttonClasses = `${baseStyles} ${variants[variant]} ${className}`;

    if (to) {
        return (
            <Link to={to} className={buttonClasses}>
                {children}
            </Link>
        );
    }

    return (
        <button className={buttonClasses} onClick={onClick} {...props}>
            {children}
        </button>
    );
};

const Card = ({ children, className = '', hover = true }) => {
    const hoverClass = hover ? 'card-hover' : '';
    return (
        <div className={`glass-strong rounded-xl p-6 ${hoverClass} ${className}`}>
            {children}
        </div>
    );
};

const FeatureCard = ({ icon, title, description }) => (
    <Card>
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h3>
        <p className="text-slate-600 dark:text-gray-400">{description}</p>
    </Card>
);

const HackathonCard = ({ id, domain, title, date, participants, venue }) => {
    const navigate = useNavigate();
    const handleViewDetails = () => {
        // Navigate to student hackathons with the selected ID to auto-open details
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
            navigate('/student/hackathons', { state: { hackathonId: id } });
        } else {
            navigate('/get-started');
        }
    };

    return (
        <Card>
            <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-blue-600/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold border border-blue-600/30">
                    {domain}
                </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{title}</h3>
            <div className="space-y-3 mb-6">
                <div className="flex items-center text-slate-700 dark:text-gray-300">
                    <span className="mr-2">📅</span>
                    <span>{date}</span>
                </div>
                <div className="flex items-center text-slate-700 dark:text-gray-300">
                    <span className="mr-2">👥</span>
                    <span>{participants} Participants</span>
                </div>
                <div className="flex items-center text-slate-700 dark:text-gray-300">
                    <span className="mr-2">📍</span>
                    <span>{venue}</span>
                </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleViewDetails}>
                View Details
            </Button>
        </Card>
    );
};

// --- Sections ---

const Navbar = () => {
    const navigate = useNavigate();
    const { isMaintenanceMode, isPublicRegistrationAllowed } = usePlatformSettings();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    const handleScroll = (e, targetId) => {
        e.preventDefault();
        setMobileMenuOpen(false);
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <nav className={`fixed ${isMaintenanceMode ? 'top-8 sm:top-9' : 'top-0'} z-50 w-full border-b border-slate-200 dark:border-gray-800 bg-white/95 dark:bg-navy-900/90 backdrop-blur-md transition-all duration-300 shadow-sm`}>
            <div className="container flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 mx-auto">
                <Link to="/" className="flex items-center gap-2 group shrink-0" onClick={() => setMobileMenuOpen(false)}>
                    <Logo size="sm" className="sm:hidden" />
                    <Logo size="md" className="hidden sm:flex" />
                </Link>

                {/* Desktop Navigation Links */}
                <div className="items-center hidden gap-8 md:flex">
                    <a href="#hackathons" onClick={(e) => handleScroll(e, 'hackathons')} className="text-slate-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-white transition font-medium">Hackathons</a>
                    <a href="#how-it-works" onClick={(e) => handleScroll(e, 'how-it-works')} className="text-slate-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-white transition font-medium">How It Works</a>
                    <a href="#features" onClick={(e) => handleScroll(e, 'features')} className="text-slate-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-white transition font-medium">Features</a>
                    <a href="#roles" onClick={(e) => handleScroll(e, 'roles')} className="text-slate-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-white transition font-medium">Roles</a>
                </div>

                {/* Desktop Action Buttons */}
                <div className="hidden md:flex items-center gap-4">
                    <ThemeToggle />
                    <button onClick={() => navigate('/login')} className="text-slate-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-white transition font-medium text-sm">
                        Sign In
                    </button>
                    {isPublicRegistrationAllowed ? (
                        <Button variant="primary" onClick={() => navigate('/get-started')}>
                            Get Started
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={() => navigate('/login')}>
                            Account Login
                        </Button>
                    )}
                </div>

                {/* Mobile Controls: Sign In, Theme Toggle & Animated Hamburger Toggle */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 md:hidden shrink-0">
                    <button
                        onClick={() => navigate('/login')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors whitespace-nowrap"
                    >
                        Sign In
                    </button>
                    <ThemeToggle variant="button" />
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors focus:outline-none"
                        aria-label="Toggle navigation menu"
                        aria-expanded={mobileMenuOpen}
                    >
                        {mobileMenuOpen ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Sheet / Drawer Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-navy-950/95 backdrop-blur-xl px-5 py-6 shadow-2xl animate-in slide-in-from-top-4 duration-200">
                    <div className="flex flex-col space-y-4">
                        <div className="flex flex-col space-y-2 pb-4 border-b border-slate-100 dark:border-white/10 font-semibold text-base">
                            <a href="#hackathons" onClick={(e) => handleScroll(e, 'hackathons')} className="px-3 py-2 rounded-lg text-slate-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-white/5 transition flex items-center justify-between">
                                <span>Hackathons</span>
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">Browse →</span>
                            </a>
                            <a href="#how-it-works" onClick={(e) => handleScroll(e, 'how-it-works')} className="px-3 py-2 rounded-lg text-slate-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-white/5 transition flex items-center justify-between">
                                <span>How It Works</span>
                                <span className="text-xs text-slate-400">4 Steps</span>
                            </a>
                            <a href="#features" onClick={(e) => handleScroll(e, 'features')} className="px-3 py-2 rounded-lg text-slate-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-white/5 transition">Features</a>
                            <a href="#roles" onClick={(e) => handleScroll(e, 'roles')} className="px-3 py-2 rounded-lg text-slate-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-white/5 transition">Roles</a>
                        </div>

                        <div className="flex flex-col gap-3 pt-1">
                            {isPublicRegistrationAllowed ? (
                                <button
                                    onClick={() => { setMobileMenuOpen(false); navigate('/get-started'); }}
                                    className="w-full py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 text-center transition"
                                >
                                    Get Started Free →
                                </button>
                            ) : (
                                <button
                                    onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                                    className="w-full py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 text-center transition"
                                >
                                    Account Login →
                                </button>
                            )}
                            <button
                                onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                                className="w-full py-3 px-4 rounded-xl font-bold text-slate-700 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-center transition border border-slate-200 dark:border-white/10"
                            >
                                Sign In
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

const Hero = () => {
    const navigate = useNavigate();
    const { platformName, isPublicRegistrationAllowed, isMaintenanceMode } = usePlatformSettings();
    return (
        <section className={`px-4 sm:px-6 ${isMaintenanceMode ? 'pt-36 sm:pt-40' : 'pt-28 sm:pt-36'} pb-14 sm:pb-20`}>
            <div className="container mx-auto text-center max-w-4xl">
                <p className="mb-3 sm:mb-4 text-blue-600 dark:text-blue-400 font-bold tracking-wide uppercase text-xs sm:text-sm">
                    The Ultimate Hackathon Platform
                </p>
                <h1 className="mb-4 sm:mb-6 text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-transparent dark:bg-gradient-to-r dark:from-white dark:to-gray-400 dark:bg-clip-text leading-[1.15] tracking-tight">
                    Build. Compete. Innovate.
                </h1>
                <p className="max-w-2xl mx-auto mb-4 text-lg sm:text-xl font-semibold text-slate-800 dark:text-gray-200">
                    The Platform To Launch and Join Hackathons
                </p>
                <p className="max-w-xl mx-auto mb-8 text-sm sm:text-base text-slate-600 dark:text-gray-400 leading-relaxed">
                    A unified platform powered by <span className="font-bold text-blue-600 dark:text-blue-400">{platformName || 'ProEduvate'}</span> where students, mentors, and organizers collaborate to turn innovative projects into reality.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-xs sm:max-w-none mx-auto">
                    {isPublicRegistrationAllowed ? (
                        <Button variant="primary" className="w-full sm:w-auto text-center justify-center" onClick={() => navigate('/get-started')}>
                            Get Started <span>→</span>
                        </Button>
                    ) : (
                        <Button variant="primary" className="w-full sm:w-auto text-center justify-center" onClick={() => navigate('/login')}>
                            Sign In to Platform <span>→</span>
                        </Button>
                    )}
                    <Button variant="secondary" className="w-full sm:w-auto text-center justify-center" onClick={() => navigate('/get-started')}>
                        Explore Hackathons
                    </Button>
                </div>
            </div>
        </section>
    );
};

const HackathonsSection = () => {
    const [hackathons, setHackathons] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        const loadHackathons = async () => {
            try {
                const formattedData = await fetchHomeHackathons();
                setHackathons(formattedData);
            } catch (err) {
                console.error('Failed to load hackathons:', err);
                setError('Upcoming hackathons are temporarily unavailable.');
            } finally {
                setLoading(false);
            }
        };
        loadHackathons();
    }, []);

    return (
        <section id="hackathons" className="py-12 sm:py-20 px-4 sm:px-6 relative">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10 sm:mb-16">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">
                        Upcoming <span className="gradient-text">Hackathons</span>
                    </h2>
                    <p className="text-base sm:text-xl text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Join exciting hackathons and showcase your skills to the world
                    </p>
                </div>
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {hackathons.map((hackathon, index) => (
                            <HackathonCard key={index} {...hackathon} />
                        ))}
                    </div>
                )}
                {error && !loading && (
                    <p className="text-center text-slate-500 dark:text-gray-500 mt-4">{error}</p>
                )}
            </div>
        </section>
    );
};

const HowItWorksSection = () => {
    const steps = [
        { icon: '👥', title: 'Register & Join', description: 'Create your account and browse through exciting hackathons tailored to your interests.' },
        { icon: '🤝', title: 'Form Team', description: 'Connect with like-minded innovators and build your dream team for the challenge.' },
        { icon: '</>', title: 'Build & Collaborate', description: 'Work together using our integrated tools, chat features, and collaborative workspace.' },
        { icon: '🏆', title: 'Submit & Win', description: 'Submit your project, get evaluated by expert judges, and win amazing prizes.' },
    ];
    return (
        <section id="how-it-works" className="py-12 sm:py-20 px-4 sm:px-6 relative">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10 sm:mb-16">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">
                        How It <span className="gradient-text">Works</span>
                    </h2>
                    <p className="text-base sm:text-xl text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Four simple steps to transform your ideas into reality
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                    {steps.map((step, index) => (
                        <div key={index} className="relative">
                            <Card hover={false} className="text-center h-full">
                                <div className="text-5xl sm:text-6xl mb-4">{step.icon}</div>
                                <div className="absolute -top-3 -left-2 sm:-top-4 sm:-left-4 w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white text-base sm:text-xl shadow-lg shadow-blue-500/30">
                                    {index + 1}
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-3">{step.title}</h3>
                                <p className="text-sm sm:text-base text-slate-600 dark:text-gray-400">{step.description}</p>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const FeaturesSection = () => {
    const features = [
        { icon: '👥', title: 'Team Management', description: 'Effortlessly create, manage, and collaborate with your team members in real-time.' },
        { icon: '💬', title: 'Built-in Chat', description: 'Communicate seamlessly with integrated chat for teams, mentors, and organizers.' },
        { icon: '📤', title: 'Easy Submissions', description: 'Submit your projects with ease through our streamlined submission portal.' },
        { icon: '🎓', title: 'Issue Certificates', description: 'Automatically generate and distribute certificates to participants and winners.' },
        { icon: '🤖', title: 'AI Assistant', description: 'Get intelligent suggestions and support from our AI-powered assistant.' },
        { icon: '🔐', title: 'Role-Based Access', description: 'Secure platform with customized access for organizers, mentors, and students.' },
        { icon: '⚖️', title: 'Evaluation Panel', description: 'Comprehensive judging system with customizable criteria and scoring.' },
        { icon: '⏱️', title: 'Timeline Control', description: 'Manage hackathon phases, deadlines, and milestones with precision.' },
    ];
    return (
        <section id="features" className="py-12 sm:py-20 px-4 sm:px-6 relative">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10 sm:mb-16">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">
                        Premium <span className="gradient-text">Features</span>
                    </h2>
                    <p className="text-base sm:text-xl text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Everything you need to run successful hackathons, all in one place
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {features.map((feature, index) => (
                        <FeatureCard key={index} {...feature} />
                    ))}
                </div>
            </div>
        </section>
    );
};

const RolesSection = () => {
    const roles = [
        {
            icon: '🎯', title: 'Organizer',
            description: 'Create and manage hackathons with powerful tools for event planning, participant management, and evaluation.',
            features: ['Event Dashboard', 'Participant Analytics', 'Certificate Generation', 'Timeline Management'],
        },
        {
            icon: '🎓', title: 'Mentor',
            description: 'Guide and support teams throughout their journey with dedicated mentoring tools and communication channels.',
            features: ['Team Chat', 'Progress Tracking', 'Resource Sharing', 'Feedback System'],
        },
        {
            icon: '👨‍🎓', title: 'Student',
            description: 'Participate in hackathons, collaborate with teams, and showcase your innovative projects to the world.',
            features: ['Team Formation', 'Project Submission', 'Real-time Chat', 'Certificate Access'],
        },
    ];
    return (
        <section id="roles" className="py-12 sm:py-20 px-4 sm:px-6 relative">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10 sm:mb-16">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">
                        Built for <span className="gradient-text">Everyone</span>
                    </h2>
                    <p className="text-base sm:text-xl text-slate-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Tailored experiences for organizers, mentors, and students
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                    {roles.map((role, index) => (
                        <Card key={index}>
                            <div className="text-5xl sm:text-6xl mb-4 text-center">{role.icon}</div>
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-3 text-center">{role.title}</h3>
                            <p className="text-sm sm:text-base text-slate-600 dark:text-gray-400 mb-6 text-center">{role.description}</p>
                            <div className="space-y-2 mb-6">
                                {role.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center text-xs sm:text-sm text-slate-700 dark:text-gray-300">
                                        <span className="mr-2 text-blue-600 dark:text-blue-400 font-bold">✓</span>
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" className="w-full" onClick={() => navigate('/get-started')}>
                                Learn More
                            </Button>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};

const CTASection = () => {
    const navigate = useNavigate();
    return (
        <section className="px-4 sm:px-6 py-12 sm:py-20 bg-blue-50/60 dark:bg-navy-900/50 border border-blue-100 dark:border-white/5 rounded-2xl sm:rounded-3xl max-w-7xl mx-4 sm:mx-auto mb-16 shadow-sm">
            <div className="container mx-auto text-center">
                <h2 className="mb-4 text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white md:text-5xl leading-tight">
                    Ready to Transform<br />Your Hackathon Experience?
                </h2>
                <p className="max-w-2xl mx-auto mb-8 text-sm sm:text-base text-slate-600 dark:text-gray-400">
                    Join thousands of students, mentors, and organizers in the world's leading hackathon platform.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 max-w-xs sm:max-w-none mx-auto">
                    <Button variant="primary" className="w-full sm:w-auto text-center justify-center" onClick={() => navigate('/get-started')}>
                        Get Started Now <span>→</span>
                    </Button>
                    <Button variant="secondary" className="w-full sm:w-auto text-center justify-center" onClick={() => navigate('/get-started')}>Schedule Demo</Button>
                </div>
            </div>
        </section>
    );
};

// --- Main Page ---

const Home = () => {
    const navigate = useNavigate();

    React.useEffect(() => {
        // Session Intelligence: Auto-redirect authenticated users
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        const userRole = sessionStorage.getItem('userRole');

        if (isLoggedIn && userRole) {
            navigate(`/${userRole}/dashboard`);
        }
    }, [navigate]);

    return (
        <>
            <Navbar />
            <main className="flex-grow">
                <Hero />
                <HackathonsSection />
                <HowItWorksSection />
                <FeaturesSection />
                <RolesSection />
                <CTASection />
            </main>
        </>
    );
};

export default Home;
