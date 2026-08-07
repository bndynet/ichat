import{o as n,n as t,t as a,a as r,c as s,d as o,f as i,u as c,F as l,g as p}from"./index-Db_WKFtx.js";import{d,n as m}from"./demo-data-T6QExYDe.js";import{E as u}from"./ExampleCodeDrawer-BIhtKBBb.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const h=`## Register the KPI group renderer

Import the renderer package before rendering a \`kpis\` fence. It may be loaded from the application entry or lazily with the route.

\`\`\`js
import "@bndynet/ichat";
import "@bndynet/ichat-renderers"; // Auto-registers the KPI renderers
import { textPart } from "@bndynet/ichat";

const chat = document.querySelector("i-chat-messages");
\`\`\`

## Send a KPI collection

The fence contains an array; each array item is rendered as an individual card in the group.

\`\`\`js
const kpis = [
  { label: "Revenue", value: "$50,846.90", trend: -12 },
  { label: "New Users", value: "1,284", trend: 8 },
  { label: "MRR", value: "$128,400" },
];

chat.addMessage({
  id: crypto.randomUUID(),
  role: "assistant",
  timestamp: Date.now(),
  parts: [textPart(\`\\\`\\\`\\\`kpis\\n\${JSON.stringify(kpis, null, 2)}\\n\\\`\\\`\\\`\`)],
});
\`\`\`
`,I={__name:"KpiGroupPage",setup(f){const e=p(null);return n(async()=>{await t(),e.value.addMessage({id:m(),role:"assistant",parts:[a(d.kpiGroup)],timestamp:Date.now()})}),(g,y)=>(r(),s(l,null,[o("i-chat-messages",{ref_key:"chatRef",ref:e},null,512),i(u,{title:"KPI group code example",content:c(h)},null,8,["content"])],64))}};export{I as default};
