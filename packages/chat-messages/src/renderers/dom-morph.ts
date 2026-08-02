import morphdom from 'morphdom';

/**
 * Morph sanitized/rendered HTML into an existing host without replacing custom
 * element instances whose public attributes did not change.
 */
export function morphHtmlInto(el: HTMLElement, html: string): void {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  morphdom(el, temp, {
    childrenOnly: true,
    onBeforeElUpdated(fromEl, toEl) {
      if (fromEl.tagName === 'I-CHAT-MERMAID' && toEl.tagName === 'I-CHAT-MERMAID') {
        return true;
      }
      if (fromEl.tagName === 'I-CHAT-CODE-TOGGLE' && toEl.tagName === 'I-CHAT-CODE-TOGGLE') {
        return true;
      }
      if (fromEl.tagName.includes('-') && fromEl.tagName === toEl.tagName) {
        const fromAttributes = fromEl.attributes;
        const toAttributes = toEl.attributes;
        if (fromAttributes.length === toAttributes.length) {
          let same = true;
          for (let i = 0; i < toAttributes.length; i++) {
            if (fromEl.getAttribute(toAttributes[i].name) !== toAttributes[i].value) {
              same = false;
              break;
            }
          }
          if (same) return false;
        }
      }
      return true;
    },
  });
}
