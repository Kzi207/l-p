"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { LocketLinkModal } from "@/components/locket/locket-link-modal";
import type { LocketAccountInfo } from "@/types/firestore";

export function LocketAuthGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile, loading } = useCoupleSpace();
  const [showLinkModal, setShowLinkModal] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      // Nếu user đã đăng nhập, profile đã load, nhưng chưa có locketAccount
      if (!profile.locketAccount || !profile.locketAccount.uid) {
        setShowLinkModal(true);
      } else {
        setShowLinkModal(false);
      }
    } else {
      setShowLinkModal(false);
    }
  }, [user, profile, loading]);

  function handleLinkSuccess(account: LocketAccountInfo) {
    if (profile) {
      profile.locketAccount = account;
    }
    setShowLinkModal(false);
  }

  return (
    <>
      {children}
      <LocketLinkModal
        open={showLinkModal}
        onSuccess={handleLinkSuccess}
        canClose={false}
      />
    </>
  );
}

