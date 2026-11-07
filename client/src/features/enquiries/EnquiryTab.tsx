import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMyEnquiries, submitEnquiry } from "../../lib/api-client";

interface EnquiryTabProps {
  parcelId: string;
}

export function EnquiryTab({ parcelId }: EnquiryTabProps) {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const enquiriesQuery = useQuery({
    queryKey: ["enquiries", "mine"],
    queryFn: getMyEnquiries,
  });
  const submitMutation = useMutation({
    mutationFn: async (value: string) => submitEnquiry(parcelId, value),
    onSuccess: async () => {
      setQuestion("");
      await queryClient.invalidateQueries({ queryKey: ["enquiries"] });
    },
  });

  const parcelEnquiries =
    enquiriesQuery.data?.filter((enquiry) => enquiry.parcelId === parcelId) ?? [];

  return (
    <section aria-label="Parcel enquiry" className="space-y-4">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!question.trim()) return;
          void submitMutation.mutateAsync(question.trim());
        }}
      >
        <label className="block text-sm font-medium text-foreground" htmlFor="enquiry-question">
          Ask about this parcel
        </label>
        <textarea
          className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          id="enquiry-question"
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask for a clarification or review of the record."
          value={question}
        />
        <button
          className="min-h-10 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45"
          disabled={submitMutation.isPending || question.trim().length < 10}
          type="submit"
        >
          {submitMutation.isPending ? "Submitting…" : "Submit enquiry"}
        </button>
      </form>

      {submitMutation.isError && (
        <p aria-live="polite" className="text-sm text-destructive" role="alert">
          {submitMutation.error.message}
        </p>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your enquiries for this parcel
        </h3>
        {enquiriesQuery.isPending && (
          <p className="text-sm text-muted-foreground">Loading enquiries…</p>
        )}
        {parcelEnquiries.length === 0 && !enquiriesQuery.isPending && (
          <p className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
            No enquiries have been submitted for this parcel yet.
          </p>
        )}
        {parcelEnquiries.map((enquiry) => (
          <article key={enquiry.id} className="rounded-md border border-border bg-muted p-3">
            <p className="text-sm font-medium">{enquiry.question}</p>
            <p className="mt-2 text-xs text-muted-foreground">Status: {enquiry.status}</p>
            <p className="mt-2 text-sm">
              {enquiry.reply ? enquiry.reply : "No reply yet."}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
