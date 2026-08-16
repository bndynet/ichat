<script setup>
import "@bndynet/ichat";
import { computed, nextTick, onMounted, ref } from "vue";
import { textPart } from "@bndynet/ichat";
import { nextId } from "../../composables/demo-data.js";
import ExampleCodeDrawer from "../../components/ExampleCodeDrawer.vue";
import composerInteractionExample from "../../examples/builtin/composer-interaction.md?raw";

const chatRef = ref(null);
const useCustomInput = ref(false);
const customDraft = ref("Draft survives custom interactions");
const activeInteraction = ref(null);
const queueLength = ref(0);
const lastResult = ref("No interaction yet");
const abortController = ref(null);

let interactionSequence = 0;

const chatConfig = {
  locale: "en-US",
};

const activeRenderer = computed(() => {
  const active = activeInteraction.value;
  if (
    active?.kind === "x-address-form" ||
    active?.kind === "x-delivery-selector"
  ) {
    return active;
  }
  return null;
});

const activePayload = computed(() => {
  const payload = activeRenderer.value?.payload;
  return payload && typeof payload === "object" ? payload : {};
});

const selectorOptions = computed(() => {
  const options = activePayload.value.options;
  if (!Array.isArray(options)) return [];
  return options.filter(
    (option) =>
      option &&
      typeof option === "object" &&
      typeof option.value === "string" &&
      typeof option.label === "string",
  );
});

const activeLabel = computed(() => {
  const active = activeInteraction.value;
  if (!active) return "none";
  if (active.kind === "confirmation") {
    return active.payload?.title ?? "confirmation";
  }
  return active.payload?.title ?? active.kind;
});

function nextInteractionId(prefix) {
  interactionSequence += 1;
  return `${prefix}-${Date.now()}-${interactionSequence}`;
}

function addMessage(role, text) {
  const chat = chatRef.value;
  if (!chat) return;
  chat.addMessage({
    id: nextId(),
    role,
    parts: [textPart(text)],
    timestamp: Date.now(),
  });
}

async function waitForChatHost(maxTicks = 30) {
  for (let i = 0; i < maxTicks; i++) {
    if (chatRef.value) return chatRef.value;
    await nextTick();
  }
  return chatRef.value;
}

onMounted(async () => {
  await waitForChatHost();
  addMessage(
    "assistant",
    "Composer Interaction demo. Type a draft, then open a form, selector, or mixed queue. The composer stays mounted and restores the draft after the queue finishes.",
  );
});

function handleSend(event) {
  const content = event.detail.content;
  addMessage("self", content);
  setTimeout(() => addMessage("assistant", `Echo: ${content}`), 250);
}

function sendCustomDraft() {
  const content = customDraft.value.trim();
  const chat = chatRef.value;
  if (!content || !chat) return;
  chat.dispatchEvent(
    new CustomEvent("send", {
      detail: { content },
      bubbles: true,
      composed: true,
    }),
  );
  customDraft.value = "";
}

function handleInteractionChange(event) {
  activeInteraction.value = event.detail.active;
  queueLength.value = event.detail.queueLength;
}

function handleInteractionResult(event) {
  const result = event.detail;
  lastResult.value =
    result.status === "completed"
      ? `${result.request.kind}: completed`
      : `${result.request.kind}: ${result.reason}`;
}

function dispatchInteractionEvent(target, type, detail) {
  target.dispatchEvent(
    new CustomEvent(type, {
      detail,
      bubbles: true,
      composed: true,
    }),
  );
}

function completeAddress(event) {
  const active = activeRenderer.value;
  if (!active || active.kind !== "x-address-form") return;
  const data = new FormData(event.currentTarget);
  dispatchInteractionEvent(
    event.currentTarget,
    "composer-interaction-complete",
    {
      id: active.id,
      value: {
        recipient: String(data.get("recipient") ?? ""),
        street: String(data.get("street") ?? ""),
        city: String(data.get("city") ?? ""),
        country: String(data.get("country") ?? ""),
      },
    },
  );
}

