/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';

const MentorContext = createContext(null);

export const MentorProvider = ({ children }) => {
  // Toast notifications
  const [toasts, setToasts] = useState([]);
  
  const addToast = useCallback((title, message = '', type = 'success') => {
    const id = Date.now() + Math.random().toString(36).slice(2, 7);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleModalData, setScheduleModalData] = useState({});

  const openScheduleModal = useCallback((data = {}) => {
    setScheduleModalData(data);
    setIsScheduleModalOpen(true);
  }, []);

  const closeScheduleModal = useCallback(() => {
    setIsScheduleModalOpen(false);
    setScheduleModalData({});
  }, []);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestModalData, setRequestModalData] = useState(null);

  const openRequestModal = useCallback((request) => {
    setRequestModalData(request);
    setIsRequestModalOpen(true);
  }, []);

  const closeRequestModal = useCallback(() => {
    setIsRequestModalOpen(false);
    setRequestModalData(null);
  }, []);

  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const openHelpModal = useCallback(() => setIsHelpModalOpen(true), []);
  const closeHelpModal = useCallback(() => setIsHelpModalOpen(false), []);

  // Global search query
  const [globalSearch, setGlobalSearch] = useState('');

  // Refresh counters to trigger data re-fetching across mentor pages
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <MentorContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        isScheduleModalOpen,
        scheduleModalData,
        openScheduleModal,
        closeScheduleModal,
        isRequestModalOpen,
        requestModalData,
        openRequestModal,
        closeRequestModal,
        isHelpModalOpen,
        openHelpModal,
        closeHelpModal,
        globalSearch,
        setGlobalSearch,
        refreshKey,
        triggerRefresh,
      }}
    >
      {children}
    </MentorContext.Provider>
  );
};

export const useMentor = () => {
  const context = useContext(MentorContext);
  if (!context) {
    throw new Error('useMentor must be used within a MentorProvider');
  }
  return context;
};

export default MentorContext;
