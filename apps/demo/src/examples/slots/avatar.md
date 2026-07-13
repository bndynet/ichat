## Provide role-specific avatars

Add elements with an avatar slot name. The content can be an image, SVG, or any custom DOM.

```js
import '@bndynet/ichat'

const chat = document.querySelector('i-chat')

const selfAvatar = document.createElement('img')
selfAvatar.slot = 'self-avatar'
selfAvatar.src = 'https://static.bndy.net/images/logo.png'
selfAvatar.alt = ''
selfAvatar.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover'

const assistantAvatar = document.createElement('div')
assistantAvatar.slot = 'assistant-avatar'
assistantAvatar.textContent = 'AI'
assistantAvatar.style.cssText = `
  width:100%; height:100%; border-radius:50%; display:grid; place-items:center;
  color:white; background:linear-gradient(135deg, #f093fb, #f5576c);
`

const peerAvatar = document.createElement('div')
peerAvatar.slot = 'peer-avatar'
peerAvatar.textContent = 'Peer'
peerAvatar.style.cssText = `
  width:100%; height:100%; border-radius:50%; display:grid; place-items:center;
  color:white; background:linear-gradient(135deg, #0ea5e9, #06b6d4);
`

chat.append(selfAvatar, assistantAvatar, peerAvatar)
```

## Add the page's messages

The page renders one assistant message, one peer message, and one peer message with a per-message avatar override.

```js
import { textPart } from '@bndynet/ichat'

for (const message of [
  { role: 'assistant', parts: [textPart('Hello from assistant')] },
  { role: 'peer', parts: [textPart('Hello from peer')] },
  {
    role: 'peer',
    avatar: 'https://static.bndy.net/images/logo_white_blue_circle.svg',
    parts: [textPart('Hello from your friend')],
  },
]) {
  chat.addMessage({ id: crypto.randomUUID(), timestamp: Date.now(), ...message })
}
```
