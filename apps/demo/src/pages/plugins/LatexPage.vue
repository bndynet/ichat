<script setup>
import '@bndynet/ichat';
import { nextTick, onMounted, ref } from 'vue';
import { nextId } from '../../composables/demo-data.js';
import { registerMarkdownPlugin, textPart } from '@bndynet/ichat';
import mk from 'markdown-it-katex';
import ExampleCodeDrawer from '../../components/ExampleCodeDrawer.vue';
import latexExample from '../../examples/plugins/latex.md?raw';

const chatRef = ref(null);

async function waitForChatHost(maxTicks = 30) {
  for (let i = 0; i < maxTicks; i++) {
    if (chatRef.value) return chatRef.value;
    await nextTick();
  }
  return chatRef.value;
}

// ── Register LaTeX plugin via markdown-it-katex ──────────────────────────

registerMarkdownPlugin({
  id: 'latex',
  install: mk,
  styles: `
    .katex { font-size: 1.1em; }
    .katex .katex-html { max-width: 100%; overflow: hidden; }
    .katex .hide-tail { overflow: hidden; position: relative; display: inline-block; width: 100%; }
    .katex-display { margin: 1em 0; overflow-x: auto; overflow-y: hidden; }
    .katex-display > .katex { max-width: 100%; display: inline-block; }
  `,
  globalStyles: `
    @font-face {
      font-family: KaTeX_Main;
      src: url(https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/fonts/KaTeX_Main-Regular.woff2) format('woff2');
      font-weight: normal;
      font-style: normal;
    }
    @font-face {
      font-family: KaTeX_Main;
      src: url(https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/fonts/KaTeX_Main-Bold.woff2) format('woff2');
      font-weight: bold;
      font-style: normal;
    }
    @font-face {
      font-family: KaTeX_Main;
      src: url(https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/fonts/KaTeX_Main-Italic.woff2) format('woff2');
      font-weight: normal;
      font-style: italic;
    }
    @font-face {
      font-family: KaTeX_Math;
      src: url(https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/fonts/KaTeX_Math-Italic.woff2) format('woff2');
      font-weight: normal;
      font-style: italic;
    }
    @font-face {
      font-family: KaTeX_AMS;
      src: url(https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/fonts/KaTeX_AMS-Regular.woff2) format('woff2');
      font-weight: normal;
      font-style: normal;
    }
  `,
});

// ── Demo messages ────────────────────────────────────────────────────────

onMounted(async () => {
  const chat = await waitForChatHost();
  if (!chat) return;

  chat.addMessage({
    id: nextId(),
    role: 'assistant',
    timestamp: Date.now(),
    parts: [
      textPart(`## Inline Math

The Pythagorean theorem states that $a^2 + b^2 = c^2$ for a right triangle with legs $a$, $b$ and hypotenuse $c$.

Euler's identity is one of the most beautiful equations: $e^{i\\pi} + 1 = 0$.

The quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

Some inline physics: $F = ma$, $E = mc^2$, and $\\hbar = \\frac{h}{2\\pi}$.

---

## Display Math

The Gaussian integral:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
$$

A matrix:

$$
\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}
\\begin{pmatrix}
x \\\\
y
\\end{pmatrix}
=
\\begin{pmatrix}
ax + by \\\\
cx + dy
\\end{pmatrix}
$$

The chain rule for partial derivatives:

$$
\\frac{\\partial z}{\\partial x_i} =
\\sum_{j=1}^{n} \\frac{\\partial z}{\\partial y_j}
\\frac{\\partial y_j}{\\partial x_i}
$$

Bayes' theorem:

$$
P(A \\mid B) = \\frac{P(B \\mid A) \\, P(A)}{P(B)}
$$

---

## Common Notations

- Summation: $\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$
- Limit: $\\lim_{x \\to \\infty} \\frac{1}{x} = 0$
- Integral: $\\int_{0}^{1} x^2 \\, dx = \\frac{1}{3}$
- Set notation: $\\{ x \\in \\mathbb{R} \\mid x > 0 \\}$`),
    ],
  });
});
</script>

<template>
  <div style="display: flex; flex-direction: column; height: 100%; min-height: 0;">
    <h2 style="margin: 0 0 8px;">LaTeX Math (KaTeX)</h2>
    <p style="margin: 0 0 12px;">
      LaTeX math rendering via <code>registerMarkdownPlugin</code> with KaTeX.
      Use <code>$...$</code> for inline math and <code>$$...$$</code> for display math.
    </p>
    <i-chat ref="chatRef" style="flex: 1; min-height: 0;" />
  </div>
  <ExampleCodeDrawer title="LaTeX plugin code example" :content="latexExample" />
</template>
