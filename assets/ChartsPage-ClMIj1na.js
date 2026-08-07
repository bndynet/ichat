import{o as c,n as l,t as d,h as m,a as u,c as p,d as h,f,u as g,F as y,g as v}from"./index-Db_WKFtx.js";import{d as S,n as b}from"./demo-data-T6QExYDe.js";import{E as w}from"./ExampleCodeDrawer-BIhtKBBb.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const x=`## Register the chart renderer

Import the renderer package before rendering a \`chart\` fence. It may be loaded from the application entry or lazily with the route.

\`\`\`js
import "@bndynet/ichat";
import "@bndynet/ichat-renderer-chart"; // Auto-registers the chart renderer
import { textPart } from "@bndynet/ichat";

const chat = document.querySelector("i-chat-messages");
\`\`\`

## Send the page's chart definitions

The page streams the following seven \`chart\` fences. Each definition below matches one visible chart in the demo.

\`\`\`js
const definitions = [
  {
    type: "bar",
    data: {
      categories: ["JS", "Python", "TS", "Java", "Rust", "Go"],
      series: [{ name: "Popularity", data: [95, 88, 78, 65, 42, 38] }],
    },
    options: { title: "Most Popular Languages 2025" },
  },
  {
    type: "bar",
    data: {
      categories: ["React", "Vue", "Angular", "Svelte"],
      series: [{ name: "Stars (k)", data: [220, 207, 93, 77] }],
    },
    options: { title: "Framework Stars", variant: "horizontal" },
  },
  {
    type: "line",
    data: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      series: [{ name: "Revenue", data: [3200, 4500, 3800, 5100, 4700, 6200] }],
    },
    options: { title: "Monthly Revenue 2025" },
  },
  {
    type: "area",
    data: {
      categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      series: [
        { name: "Visitors", data: [820, 932, 901, 934, 1290, 1330, 1320] },
      ],
    },
    options: { title: "Website Visitors" },
  },
  {
    type: "pie",
    data: [
      { name: "Chrome", value: 65 },
      { name: "Safari", value: 18 },
      { name: "Firefox", value: 7 },
      { name: "Edge", value: 5 },
      { name: "Other", value: 5 },
    ],
    options: { title: "Browser Market Share" },
  },
  {
    type: "pie",
    data: [
      { name: "Chrome", value: 65 },
      { name: "Safari", value: 18 },
      { name: "Firefox", value: 7 },
      { name: "Other", value: 10 },
    ],
    options: { title: "Browser Share — Doughnut", variant: "doughnut" },
  },
  {
    type: "gauge",
    data: { value: 72, max: 100, label: "Score" },
    options: { title: "Server Response Score" },
  },
];

const markdown = definitions
  .map(
    (definition) =>
      \`\\\`\\\`\\\`chart\\n\${JSON.stringify(definition, null, 2)}\\n\\\`\\\`\\\`\`,
  )
  .join("\\n\\n");

chat.addMessage({
  id: crypto.randomUUID(),
  role: "assistant",
  timestamp: Date.now(),
  parts: [textPart(markdown)],
});
\`\`\`
`,F={__name:"ChartsPage",setup(k){const r=v(null);let a=!1;const i=e=>new Promise(n=>setTimeout(n,e));return c(async()=>{await l();const e=r.value,n=b();e.addMessage({id:n,role:"assistant",parts:[d("",{id:"body",status:"streaming"})],streaming:!0,timestamp:Date.now()});const s=S.chart.split(/\n{2,}/);let o="";for(let t=0;t<s.length;t++){if(a)return;o+=(t?`

`:"")+s[t],e.updatePart(n,"body",{text:o}),await i(220)}a||(e.updatePart(n,"body",{status:"complete"}),e.updateMessage(n,{streaming:!1}))}),m(()=>{a=!0}),(e,n)=>(u(),p(y,null,[h("i-chat-messages",{ref_key:"chatRef",ref:r},null,512),f(w,{title:"Charts code example",content:g(x)},null,8,["content"])],64))}};export{F as default};
