import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Trophy,
  Users,
  Inbox,
  Calendar,
  MessageSquare,
  BookOpen,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  CheckSquare,
  ClipboardCheck,
  Sparkles
} from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import { useMentor } from '../../context/MentorContext';
import { useAuth } from '../../context/AuthContext';
import ScheduleSessionModal from './ScheduleSessionModal';
import AcceptRequestModal from './AcceptRequestModal';
import HelpSupportModal from './HelpSupportModal';
import ToastContainer from './ToastContainer';
import apiClient from '../../api/api';

export default function MentorLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutUser } = useAuth();
  const { openHelpModal, globalSearch, setGlobalSearch, addToast } = useMentor();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const menuButtonRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Close drawer and dropdowns on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawerOpen(false);
    setProfileDropdownOpen(false);
    setNotificationDropdownOpen(false);
  }, [location.pathname]);

  // Prevent background scrolling when drawer is open and manage initial focus
  useEffect(() => {
    if (drawerOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      closeButtonRef.current?.focus();
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [drawerOpen]);

  // Click outside to close dropdowns and Escape key to close drawer/dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (drawerOpen) {
          setDrawerOpen(false);
          menuButtonRef.current?.focus();
        }
        setProfileDropdownOpen(false);
        setNotificationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawerOpen]);

  // Reactive user profile state
  const [user, setUser] = useState(() => {
    try {
      const sess = sessionStorage.getItem('user');
      const loc = localStorage.getItem('user');
      return JSON.parse(sess || loc || '{"name": "Mentor", "role": "mentor"}');
    } catch {
      return { name: 'Mentor', role: 'mentor' };
    }
  });

  useEffect(() => {
    const handleUserUpdate = () => {
      try {
        const u = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('user-update', handleUserUpdate);
    return () => window.removeEventListener('user-update', handleUserUpdate);
  }, []);

  // User initials
  const initials = useMemo(() => {
    const parts = (user?.name || 'Mentor User').trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0] ? parts[0].slice(0, 2) : 'ME').toUpperCase();
  }, [user?.name]);

  const [notifications, setNotifications] = useState([]);

  const loadNotifications = async () => {
    try {
      const { data } = await apiClient.get('/inbox/', { params: { limit: 50 } });
      setNotifications((data || []).map((item) => ({
        id: item.id || item._id,
        title: item.type === 'mentor_request' ? 'New Mentorship Request' : item.type === 'meeting_reminder' ? 'Upcoming Session' : item.type === 'mentor_feedback' ? 'Mentor Feedback' : 'Platform Update',
        detail: item.message,
        time: item.createdAt ? new Date(item.createdAt).toLocaleString() : '',
        read: Boolean(item.read),
        link: item.type === 'mentor_request' ? '/mentor/requests' : item.type === 'meeting_reminder' ? '/mentor/sessions' : item.type === 'mentor_feedback' ? '/mentor/feedback' : '/mentor/teams',
      })));
    } catch (error) {
      console.error('Mentor notifications could not be loaded:', error);
    }
  };

  useEffect(() => { loadNotifications(); }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    const unread = notifications.filter((item) => !item.read);
    try {
      await Promise.all(unread.map((item) => apiClient.put(`/inbox/${item.id}/read`)));
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    } catch (error) {
      addToast('Could not update notifications', error.response?.data?.detail || 'Please try again.', 'error');
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login', { replace: true });
  };

  // Drawer Navigation Items (Core Mentor Navigation)
  const drawerNavItems = [
    { name: 'Dashboard', path: '/mentor/dashboard', icon: LayoutDashboard },
    { name: 'Hackathons', path: '/mentor/hackathons', icon: Trophy },
    { name: 'My Teams', path: '/mentor/teams', icon: Users },
    { name: 'Mentorship Requests', path: '/mentor/requests', icon: Inbox, badge: unreadCount || 3 },
    { name: 'Team Chat', path: '/mentor/messages', icon: MessageSquare },
    { name: 'Meetings / Schedule Sessions', path: '/mentor/sessions', icon: Calendar },
    { name: 'Feedback Management', path: '/mentor/feedback', icon: CheckSquare },
    { name: 'Submissions / Review Teams', path: '/mentor/reviews', icon: ClipboardCheck },
    { name: 'Resources', path: '/mentor/resources', icon: BookOpen },
    { name: 'AI Assistant', path: '/mentor/ai-co-mentor', icon: Sparkles },
  ];

  // Drawer Secondary Navigation Items (Account & Settings)
  const drawerSecondaryNavItems = [
    { name: 'Mentor Profile', path: '/mentor/profile', icon: User },
    { name: 'Settings', path: '/mentor/settings', icon: Settings },
  ];

  // Active status helper
  const isItemActive = (path) => {
    const current = location.pathname;
    if (path === '/mentor/dashboard') {
      return (
        current === '/mentor' ||
        current === '/mentor/' ||
        current === '/mentor/dashboard'
      );
    }
    if (path === '/mentor/requests') {
      return (
        current === '/mentor/requests' ||
        current.startsWith('/mentor/requests/') ||
        current === '/mentor/mentorship-requests' ||
        current.startsWith('/mentor/mentorship-requests/')
      );
    }
    if (path === '/mentor/resources') {
      return (
        current === '/mentor/resources' ||
        current.startsWith('/mentor/resources/') ||
        current === '/mentor/materials' ||
        current.startsWith('/mentor/materials/')
      );
    }
    if (path === '/mentor/teams') {
      return (
        current === '/mentor/teams' ||
        current.startsWith('/mentor/teams/') ||
        current === '/mentor/assigned-teams' ||
        current === '/mentor/discover-teams' ||
        current === '/mentor/create-team'
      );
    }
    return current === path || current.startsWith(`${path}/`);
  };

  // Dynamic header titles based on pathname
  const headerMeta = useMemo(() => {
    const p = location.pathname;
    if (p.includes('/mentor/hackathons')) {
      return {
        title: 'My Hackathons',
        subtitle: 'Track active cohorts, timelines, and hackathons you are currently guiding.',
      };
    }
    if (p.includes('/mentor/teams/') && (p.includes('/workspace') || p.match(/\/mentor\/teams\/[^/]+$/))) {
      return {
        title: 'Team Mentorship Workspace',
        subtitle: 'In-depth team progress, milestone tracking, architecture, and live feedback.',
      };
    }
    if (p.includes('/mentor/teams')) {
      return {
        title: 'Mentored Teams',
        subtitle: 'Review, guide, and manage your active hackathon cohort assignments.',
      };
    }
    if (p.includes('/mentor/requests') || p.includes('/mentor/mentorship-requests')) {
      return {
        title: 'Mentorship Requests',
        subtitle: 'Review and respond to incoming mentorship requests from hackathon teams.',
      };
    }
    if (p.includes('/mentor/sessions')) {
      return {
        title: 'Sessions & Consultations',
        subtitle: 'Schedule, manage, and conduct focused mentorship sessions with teams.',
      };
    }
    if (p.includes('/mentor/messages')) {
      return {
        title: 'Team Messages & Channels',
        subtitle: 'Direct communication channels with your mentored hackathon teams.',
      };
    }
    if (p.includes('/mentor/resources') || p.includes('/mentor/materials')) {
      return {
        title: 'Resources & Materials',
        subtitle: 'Share guides, code templates, architecture docs, and design kits.',
      };
    }
    if (p.includes('/mentor/profile')) {
      return {
        title: 'Mentor Profile',
        subtitle: 'Manage your professional background, competencies, and achievements.',
      };
    }
    if (p.includes('/mentor/settings')) {
      return {
        title: 'Mentor Settings',
        subtitle: 'Configure your availability, mentoring preferences, and notification channels.',
      };
    }
    if (p.includes('/mentor/feedback')) {
      return {
        title: 'Team Evaluations & Feedback',
        subtitle: 'Comprehensive rubric scoring and structured team feedback.',
      };
    }
    if (p.includes('/mentor/reviews')) {
      return {
        title: 'Submissions / Review Teams',
        subtitle: 'Review milestone progress, inspect submissions, and provide evaluation scores.',
      };
    }
    if (p.includes('/mentor/ai-co-mentor')) {
      return {
        title: 'AI Assistant',
        subtitle: 'Intelligent co-mentor guidance, architecture review, and feedback suggestions.',
      };
    }
    return {
      title: 'Mentor Dashboard',
      subtitle: 'Guide teams, share expertise, and help participants build better projects.',
    };
  }, [location.pathname]);

  return (
    <div className="flex flex-col h-screen w-full bg-[#F8F9FD] dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      {/* Toast Notifications */}
      <ToastContainer />

      {/* Modals */}
      <ScheduleSessionModal />
      <AcceptRequestModal />
      <HelpSupportModal />

      {/* ================================================== */}
      {/* TOP HEADER (Full-Width) */}
      {/* ================================================== */}
      <header className="h-18 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#111625] border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between shrink-0 shadow-xs z-30 transition-colors">
        {/* Left: Brand Logo & Route Title */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <Link to="/mentor/dashboard" className="flex items-center gap-2.5 shrink-0 group">
            <img
              src="/proeduvate-dark-text.png"
              alt="ProEduvate"
              className="h-8 w-auto object-contain dark:hidden transition-transform group-hover:scale-105"
            />
            <img
              src="/proeduvatee-removebg-preview.png"
              alt="ProEduvate"
              className="h-8 w-auto object-contain hidden dark:block transition-transform group-hover:scale-105"
            />
            <span className="hidden xl:inline-block text-[11px] font-semibold tracking-tight text-slate-400 dark:text-slate-500 pl-3 border-l border-slate-200 dark:border-white/10">
              Mentor Workspace
            </span>
          </Link>

          {/* Current Page Title */}
          <div className="min-w-0 hidden md:block">
            <h1 className="text-lg lg:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {headerMeta.title}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden lg:block">
              {headerMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Search, Notifications, Theme Toggle, Profile, Hamburger Menu */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Search input (interactive) */}
          <div className="relative hidden md:block w-48 lg:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search teams, sessions..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#5B45D9] focus:bg-white transition-all shadow-2xs"
            />
            {globalSearch && (
              <button
                onClick={() => setGlobalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Notification Bell Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationDropdownOpen((prev) => !prev)}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#5B45D9] ring-2 ring-white dark:ring-[#111625]" />
              )}
            </button>

            {/* Notification Popover */}
            {notificationDropdownOpen && (
              <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-16 sm:top-full mt-2 w-auto sm:w-96 max-w-sm mx-auto sm:mx-0 bg-white dark:bg-navy-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-50 animate-in fade-in-50 duration-150">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-[#FAFAFD] dark:bg-navy-950/40">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Notifications ({unreadCount})
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] font-semibold text-[#5B45D9] dark:text-purple-300 hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={async () => {
                        setNotificationDropdownOpen(false);
                        if (!notif.read) {
                          try {
                            await apiClient.put(`/inbox/${notif.id}/read`);
                            setNotifications((items) => items.map((item) => item.id === notif.id ? { ...item, read: true } : item));
                          } catch (error) {
                            addToast('Notification not updated', error.response?.data?.detail || 'Please try again.', 'error');
                          }
                        }
                        if (notif.link) navigate(notif.link);
                      }}
                      className={`p-3.5 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors ${
                        !notif.read ? 'bg-purple-50/30 dark:bg-purple-950/15' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-white">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">{notif.time}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {notif.detail}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="p-2.5 text-center border-t border-slate-100 dark:border-white/10 bg-[#FAFAFD] dark:bg-navy-950/40">
                  <Link
                    to="/mentor/requests"
                    onClick={() => setNotificationDropdownOpen(false)}
                    className="text-xs font-bold text-[#5B45D9] dark:text-purple-300 hover:underline flex items-center justify-center gap-1"
                  >
                    View all mentorship requests <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <ThemeToggle variant="button" />

          {/* User Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100/80 dark:hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#5B45D9] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs shadow-purple-500/20">
                {initials}
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">
                  {user?.name || 'Mentor'}
                </p>
                <p className="text-[10px] font-medium text-slate-400 leading-tight">
                  Mentor
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-navy-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-50 animate-in fade-in-50 duration-150 p-1.5">
                <div className="px-3 py-2.5 border-b border-slate-100 dark:border-white/5 mb-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.name || 'Mentor User'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {user?.email || 'mentor@proeduvate.com'}
                  </p>
                </div>

                <Link
                  to="/mentor/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>View Profile</span>
                </Link>

                <Link
                  to="/mentor/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Account Settings</span>
                </Link>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    openHelpModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span>Help & FAQs</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-white/5" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />

          {/* ☰ HAMBURGER MENU BUTTON */}
          <button
            ref={menuButtonRef}
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-expanded={drawerOpen}
            aria-controls="mentor-sidebar-drawer"
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-navy-950 hover:bg-[#F2EEFD] hover:border-[#5B45D9]/40 hover:text-[#5B45D9] dark:hover:bg-purple-950/30 dark:hover:text-purple-300 text-slate-700 dark:text-slate-200 transition-all shadow-xs flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#5B45D9]/20 focus-visible:ring-2 focus-visible:ring-[#5B45D9]"
            aria-label="Open Navigation Menu"
            title="Open Navigation Menu"
          >
            <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            <span className="hidden sm:inline text-xs font-bold">Menu</span>
          </button>
        </div>
      </header>

      {/* ================================================== */}
      {/* SLIDE-OUT NAVIGATION DRAWER */}
      {/* ================================================== */}
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Drawer Menu */}
      <aside
        id="mentor-sidebar-drawer"
        className={`fixed inset-y-0 right-0 z-50 w-72 sm:w-80 md:w-84 max-w-[85vw] bg-white dark:bg-[#111625] border-l border-slate-200/80 dark:border-white/10 shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${
          drawerOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-full opacity-0 invisible pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!drawerOpen}
        aria-label="Mentor Navigation Sidebar"
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-[#FAFAFD] dark:bg-navy-950/40 shrink-0">
          <Link
            to="/mentor/dashboard"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45D9] rounded-lg"
            aria-label="HackZen Mentor Workspace"
          >
            <img
              src="/proeduvate-dark-text.png"
              alt="HackZen"
              className="h-7 w-auto object-contain dark:hidden transition-transform group-hover:scale-105"
            />
            <img
              src="/proeduvatee-removebg-preview.png"
              alt="HackZen"
              className="h-7 w-auto object-contain hidden dark:block transition-transform group-hover:scale-105"
            />
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-[#5B45D9] dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-500/20">
              Mentor Workspace
            </span>
          </Link>
          <button
            ref={closeButtonRef}
            onClick={() => {
              setDrawerOpen(false);
              menuButtonRef.current?.focus();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45D9]"
            aria-label="Close navigation sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Navigation Links */}
        <nav
          className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1 min-h-0"
          aria-label="Mentor Navigation Links"
        >
          <div className="px-3.5 pb-2 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            Workspace Navigation
          </div>
          {drawerNavItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.path);

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setDrawerOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45D9] ${
                  active
                    ? 'bg-[#F2EEFD] text-[#5B45D9] font-bold dark:bg-[#5B45D9]/20 dark:text-purple-300 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      active
                        ? 'text-[#5B45D9] dark:text-purple-300'
                        : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
                {item.badge ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#5B45D9] text-white dark:bg-purple-600">
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}

          {/* Divider between Workspace and Account */}
          <div className="my-2.5 border-t border-slate-100 dark:border-white/10" />

          {/* Secondary Account Group */}
          <div className="px-3.5 pb-2 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            Account & Settings
          </div>
          {drawerSecondaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.path);

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setDrawerOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45D9] ${
                  active
                    ? 'bg-[#F2EEFD] text-[#5B45D9] font-bold dark:bg-[#5B45D9]/20 dark:text-purple-300 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      active
                        ? 'text-[#5B45D9] dark:text-purple-300'
                        : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Drawer Footer (User Card & Help) */}
        <div className="p-3.5 border-t border-slate-100 dark:border-white/10 space-y-2 bg-[#FAFAFD]/60 dark:bg-navy-950/40 shrink-0 mt-auto">
          <button
            onClick={() => {
              setDrawerOpen(false);
              openHelpModal();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45D9]"
            aria-label="Open Help & FAQs"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Help & FAQs</span>
          </button>

          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-white/5 shadow-2xs">
            <Link
              to="/mentor/profile"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B45D9] rounded-lg p-0.5"
              aria-label="View Mentor Profile"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || 'Mentor'}
                  className="w-8 h-8 rounded-full object-cover shrink-0 shadow-xs border border-purple-200/50 dark:border-purple-500/20"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#5B45D9] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs shadow-purple-500/20">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.name || user?.fullName || 'Mentor'}
                </p>
                <p className="text-[10px] font-semibold text-[#5B45D9] dark:text-purple-300">
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Mentor'}
                </p>
              </div>
            </Link>
            <button
              onClick={() => {
                setDrawerOpen(false);
                handleLogout();
              }}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ================================================== */}
      {/* MAIN CONTENT OUTLET (Full-Width) */}
      {/* ================================================== */}
      <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
