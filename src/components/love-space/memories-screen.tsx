"use client";

import { useState } from "react";

import { useCouple } from "@/hooks/useCouple";
import { useMemories } from "@/hooks/useMemories";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CoupleGate } from "@/components/love-space/couple-gate";
import { SectionHeader } from "@/components/love-space/section-header";

export function MemoriesScreen() {
  const { data: couple, loading: coupleLoading } = useCouple();
  const { data, createMemory, deleteMemory, uploadFile, loading } = useMemories();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!coupleLoading && !couple) {
    return <CoupleGate />;
  }

  const handleSubmit = async () => {
    if (!file) {
      setError("Please choose an image first.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const imageUrl = await uploadFile(file);
      await createMemory({ imageUrl, caption });
      setCaption("");
      setFile(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to upload memory");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Memories"
        title="Upload memories to Catbox and save references in Neon"
        description="The image file goes to Catbox.moe, while the database only stores the image URL and metadata."
        action={<Button variant="secondary">Auto refresh {loading ? "..." : "on"}</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <h3 className="text-xl font-semibold tracking-[-0.04em]">New memory</h3>
          <div className="mt-5 space-y-3">
            <Input
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Input
              placeholder="A short caption for this memory"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
            <Button onClick={handleSubmit} disabled={submitting}>
              Upload memory
            </Button>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
          </div>
        </Card>

        <Card>
          <div className="grid auto-rows-[220px] gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.length > 0 ? (
              data.map((memory) => (
                <div key={memory.id} className="overflow-hidden rounded-[28px] border border-black/6 bg-white/80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={memory.imageUrl}
                    alt={memory.caption}
                    className="h-40 w-full object-cover"
                  />
                  <div className="p-4">
                    <p className="font-semibold">{memory.caption}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{memory.author.name}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={() => void deleteMemory(memory.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full rounded-[24px] border border-dashed border-black/10 p-6 text-sm text-[var(--color-muted)]">
                No uploaded memories yet.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
