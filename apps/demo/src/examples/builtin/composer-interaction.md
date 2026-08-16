## Address form

`x-address-form` is a request kind, not a Web Component.

```html
<button id="open-address" type="button">Open address form</button>

<i-chat id="chat" style="display: block; height: 28rem">
  <form id="address-form" aria-label="Shipping address form" hidden>
    <label>City <input name="city" required /></label>
    <label>Country <input name="country" required /></label>
    <button id="cancel-address" type="button">Cancel</button>
    <button type="submit">Use address</button>
  </form>
</i-chat>

<script type="module">
  import "@bndynet/ichat";

  const chat = document.querySelector("#chat");
  const form = document.querySelector("#address-form");
  let activeId = null;

  chat.addEventListener("composer-interaction-change", (event) => {
    const active = event.detail.active;
    const visible = active?.kind === "x-address-form";

    form.hidden = !visible;
    if (!visible) {
      form.removeAttribute("slot");
      activeId = null;
      return;
    }

    form.slot = "composer-interaction";
    if (activeId === active.id) return;
    activeId = active.id;
    form.elements.city.value = active.payload?.defaults?.city ?? "";
    form.elements.country.value = active.payload?.defaults?.country ?? "";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    chat.completeComposerInteraction(
      activeId,
      Object.fromEntries(new FormData(form)),
    );
  });

  document.querySelector("#cancel-address").addEventListener("click", () => {
    chat.cancelComposerInteraction(activeId);
  });

  document
    .querySelector("#open-address")
    .addEventListener("click", async () => {
      const result = await chat.requestComposerInteraction({
        kind: "x-address-form",
        ariaLabel: "Shipping address form",
        payload: {
          defaults: { city: "London", country: "United Kingdom" },
        },
      });

      console.log(result);
    });
</script>
```
