import{o,t as s,a as l,c as m,d as e,e as i,f as d,u as c,F as $,n as p,g as h}from"./index-Db_WKFtx.js";import{n as f}from"./demo-data-T6QExYDe.js";import{E as u}from"./ExampleCodeDrawer-BIhtKBBb.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const x='# LaTeX Math (ichat-renderer-katex)\n\nInstall and import `@bndynet/ichat-renderer-katex` before rendering LaTeX content. The package may be loaded from the application entry or lazily with a route, and auto-registers `markdown-it-katex` with chat-friendly CSS and KaTeX font declarations.\n\n```bash\nnpm install @bndynet/ichat-renderer-katex\n```\n\n```typescript\n// Application entry or lazy route module — auto-registers on import\nimport "@bndynet/ichat-renderer-katex";\n```\n\nThat\'s it. `$...$` for inline math and `$$...$$` for display math just work in subsequent chat renders.\n',y={style:{display:"flex","flex-direction":"column",height:"100%","min-height":"0"}},w={__name:"LatexPage",setup(g){const n=h(null);async function r(t=30){for(let a=0;a<t;a++){if(n.value)return n.value;await p()}return n.value}return o(async()=>{const t=await r();t&&t.addMessage({id:f(),role:"assistant",timestamp:Date.now(),parts:[s(`## Inline Math

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
- Set notation: $\\{ x \\in \\mathbb{R} \\mid x > 0 \\}$`)]})}),(t,a)=>(l(),m($,null,[e("div",y,[a[0]||(a[0]=e("h2",{style:{margin:"0 0 8px"}},"LaTeX Math (KaTeX)",-1)),a[1]||(a[1]=e("p",{style:{margin:"0 0 12px"}},[i(" LaTeX math rendering via "),e("code",null,"registerMarkdownPlugin"),i(" with KaTeX. Use "),e("code",null,"$...$"),i(" for inline math and "),e("code",null,"$$...$$"),i(" for display math. ")],-1)),e("i-chat",{ref_key:"chatRef",ref:n,style:{flex:"1","min-height":"0"}},null,512)]),d(u,{title:"LaTeX plugin code example",content:c(x)},null,8,["content"])],64))}};export{w as default};