function completeSelector(event) {
  const active = activeRenderer.value;
  if (!active || active.kind !== "x-delivery-selector") return;
  const data = new FormData(event.currentTarget);
  dispatchInteractionEvent(
    event.currentTarget,
    "composer-interaction-complete",
    {
      id: active.id,
      value: { delivery: String(data.get("delivery") ?? "") },
    },
  );
}

function cancelActive(event) {
  const active = activeRenderer.value;
  if (!active) return;
  dispatchInteractionEvent(event.currentTarget, "composer-interaction-cancel", {
    id: active.id,
  });
}

async function requestCustomAndReport(label, request, controller = null) {
  const chat = chatRef.value;
  if (!chat) return;
  try {
    const result = await chat.requestComposerInteraction(request);
    const summary =
      result.status === "completed"
        ? `completed with \`${JSON.stringify(result.value)}\``
        : `cancelled (${result.reason})`;
    addMessage("assistant", `**${label}** ${summary}.`);
  } catch (error) {
    addMessage(
      "assistant",
      `**${label}** could not be queued: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    if (controller && abortController.value === controller) {
      abortController.value = null;
    }
  }
}

async function requestConfirmationAndReport(label, request) {
  const chat = chatRef.value;
  if (!chat) return;
  const result = await chat.requestConfirmation(request);
  addMessage(
    "assistant",
    `**${label}** was **${result.confirmed ? "confirmed" : "cancelled"}**.`,
  );
}

function addressRequest(overrides = {}) {
  return {
    id: nextInteractionId("address"),
    kind: "x-address-form",
    ariaLabel: "Shipping address form",
    payload: {
      title: "Shipping address",
      description:
        "This host-rendered form is temporary and is not added to message history.",
      submitLabel: "Use address",
      defaults: {
        recipient: "Ada Lovelace",
        street: "12 Analytical Engine Way",
        city: "London",
        country: "United Kingdom",
      },
    },
    ...overrides,
  };
}

function selectorRequest(overrides = {}) {
  return {
    id: nextInteractionId("selector"),
    kind: "x-delivery-selector",
    ariaLabel: "Delivery speed selector",
    payload: {
      title: "Delivery speed",
      description: "Choose one option to continue.",
      defaultValue: "standard",
      options: [
        {
          value: "standard",
          label: "Standard",
          description: "3–5 business days",
        },
        {
          value: "express",
          label: "Express",
          description: "Next business day",
        },
        {
          value: "pickup",
          label: "Pickup",
          description: "Collect from the nearest location",
        },
      ],
    },
    ...overrides,
  };
}

function requestAddress() {
  void requestCustomAndReport("Address form", addressRequest());
}

function requestSelector() {
  void requestCustomAndReport("Delivery selector", selectorRequest());
}

function queueTwoCustom() {
  void requestCustomAndReport("Queued address", addressRequest());
  void requestCustomAndReport("Queued selector", selectorRequest());
}

function queueMixed() {
  void requestConfirmationAndReport("Review order", {
    id: nextInteractionId("confirm"),
    title: "Review the order first?",
    description:
      "Confirmation A is followed by a custom selector and confirmation C.",
    confirmLabel: "Review",
  });
  void requestCustomAndReport("Mixed delivery selector", selectorRequest());
  void requestConfirmationAndReport("Place order", {
    id: nextInteractionId("confirm"),
    title: "Place the order?",
    description: "This confirmation waits behind the custom selector.",
    confirmLabel: "Place order",
  });
}

function requestAbortable() {
  if (abortController.value) return;
  const controller = new AbortController();
  abortController.value = controller;
  void requestCustomAndReport(
    "Abortable address",
    addressRequest({ signal: controller.signal }),
    controller,
  );
}

function abortRequest() {
  abortController.value?.abort();
}

function requestUnknownKind() {
  void requestCustomAndReport("Unknown renderer", {
    id: nextInteractionId("unknown"),
    kind: "x-unknown-demo",
    ariaLabel: "Unknown interaction fallback",
    payload: { privateMarker: "This payload must not be rendered." },
  });
}

function clearAll() {
  chatRef.value?.clearComposerInteractions("cleared");
}
</script>

<template>
  <div class="interaction-demo-bar">
    <div class="interaction-demo-actions">
      <el-switch
        v-model="useCustomInput"
        size="small"
        active-text="Custom input"
        inactive-text="Default input"
      />
      <el-button size="small" type="primary" @click="requestAddress">
        Address form
      </el-button>
      <el-button size="small" @click="requestSelector"> Selector </el-button>
      <el-button size="small" @click="queueTwoCustom">
        Queue 2 custom
      </el-button>
      <el-button size="small" @click="queueMixed"> Mixed FIFO </el-button>
      <el-button
        size="small"
        type="warning"
        :disabled="Boolean(abortController)"
        @click="requestAbortable"
      >
        Abortable
      </el-button>
      <el-button
        size="small"
        :disabled="!abortController"
        @click="abortRequest"
      >
        Abort request
      </el-button>
      <el-button size="small" @click="requestUnknownKind">
        Unknown kind
      </el-button>
      <el-button size="small" text @click="clearAll"> Clear all </el-button>
    </div>
    <div class="interaction-demo-status" aria-live="polite">
      <span>Active: {{ activeLabel }}</span>
      <span>Queue: {{ queueLength }}</span>
      <span>Input: {{ useCustomInput ? "custom slot" : "default" }}</span>
      <span>{{ lastResult }}</span>
    </div>
    <p class="interaction-demo-hint">
      Type a draft before opening an interaction. It should reappear unchanged
      after the queue finishes.
    </p>
  </div>

  <i-chat
    ref="chatRef"
    :config="chatConfig"
    @send="handleSend"
    @composer-interaction-change="handleInteractionChange"
    @composer-interaction-result="handleInteractionResult"
  >
    <div v-if="useCustomInput" slot="input" class="custom-composer">
      <div class="custom-composer__label">Custom composer</div>
      <textarea
        v-model="customDraft"
        class="custom-composer__textarea"
        rows="1"
        placeholder="This draft stays mounted during interactions."
        @keydown.enter.exact.prevent="sendCustomDraft"
      />
      <div class="custom-composer__toolbar">
        <el-button
          size="small"
          text
          bg
          @click="customDraft += (customDraft ? ' ' : '') + '[file]'"
        >
          Attach
        </el-button>
        <el-button
          size="small"
          type="primary"
          :disabled="!customDraft.trim()"
          @click="sendCustomDraft"
        >
          Send
        </el-button>
      </div>
    </div>

    <section
      v-if="activeRenderer"
      :key="activeRenderer.id"
      slot="composer-interaction"
      class="interaction-panel"
      :aria-label="activeRenderer.ariaLabel"
    >
      <form
        v-if="activeRenderer.kind === 'x-address-form'"
        class="interaction-form"
        @submit.prevent="completeAddress"
      >
        <div class="interaction-panel__heading">
          <strong>{{ activePayload.title }}</strong>
          <span>{{ activePayload.description }}</span>
        </div>
        <div class="address-grid">
          <label>
            Recipient
            <input
              name="recipient"
              required
              autocomplete="name"
              :value="activePayload.defaults?.recipient"
            />
          </label>
          <label>
            Street
            <input
              name="street"
              required
              autocomplete="street-address"
              :value="activePayload.defaults?.street"
            />
          </label>
          <label>
            City
            <input
              name="city"
              required
              autocomplete="address-level2"
              :value="activePayload.defaults?.city"
            />
          </label>
          <label>
            Country
            <input
              name="country"
              required
              autocomplete="country-name"
              :value="activePayload.defaults?.country"
            />
          </label>
        </div>
        <div class="interaction-panel__actions">
          <button type="button" class="secondary" @click="cancelActive">
            Cancel
          </button>
          <button type="submit" class="primary">
            {{ activePayload.submitLabel ?? "Submit" }}
          </button>
        </div>
      </form>

      <form
        v-else-if="activeRenderer.kind === 'x-delivery-selector'"
        class="interaction-form"
        @submit.prevent="completeSelector"
      >
        <div class="interaction-panel__heading">
          <strong>{{ activePayload.title }}</strong>
          <span>{{ activePayload.description }}</span>
        </div>
        <div class="selector-options">
          <label
            v-for="option in selectorOptions"
            :key="option.value"
            class="selector-option"
          >
            <input
              type="radio"
              name="delivery"
              :value="option.value"
              :checked="option.value === activePayload.defaultValue"
              required
            />
            <span>
              <strong>{{ option.label }}</strong>
              <small>{{ option.description }}</small>
            </span>
          </label>
        </div>
        <div class="interaction-panel__actions">
          <button type="button" class="secondary" @click="cancelActive">
            Cancel
          </button>
          <button type="submit" class="primary">Continue</button>
        </div>
      </form>
    </section>
  </i-chat>

  <ExampleCodeDrawer
    title="Composer Interaction code example"
    :content="composerInteractionExample"
  />
</template>

<style scoped>
.interaction-demo-bar {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1px dashed var(--el-border-color, #dcdfe6);
  border-radius: 8px;
  background: var(--el-fill-color-light, #f5f7fa);
}

.interaction-demo-actions,
.interaction-demo-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.interaction-demo-status {
  font-size: 12px;
  color: var(--el-text-color-secondary, #606266);
}

.interaction-demo-hint {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-placeholder, #909399);
}

.custom-composer {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--chat-border, #d9d9df);
  background: var(--chat-input-bg, var(--chat-surface, #fff));
}

.custom-composer__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--chat-text-secondary, #666);
}

.custom-composer__textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  resize: vertical;
  border: 1px solid var(--chat-border, #d9d9df);
  border-radius: 8px;
  color: var(--chat-text, #1f2328);
  background: var(--chat-input-bg, var(--chat-surface, #fff));
  font: inherit;
}

.custom-composer__toolbar,
.interaction-panel__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.interaction-panel {
  display: block;
  padding: 12px;
  border-top: 1px solid var(--chat-border, #d9d9df);
  color: var(--chat-text, #1f2328);
  background: var(--chat-input-bg, var(--chat-surface, #fff));
}

.interaction-form {
  display: grid;
  gap: 12px;
}

.interaction-panel__heading {
  display: grid;
  gap: 3px;
}

.interaction-panel__heading span,
.selector-option small {
  color: var(--chat-text-secondary, #666);
  font-size: 12px;
}

.address-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.address-grid label {
  display: grid;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
}

.address-grid input {
  min-width: 0;
  padding: 8px 9px;
  border: 1px solid var(--chat-border, #d9d9df);
  border-radius: 7px;
  color: inherit;
  background: inherit;
  font: inherit;
}

.selector-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.selector-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px;
  border: 1px solid var(--chat-border, #d9d9df);
  border-radius: 8px;
  cursor: pointer;
}

.selector-option span {
  display: grid;
  gap: 2px;
}

.interaction-panel button {
  padding: 7px 12px;
  border: 1px solid var(--chat-border, #d9d9df);
  border-radius: 7px;
  cursor: pointer;
  font: inherit;
}

.interaction-panel button.secondary {
  color: var(--chat-text, #1f2328);
  background: transparent;
}

.interaction-panel button.primary {
  border-color: var(--chat-primary, #2563eb);
  color: #fff;
  background: var(--chat-primary, #2563eb);
}

.interaction-panel input:focus-visible,
.interaction-panel button:focus-visible,
.custom-composer__textarea:focus-visible {
  outline: 2px solid var(--chat-primary, #2563eb);
  outline-offset: 2px;
}

@media (max-width: 720px) {
  .address-grid,
  .selector-options {
    grid-template-columns: 1fr;
  }
}
</style>
