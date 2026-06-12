"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

import { useCouple } from "@/hooks/useCouple";
import { SectionHeader } from "@/components/love-space/section-header";
import { CoupleGate } from "@/components/love-space/couple-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function SettingsScreen() {
  const { data: session } = useSession();
  const { data: couple, loading: coupleLoading, updateCouple } = useCouple();
  const [startDate, setStartDate] = useState("");

  if (!coupleLoading && !couple) {
    return <CoupleGate />;
  }

  const fallbackStartDate = couple?.startDate ? couple.startDate.slice(0, 10) : "";

  const handleSave = async () => {
    const nextStartDate = startDate || fallbackStartDate;
    if (!nextStartDate) {
      return;
    }

    await updateCouple({ startDate: new Date(nextStartDate).toISOString() });
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Settings"
        title="Couple setup and account details"
        description="Update the relationship start date here. Auth is handled by Auth.js credentials login."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="text-xl font-semibold tracking-[-0.04em]">Current user</h3>
          <div className="mt-5 space-y-3 text-sm text-zinc-700">
            <p>Name: {session?.user?.name}</p>
            <p>Email: {session?.user?.email}</p>
            <p>User ID: {session?.user?.id}</p>
          </div>
        </Card>

        <Card>
          <h3 className="text-xl font-semibold tracking-[-0.04em]">Couple details</h3>
          <div className="mt-5 space-y-3">
            <Input value={couple?.code ?? ""} readOnly />
            <Input
              type="date"
              value={startDate || fallbackStartDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <Button onClick={handleSave}>Save start date</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
