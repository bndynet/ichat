import{o,n as s,t as i,a as m,c as d,d as e,e as a,f as c,u as l,F as p,g as h}from"./index-Db_WKFtx.js";import{d as r,n as f}from"./demo-data-T6QExYDe.js";import{E as g}from"./ExampleCodeDrawer-BIhtKBBb.js";import{_ as u}from"./_plugin-vue_export-helper-DlAUqK2U.js";const y=`## Register the Mermaid renderer

Import the renderer package before rendering a Mermaid fence. It may be loaded from the application entry or lazily with the route.

\`\`\`js
import "@bndynet/ichat";
import "@bndynet/ichat-renderer-mermaid"; // Auto-registers the Mermaid renderer
import { textPart } from "@bndynet/ichat";

const chat = document.querySelector("i-chat-messages");
\`\`\`

## Send the page's diagrams

The page renders these Flowchart, Sequence, and Graph definitions. The renderer converts each fence to SVG and follows the active theme.

\`\`\`js
const diagram = \`## Flowchart

\\\`\\\`\\\`mermaid
flowchart LR
  A[i-chat] --> B[Markdown]
  B --> C[Mermaid SVG]
\\\`\\\`\\\`

## Sequence

\\\`\\\`\\\`mermaid
sequenceDiagram
  participant U as User
  participant C as Chat
  U->>C: message
  C-->>U: streamed reply
\\\`\\\`\\\`

## Graph

\\\`\\\`\\\`mermaid
graph TD
  A[Enter Chart Definition] --> B(Preview)
  B --> C{decide}
  C --> D[Keep]
  C --> E[Edit Definition]
  E --> B
  D --> F[Save Image and Code]
  F --> B
\\\`\\\`\\\`\`;

chat.addMessage({
  id: crypto.randomUUID(),
  role: "assistant",
  timestamp: Date.now(),
  parts: [textPart(diagram)],
});
\`\`\`
`,x={__name:"MermaidPage",setup(M){const n=h(null);return o(async()=>{await s(),console.log(r.mermaid),n.value.addMessage({id:f(),role:"assistant",parts:[i(r.mermaid)],timestamp:Date.now()})}),(_,t)=>(m(),d(p,null,[t[0]||(t[0]=e("p",{class:"mermaid-demo-hint"},[a(" Mermaid colors come from optional "),e("code",null,"--chat-mermaid-*"),a(" tokens in "),e("code",null,"apps/demo/styles.css"),a(" (teal accent + mint block fills in light, emerald tones in dark). Remove that block to fall back to normal "),e("code",null,"--chat-*"),a(" only. ")],-1)),e("i-chat-messages",{ref_key:"chatRef",ref:n},null,512),c(g,{title:"Mermaid code example",content:l(y)},null,8,["content"])],64))}},B=u(x,[["__scopeId","data-v-1ec71278"]]);export{B as default};
