# Code Copy Plugin

The `codeCopyPlugin` adds a copy-to-clipboard button to every fenced code block.

## Usage

```ts
import '@bndynet/ichat';
import { codeCopyPlugin } from '@bndynet/ichat';

const chat = document.querySelector('i-chat');
chat.use(codeCopyPlugin);
```

That's it — every ```fenced code block``` now has a copy button that appears on hover.

## Example

```python
def fibonacci(n: int) -> int:
    """Return the nth Fibonacci number."""
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b

# Print first 10 Fibonacci numbers
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
```

```typescript
interface ChatPlugin {
  name: string;
  install(chat: Chat): void | (() => void);
}

// Register on any <i-chat> element
chat.use(codeCopyPlugin);
```

```bash
# Install the package
npm install @bndynet/ichat

# Start the dev server
npm run dev
```
