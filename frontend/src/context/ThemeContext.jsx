/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
    theme: 'light',
    toggleTheme: () => {},
    setTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(() => {
        const savedTheme = localStorage.getItem('theme') || localStorage.getItem('hackzen-theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
            return savedTheme;
        }
        return 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        if (theme === 'light') {
            root.classList.add('light');
            root.classList.remove('dark');
            root.style.colorScheme = 'light';
        } else {
            root.classList.add('dark');
            root.classList.remove('light');
            root.style.colorScheme = 'dark';
        }
        localStorage.setItem('theme', theme);
        localStorage.setItem('hackzen-theme', theme);
        window.dispatchEvent(new Event('theme-change'));
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
    }, [theme]);

    const toggleTheme = () => {
        setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    const setTheme = (newTheme) => {
        if (newTheme === 'light' || newTheme === 'dark') {
            setThemeState(newTheme);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;
