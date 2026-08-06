<script setup>
import "@bndynet/ichat";
import "@bndynet/ichat-renderer-katex";
import { nextTick, onMounted, ref } from "vue";
import { nextId } from "../../composables/demo-data.js";
import { textPart } from "@bndynet/ichat";
import ExampleCodeDrawer from "../../components/ExampleCodeDrawer.vue";
import latexExample from "../../examples/plugins/latex.md?raw";

const chatRef = ref(null);

async function waitForChatHost(maxTicks = 30) {
  for (let i = 0; i < maxTicks; i++) {
    if (chatRef.value) return chatRef.value;
    await nextTick();
  }
  return chatRef.value;
}

// ── Demo messages ────────────────────────────────────────────────────────

onMounted(async () => {
  const chat = await waitForChatHost();
  if (!chat) return;

  chat.addMessage({
    id: nextId(),
    role: "assistant",
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
  <div
    style="display: flex; flex-direction: column; height: 100%; min-height: 0"
  >
    <h2 style="margin: 0 0 8px">LaTeX Math (KaTeX)</h2>
    <p style="margin: 0 0 12px">
      LaTeX math rendering via <code>registerMarkdownPlugin</code> with KaTeX.
      Use <code>$...$</code> for inline math and <code>$$...$$</code> for
      display math.
    </p>
    <i-chat ref="chatRef" style="flex: 1; min-height: 0" />
  </div>
  <ExampleCodeDrawer
    title="LaTeX plugin code example"
    :content="latexExample"
  />
</template>
