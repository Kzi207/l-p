"use client";

import { useCouple } from "@/hooks/useCouple";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { CoupleSettings } from "@/components/settings/CoupleSettings";
import { InviteCodeCard } from "@/components/settings/InviteCodeCard";
import { DangerZone } from "@/components/settings/DangerZone";
import { LoadingCard } from "@/components/shared/LoadingCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { CoupleGate } from "@/components/love-space/couple-gate";
import type { Couple } from "@/types/user";

export default function SettingsPage() {
  const { couple, loading, error, updateCouple, reload } = useCouple();

  const handleCoupleUpdate = async (payload: Partial<Couple>) => {
    if (payload.startDate) {
      await updateCouple({
        startDate: new Date(payload.startDate).toISOString(),
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 select-none animate-pulse">
        <PageHeader title="Cài đặt" description="Đang tải cấu hình..." />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LoadingCard lines={4} />
          <LoadingCard lines={4} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Lỗi tải cài đặt"
        description={error.message || "Không thể lấy thông tin cấu hình."}
        onRetry={reload}
      />
    );
  }

  if (!couple) {
    return <CoupleGate />;
  }

  const currentUser = {
    id: couple.partner1.id,
    name: couple.partner1.name,
    email: couple.partner1.email,
    avatar: couple.partner1.avatar,
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6 select-none">
      <PageHeader
        title="Cài đặt hệ thống"
        description="Quản lý cài đặt tài khoản cá nhân, thông tin cặp đôi và các kết nối bảo mật."
      />

      <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-2">
        <div className="space-y-6">
          <ProfileSettings user={currentUser} />
          <CoupleSettings couple={couple} onUpdate={handleCoupleUpdate} />
        </div>

        <div className="space-y-6">
          <InviteCodeCard code={couple.inviteCode} />
          <DangerZone />
        </div>
      </div>
    </div>
  );
}
