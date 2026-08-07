import{o as t,n as a,t as s,a as r,c as o,d as i,f as c,u as l,F as d,g as m}from"./index-Db_WKFtx.js";import{d as e,n as p}from"./demo-data-T6QExYDe.js";import{E as h}from"./ExampleCodeDrawer-BIhtKBBb.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const f=`## Use fenced details blocks

Wrap Markdown in a \`details\` fence to render a collapsible section with a title.

\`\`\`js
import "@bndynet/ichat";
import { textPart } from "@bndynet/ichat";

const chat = document.querySelector("i-chat-messages");

const content = \`\\\`\\\`\\\`details 📋 Project Overview
A modern chat interface with rich Markdown support.

**Features:**
- Streaming messages with typewriter effect
- Collapsible reasoning blocks
- Charts, KPI cards, progress, forms

\\\`\\\`\\\`

\\\`\\\`\\\`details 🔍 Tech Stack
| Layer | Technology |
| --- | --- |
| UI | Lit / Web Components |
| Markdown | markdown-it |
| Charts | ECharts via @bndynet/icharts |
| Sanitisation | DOMPurify |
\\\`\\\`\\\`\`;

chat.addMessage({
  id: crypto.randomUUID(),
  role: "assistant",
  timestamp: Date.now(),
  parts: [textPart(content)],
});
\`\`\`

## Use container syntax

\`:::details\` is an alternative syntax for the same collapsible UI.

\`\`\`js
const content = \`:::details 📋 Project Overview
A modern chat interface with rich markdown support.

**Features:**
- Streaming messages
- Collapsible reasoning blocks
- Custom renderers
:::

:::details 🔍 Tech Stack
| Layer | Technology |
| --- | --- |
| UI | Lit / Web Components |
| Markdown | markdown-it |
| Charts | ECharts |
:::\`;

chat.addMessage({
  id: crypto.randomUUID(),
  role: "assistant",
  timestamp: Date.now(),
  parts: [textPart(content)],
});
\`\`\`
`,C={__name:"DetailsPage",setup(u){const n=m(null);return t(async()=>{await a(),n.value.addMessage({id:p(),role:"assistant",parts:[s(`${e.detailsFence}

${e.detailsContainer}`)],timestamp:Date.now()})}),(w,g)=>(r(),o(d,null,[i("i-chat-messages",{ref_key:"chatRef",ref:n},null,512),c(h,{title:"Details code example",content:l(f)},null,8,["content"])],64))}};export{C as default};
