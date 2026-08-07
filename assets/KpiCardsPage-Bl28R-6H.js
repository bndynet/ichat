import{o as n,n as t,t as a,a as r,c as s,d as o,f as i,u as d,F as l,g as c}from"./index-Db_WKFtx.js";import{d as p,n as m}from"./demo-data-T6QExYDe.js";import{E as u}from"./ExampleCodeDrawer-BIhtKBBb.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const h=`## Register the KPI renderer

Import the renderer package before rendering a \`kpi\` fence. It may be loaded from the application entry or lazily with the route.

\`\`\`js
import "@bndynet/ichat";
import "@bndynet/ichat-renderers"; // Auto-registers the KPI renderers
import { textPart } from "@bndynet/ichat";

const chat = document.querySelector("i-chat-messages");
\`\`\`

## Send the page's KPI data

The page renders these four cards. \`trend\` is optional and uses a signed numeric value.

\`\`\`js
const kpis = [
  { label: "Revenue", value: "$50,846.90", trend: -12 },
  { label: "New Users", value: "1,284", trend: 8 },
  { label: "Churn Rate", value: "3.2%", trend: 0.5, unit: "pp" },
  { label: "MRR", value: "$128,400" },
];

const markdown = kpis
  .map((kpi) => \`\\\`\\\`\\\`kpi\\n\${JSON.stringify(kpi, null, 2)}\\n\\\`\\\`\\\`\`)
  .join("\\n\\n");

chat.addMessage({
  id: crypto.randomUUID(),
  role: "assistant",
  timestamp: Date.now(),
  parts: [textPart(markdown)],
});
\`\`\`
`,w={__name:"KpiCardsPage",setup(f){const e=c(null);return n(async()=>{await t(),e.value.addMessage({id:m(),role:"assistant",parts:[a(p.kpis)],timestamp:Date.now()})}),(g,k)=>(r(),s(l,null,[o("i-chat-messages",{ref_key:"chatRef",ref:e},null,512),i(u,{title:"KPI cards code example",content:d(h)},null,8,["content"])],64))}};export{w as default};
