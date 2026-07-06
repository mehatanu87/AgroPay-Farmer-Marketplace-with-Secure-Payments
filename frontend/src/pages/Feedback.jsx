import { useState } from "react";
import toast from "react-hot-toast";
import { feedbackApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Feedback() {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error("Please log in to submit feedback");
    setSubmitting(true);
    try {
      await feedbackApi.submit({ rating, message });
      setDone(true);
      setMessage("");
      toast.success("Thanks for your feedback!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">Share Your Feedback</h1>
      <p className="text-sm text-gray-500 mb-6">
        Help us improve AgroPay — your input shapes what we build next.
      </p>

      {done ? (
        <div className="p-4 rounded-xl bg-agro-50 text-agro-700 text-sm">
          Feedback submitted. Thank you!
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setRating(n)}
                  className={`h-10 w-10 rounded-full border text-sm font-semibold ${
                    rating >= n
                      ? "bg-agro-600 border-agro-600 text-white"
                      : "border-gray-300 dark:border-gray-700 text-gray-500"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Message</label>
            <textarea
              required
              rows={4}
              placeholder="What worked well? What was confusing or frustrating?"
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-agro-600 hover:bg-agro-700 disabled:opacity-60 text-white font-medium text-sm"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </form>
      )}
    </div>
  );
}
