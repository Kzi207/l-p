import { useState, useEffect } from "react";
import type { CoupleResponse } from "@/types/contracts";
import { usePollingResource } from "@/hooks/use-polling-resource";
import { apiClient } from "@/services/api-client";

const getFallbackAvatar = (name: string) =>
  `https://ui-avatars.com/api/?background=FFE4E6&color=E11D48&bold=true&name=${encodeURIComponent(name)}`;

function toLegacyCouple(couple: CoupleResponse | null, customAvatar: string | null = null) {
  if (!couple) {
    return null;
  }

  const [partner1, partner2] = couple.users;

  return {
    id: couple.id,
    startDate: couple.startDate ? couple.startDate.slice(0, 10) : "",
    inviteCode: couple.code,
    partner1: {
      id: partner1?.id ?? "partner-1",
      name: partner1?.name ?? "Bạn",
      avatar: customAvatar || partner1?.avatar || getFallbackAvatar(partner1?.name ?? "Bạn"),
      email: partner1?.email,
    },
    partner2: {
      id: partner2?.id ?? "partner-2",
      name: partner2?.name ?? "Nửa kia",
      avatar: partner2?.avatar || (partner2?.name ? getFallbackAvatar(partner2.name) : getFallbackAvatar("?")),
      email: partner2?.email,
    },
  };
}

export function useCouple() {
  const resource = usePollingResource<CoupleResponse | null>("/api/couples/me", {
    initialData: null,
    intervalMs: 10000,
  });

  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  useEffect(() => {
    const loadAvatar = () => {
      const partner1 = resource.data?.users[0];
      if (partner1?.id && typeof window !== "undefined") {
        setCustomAvatar(localStorage.getItem(`custom-avatar-${partner1.id}`));
      }
    };

    loadAvatar();
    window.addEventListener("storage", loadAvatar);
    window.addEventListener("avatar-updated", loadAvatar);

    return () => {
      window.removeEventListener("storage", loadAvatar);
      window.removeEventListener("avatar-updated", loadAvatar);
    };
  }, [resource.data]);

  const createCouple = async (payload: { startDate?: string }) => {
    const couple = await apiClient<CoupleResponse>("/api/couples/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    resource.setData(couple);
    return couple;
  };

  const joinCouple = async (payload: { code: string }) => {
    const couple = await apiClient<CoupleResponse>("/api/couples/join", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    resource.setData(couple);
    return couple;
  };

  const updateCouple = async (payload: { startDate: string }) => {
    const couple = await apiClient<CoupleResponse>("/api/couples/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    resource.setData(couple);
    return couple;
  };

  return {
    ...resource,
    couple: toLegacyCouple(resource.data, customAvatar),
    createCouple,
    joinCouple,
    updateCouple,
  };
}
