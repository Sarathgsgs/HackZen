import React from 'react';
import TeamChat from '../../components/TeamChat';

export default function MentorMessages() {
  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12 animate-in fade-in duration-300 font-sans">
      {/* 3-Column Team Chat Interface (Matching Reference Image 2) */}
      <TeamChat customHeight="h-[calc(100vh-160px)] min-h-[620px]" />
    </div>
  );
}
