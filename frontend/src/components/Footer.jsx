import React from 'react';
import Logo from './Logo';
import { usePlatformSettings } from '../context/PlatformSettingsContext';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    const { platformName, supportEmail, supportPhone, website } = usePlatformSettings();

    const footerLinks = {
        platform: [
            { name: 'Browse Hackathons', href: '#hackathons' },
            { name: 'Host Event', href: '#' },
            { name: 'Pricing', href: '#' },
            { name: 'Features', href: '#features' },
        ],
        resources: [
            { name: 'Documentation', href: '#' },
            { name: 'API Reference', href: '#' },
            { name: 'Community', href: '#' },
            { name: 'Blog', href: '#' },
        ],
        legal: [
            { name: 'Privacy Policy', href: '#' },
            { name: 'Terms of Service', href: '#' },
            { name: 'Cookie Policy', href: '#' },
            { name: 'GDPR', href: '#' },
        ],
        company: [
            { name: 'Official Website', href: website || 'https://proeduvate.com' },
            { name: `Support: ${supportEmail || 'support@proeduvate.com'}`, href: `mailto:${supportEmail || 'support@proeduvate.com'}` },
            { name: `Hotline: ${supportPhone || '+91 800 123 4567'}`, href: `tel:${supportPhone || '+91 800 123 4567'}` },
            { name: 'Partners', href: '#' },
        ],
    };

    const socialLinks = [
        { name: 'Twitter', icon: '𝕏', href: '#' },
        { name: 'LinkedIn', icon: '💼', href: '#' },
        { name: 'GitHub', icon: '⚡', href: '#' },
        { name: 'Discord', icon: '💬', href: '#' },
    ];

    return (
        <footer className="bg-slate-100 dark:bg-navy-800 border-t border-slate-200 dark:border-white/10 py-12 px-6 transition-colors duration-200">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-8">
                    {/* Logo and Description */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center space-x-3 mb-4">
                            <Logo size="lg" />
                        </div>
                        <p className="text-slate-600 dark:text-gray-400 mb-4 max-w-sm">
                            Empowering innovation through hackathons. Build, compete, and innovate with the best platform for organizers and participants.
                        </p>
                        <div className="flex space-x-4">
                            {socialLinks.map((social, index) => (
                                <a
                                    key={index}
                                    href={social.href}
                                    className="w-10 h-10 bg-white dark:bg-navy-900/60 border border-slate-200 dark:border-white/10 rounded-lg flex items-center justify-center text-xl text-slate-700 dark:text-white hover:bg-purple-50 dark:hover:bg-purple-600/20 hover:text-purple-600 transition-colors shadow-sm"
                                    aria-label={social.name}
                                >
                                    {social.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Platform Links */}
                    <div>
                        <h3 className="text-slate-900 dark:text-white font-semibold mb-4">Platform</h3>
                        <ul className="space-y-2">
                            {footerLinks.platform.map((link, index) => (
                                <li key={index}>
                                    <a href={link.href} className="text-slate-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-white transition-colors">
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources Links */}
                    <div>
                        <h3 className="text-slate-900 dark:text-white font-semibold mb-4">Resources</h3>
                        <ul className="space-y-2">
                            {footerLinks.resources.map((link, index) => (
                                <li key={index}>
                                    <a href={link.href} className="text-slate-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-white transition-colors">
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h3 className="text-slate-900 dark:text-white font-semibold mb-4">Legal</h3>
                        <ul className="space-y-2">
                            {footerLinks.legal.map((link, index) => (
                                <li key={index}>
                                    <a href={link.href} className="text-slate-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-white transition-colors">
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h3 className="text-slate-900 dark:text-white font-semibold mb-4">Company</h3>
                        <ul className="space-y-2">
                            {footerLinks.company.map((link, index) => (
                                <li key={index}>
                                    <a href={link.href} className="text-slate-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-white transition-colors">
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-slate-200 dark:border-white/10 pt-8 flex justify-center">
                    <p className="text-slate-500 dark:text-gray-400 text-sm text-center">
                        © {currentYear} {platformName || 'ProEduvate'}. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
