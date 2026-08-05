## Register a custom element renderer

Register an `x-*` part type before adding a matching part. Registration may happen at startup or lazily after chat components have mounted. The element receives the part data as a property.

```js
import '@bndynet/ichat'
import { registerPartRenderer, textPart } from '@bndynet/ichat'

class WeatherCard extends HTMLElement {
  set data(value) {
    const { city = 'Unknown', temp = '--', unit = '', condition = '' } = value ?? {}
    this.innerHTML = `<strong>${temp}${unit}</strong> ${city} — ${condition}`
  }
}

customElements.define('x-weather-card', WeatherCard)

registerPartRenderer({
  name: 'weather-card',
  test: (type) => type === 'x-weather',
  element: 'x-weather-card',
})
```

## Add and update the part

`updatePart()` patches the existing custom-element instance, so the host can stream fresh data without rebuilding the message.

```js
const chat = document.querySelector('i-chat-messages')
const messageId = crypto.randomUUID()

chat.addMessage({
  id: messageId,
  role: 'assistant',
  timestamp: Date.now(),
  parts: [
    textPart('**Element mode** — the element instance is preserved across `updatePart`.'),
    { id: 'x-weather-live', type: 'x-weather', data: { city: 'Shanghai', temp: 22, unit: '°C', condition: 'Cloudy' } },
  ],
})

chat.updatePart(messageId, 'x-weather-live', {
  data: { city: 'Shanghai', temp: 27, unit: '°C', condition: 'Sunny' },
})
```

## Add the page's other custom parts

The page also renders a string-mode weather card and shows the JSON fallback for an unregistered `x-*` part.

```js
chat.addMessage({
  id: crypto.randomUUID(),
  role: 'assistant',
  timestamp: Date.now(),
  parts: [
    { id: 'x-weather-html-1', type: 'x-weather-html', data: { city: 'Tokyo', temp: 18, unit: '°C', condition: 'Light rain' } },
    { id: 'x-unknown-1', type: 'x-product-card', data: { sku: 'A-1024', name: 'Wireless Mouse', price: 29.9 } },
  ],
})
```
