import { defineStore } from "pinia";
import { shallowRef } from "vue";
import { validDate } from "@/lib/purchases";
export const useRates = defineStore("rates", () => {
  const rate = shallowRef<number | null>(null);
  const date = shallowRef("");
  const status = shallowRef("Loading exchange rate…");
  let pending: Promise<void> | null = null;
  try {
    const saved = JSON.parse(localStorage.getItem("nzd-usd-rate") ?? "null");
    if (
      saved &&
      Number.isFinite(saved.rate) &&
      saved.rate > 0 &&
      validDate(saved.date)
    ) {
      rate.value = saved.rate;
      date.value = saved.date;
    }
  } catch {
    /* A missing cache does not block NZD entry. */
  }
  async function refresh() {
    if (pending) return pending;
    pending = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(
          "https://api.frankfurter.dev/v2/rate/NZD/USD",
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Rate unavailable");
        const value = await response.json();
        if (
          !Number.isFinite(value.rate) ||
          value.rate <= 0 ||
          !validDate(value.date)
        )
          throw new Error("Invalid rate");
        rate.value = value.rate;
        date.value = value.date;
        status.value = "Latest available";
        try {
          localStorage.setItem("nzd-usd-rate", JSON.stringify(value));
        } catch {
          /* Conversion still works without caching. */
        }
      } catch {
        status.value = rate.value
          ? "Cached rate · refresh unavailable"
          : "USD unavailable · retry when online";
      } finally {
        clearTimeout(timeout);
        pending = null;
      }
    })();
    return pending;
  }
  void refresh();
  window.addEventListener("online", () => void refresh());
  window.addEventListener("focus", () => void refresh());
  return { rate, date, status, refresh };
});
