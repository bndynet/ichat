## Request a confirmation

Call `requestConfirmation()` on an `i-chat` element when an action needs a user decision. The returned promise resolves after the user confirms or cancels.

```js
import '@bndynet/ichat'

const chat = document.querySelector('i-chat')

const result = await chat.requestConfirmation({
  title: 'Run data refresh?',
  description: 'The app generated this copy from a trusted action schema.',
  details: {
    action: 'refresh_dashboard',
    rows: 1284,
    source: 'warehouse.daily_metrics',
  },
  confirmLabel: 'Run',
  cancelLabel: 'Skip',
})

if (result.confirmed) {
  console.log('Refresh confirmed:', result.request.details)
}
```

## Request the page's destructive action and queue

The demo also shows a danger confirmation followed by three queued requests.

```js
void chat.requestConfirmation({
  title: 'Delete generated report?',
  description: 'This is a destructive action. The primary copy is owned by the app, not the model.',
  details: { action: 'delete_file', path: '/tmp/reports/q2-draft.pdf', irreversible: true },
  confirmLabel: 'Delete',
  variant: 'danger',
})

for (const request of [
  { title: 'Archive old thread?', description: 'This is the first queued confirmation.', details: { action: 'archive_thread', threadId: 'thread_001' }, confirmLabel: 'Archive' },
  { title: 'Send summary email?', description: 'This waits behind the archive confirmation.', details: { action: 'send_email', to: 'team@example.com' }, confirmLabel: 'Send' },
  { title: 'Sync files to workspace?', description: 'This is the third queued confirmation.', details: { action: 'sync_files', count: 6 }, confirmLabel: 'Sync' },
]) {
  void chat.requestConfirmation(request)
}
```

## Observe confirmation state

The component emits lifecycle events so surrounding UI can reflect the active request and queue length.

```js
chat.addEventListener('confirmation-change', (event) => {
  const { active, queueLength } = event.detail
  console.log('Active confirmation:', active?.title ?? 'none')
  console.log('Queued confirmations:', queueLength)
})

chat.addEventListener('confirmation-decision', (event) => {
  console.log(`${event.detail.request.title}: ${event.detail.action}`)
})
```
