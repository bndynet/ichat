## Request a custom composer interaction

Requests contain data only. The host renders the active request through the `composer-interaction` slot and completes it with the active request ID.

```js
const result = await chat.requestComposerInteraction({
  kind: "x-address-form",
  ariaLabel: "Shipping address form",
  payload: {
    title: "Shipping address",
    defaults: { city: "London", country: "United Kingdom" },
  },
});

if (result.status === "completed") {
  console.log("Address:", result.value);
}
```

In Vue, key the renderer by request ID so local form state resets when FIFO advances to the next request.

```vue
<section
  v-if="active?.kind === 'x-address-form'"
  :key="active.id"
  slot="composer-interaction"
>
  <form @submit.prevent="completeAddress">
    <!-- Render trusted host UI from the data-only payload. -->
  </form>
</section>
```

## Complete or cancel from the slotted renderer

The events must bubble, cross the shadow boundary, and carry the active request ID. Stale or mismatched IDs are ignored.

```js
function completeFrom(target, active, value) {
  target.dispatchEvent(
    new CustomEvent("composer-interaction-complete", {
      detail: { id: active.id, value },
      bubbles: true,
      composed: true,
    }),
  );
}

function cancelFrom(target, active) {
  target.dispatchEvent(
    new CustomEvent("composer-interaction-cancel", {
      detail: { id: active.id },
      bubbles: true,
      composed: true,
    }),
  );
}
```

## Queue custom and confirmation requests together

Both APIs share one FIFO. `clearConfirmations()` remains confirmation-only, while `clearComposerInteractions()` clears the whole queue.

```js
void chat.requestConfirmation({ title: "Review the order?" });
void chat.requestComposerInteraction({
  kind: "x-delivery-selector",
  payload: { options: ["standard", "express", "pickup"] },
});
void chat.requestConfirmation({ title: "Place the order?" });
```

## Cancel with an AbortSignal

```js
const controller = new AbortController();

const pending = chat.requestComposerInteraction({
  kind: "x-address-form",
  signal: controller.signal,
});

controller.abort();
const result = await pending; // { status: "cancelled", reason: "aborted", ... }
```
