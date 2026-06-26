import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session-store";
import { Star, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/feedback")({
  head: () => ({ meta: [{ title: "Share Feedback — LegacyNest" }] }),
  component: FeedbackPage,
});

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
  rating: number;
};

function FeedbackPage() {
  const { user } = useSession();
  const [form, setForm] = useState<FormState>({
    name: user?.displayName ?? "",
    email: user?.email ?? "",
    subject: "",
    message: "",
    rating: 0,
  });
  const [done, setDone] = useState(false);

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("feedback").insert({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        rating: form.rating || null,
        status: "New",
      });
      if (error) throw error;
    },
    onSuccess: () => setDone(true),
    onError: () => toast.error("Could not submit feedback. Please try again."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    submit.mutate();
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto mt-20 flex flex-col items-center text-center gap-5">
        <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Thank you for your feedback!</h2>
        <p className="text-muted-foreground leading-relaxed">
          Your thoughts help us make LegacyNest better for every family. We read every submission.
        </p>
        <button
          onClick={() => { setDone(false); setForm({ name: user?.displayName ?? "", email: user?.email ?? "", subject: "", message: "", rating: 0 }); }}
          className="mt-2 rounded-xl bg-primary text-primary-foreground font-semibold px-6 py-2.5 hover:bg-primary/90 transition-colors"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Share Your Feedback</h1>
        <p className="text-muted-foreground mt-1">
          Help us improve LegacyNest. Every thought matters to us.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
        {/* Rating */}
        <div>
          <label className="text-sm font-semibold text-foreground/80 block mb-2">
            How would you rate your experience?
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setForm(f => ({ ...f, rating: n }))}
                className="p-1 transition-transform hover:scale-110"
                aria-label={`${n} star${n !== 1 ? "s" : ""}`}
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    n <= form.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-foreground/70">Your Name *</label>
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="Full name"
              className="rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-foreground/70">Email *</label>
            <input
              value={form.email}
              onChange={set("email")}
              type="email"
              placeholder="your@email.com"
              className="rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-foreground/70">Subject *</label>
          <select
            value={form.subject}
            onChange={set("subject")}
            className="rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
            required
          >
            <option value="">Select a topic…</option>
            <option>General feedback</option>
            <option>Feature request</option>
            <option>Bug report</option>
            <option>Suggestion for improvement</option>
            <option>Compliment</option>
            <option>Other</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-foreground/70">Your Message *</label>
          <textarea
            value={form.message}
            onChange={set("message")}
            placeholder="Tell us what you think, what you love, or what could be better…"
            rows={5}
            className="rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none bg-background"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submit.isPending}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 transition-colors disabled:opacity-60"
        >
          {submit.isPending ? "Sending…" : <><Send className="h-4 w-4" /> Send Feedback</>}
        </button>
      </form>
    </div>
  );
}
