"use client";

import { ReactNode } from "react";

interface JournalLayoutProps {
  sidebar: ReactNode;
  content: ReactNode;
  showContentMobile: boolean;
}

export function JournalLayout({
  sidebar,
  content,
  showContentMobile,
}: JournalLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 h-[calc(100vh-170px)] lg:h-[calc(100vh-160px)] overflow-hidden relative select-none">
      {/* Sidebar List */}
      <div className={`h-full ${showContentMobile ? "hidden lg:block" : "block"}`}>
        {sidebar}
      </div>

      {/* Editor Content Area */}
      <div className={`h-full relative ${showContentMobile ? "block" : "hidden lg:block"}`}>
        {content}
      </div>
    </div>
  );
}
