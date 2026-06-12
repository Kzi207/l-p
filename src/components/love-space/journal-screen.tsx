"use client";

import { useState } from "react";

import { useCouple } from "@/hooks/useCouple";
import { useJournals } from "@/hooks/useJournals";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CoupleGate } from "@/components/love-space/couple-gate";
import { SectionHeader } from "@/components/love-space/section-header";

export function JournalScreen() {
  const { data: couple, loading: coupleLoading } = useCouple();
  const { data, createJournal, deleteJournal } = useJournals();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!coupleLoading && !couple) {
    return <CoupleGate />;
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await createJournal({ title, content });
      setTitle("");
      setContent("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save journal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Journal"
        title="Write and store shared journals in Postgres"
        description="Every journal entry is tied to the current couple and author, then shown through the real list API."
      />

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <h3 className="text-xl font-semibold tracking-[-0.04em]">Create entry</h3>
          <div className="mt-5 space-y-3">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write something worth remembering..."
            />
            <Button onClick={handleSubmit} disabled={submitting}>
              Save journal
            </Button>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            {data.length > 0 ? (
              data.map((journal) => (
                <div key={journal.id} className="rounded-[24px] border border-black/6 bg-white/75 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">{journal.title}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {journal.author.name} · {new Date(journal.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void deleteJournal(journal.id)}
                    >
                      Delete
                    </Button>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                    {journal.content}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No journals yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
