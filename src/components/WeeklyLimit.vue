<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { Target, Pencil, Trash2 } from "lucide-vue-next";
import { useExpenses, friendlyError } from "@/stores/expenses";
import { parseMoney } from "@/lib/finance";
const store = useExpenses();
const editing = shallowRef(false);
const amount = shallowRef("");
const error = shallowRef("");
const busy = shallowRef(false);
const progress = computed(() =>
  store.weeklyLimit
    ? Math.round((store.weekTotal / store.weeklyLimit) * 100)
    : 0,
);
const status = computed(() => {
  if (progress.value >= 100) return "over";
  if (progress.value >= 80) return "near";
  return "under";
});
function edit() {
  amount.value = store.weeklyLimit ? (store.weeklyLimit / 100).toFixed(2) : "";
  editing.value = true;
}
async function save(remove = false) {
  busy.value = true;
  error.value = "";
  try {
    await store.saveLimit(remove ? null : parseMoney(amount.value));
    editing.value = false;
  } catch (reason) {
    error.value = friendlyError(reason);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <section class="panel limit-card" :data-status="status">
    <div class="section-heading">
      <h2><Target :size="20" />Weekly limit</h2>
      <div v-if="store.weeklyLimit" class="row-actions">
        <button
          class="icon-button"
          aria-label="Edit weekly limit"
          @click="edit"
        >
          <Pencil :size="18" />
        </button>
        <button
          class="icon-button"
          aria-label="Remove weekly limit"
          :disabled="busy"
          @click="save(true)"
        >
          <Trash2 :size="18" />
        </button>
      </div>
    </div>
    <label class="week-picker"
      >Week containing<input type="date" v-model="store.weekDate" required
    /></label>
    <p class="small muted">
      {{ store.weekStart }} – {{ store.weekEnd }} · Monday–Sunday
    </p>
    <template v-if="store.weeklyLimit">
      <div class="limit-numbers">
        <strong>{{ store.displayMoney(store.weekTotal) }}</strong
        ><span>of {{ store.displayMoney(store.weeklyLimit) }}</span>
      </div>
      <progress
        :value="store.weekTotal"
        :max="store.weeklyLimit"
        :aria-label="`${progress}% of weekly limit spent`"
      />
      <div class="limit-caption">
        <span>{{ progress }}% spent</span
        ><strong
          >{{
            store.displayMoney(Math.abs(store.weeklyLimit - store.weekTotal))
          }}
          {{ store.weekTotal > store.weeklyLimit ? "over" : "left" }}</strong
        >
      </div>
    </template>
    <button v-else-if="!editing" class="secondary" @click="edit">
      Set weekly limit
    </button>
    <form v-if="editing" class="limit-form" @submit.prevent="save()">
      <label
        >Weekly limit · NZD<input
          v-model="amount"
          inputmode="decimal"
          required
          placeholder="e.g. 350"
      /></label>
      <p class="small muted">Applies every week.</p>
      <div class="entry-actions">
        <button class="primary" :disabled="busy">Save limit</button
        ><button type="button" class="secondary" @click="editing = false">
          Cancel
        </button>
      </div>
    </form>
    <p v-if="error" class="error-note" role="alert">{{ error }}</p>
  </section>
</template>
<style scoped>
.week-picker {
  max-width: 230px;
}
</style>
