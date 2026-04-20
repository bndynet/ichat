import{j as C,a as S,c as D,b as f,w as b,h as y,u,H as M,I as P,J as T,K as E,L as F}from"./index-CYSp967g.js";const d=n=>"```chart\n"+JSON.stringify(n,null,2)+"\n```",c={bar:d({type:"bar",data:{categories:["JS","Python","TS","Java","Rust","Go"],series:[{name:"Popularity",data:[95,88,78,65,42,38]}]},options:{title:"Most Popular Languages 2025"}}),barH:d({type:"bar",data:{categories:["React","Vue","Angular","Svelte"],series:[{name:"Stars (k)",data:[220,207,93,77]}]},options:{title:"Framework Stars",variant:"horizontal"}}),line:d({type:"line",data:{categories:["Jan","Feb","Mar","Apr","May","Jun"],series:[{name:"Revenue",data:[3200,4500,3800,5100,4700,6200]}]},options:{title:"Monthly Revenue 2025"}}),area:d({type:"area",data:{categories:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],series:[{name:"Visitors",data:[820,932,901,934,1290,1330,1320]}]},options:{title:"Website Visitors"}}),pie:d({type:"pie",data:[{name:"Chrome",value:65},{name:"Safari",value:18},{name:"Firefox",value:7},{name:"Edge",value:5},{name:"Other",value:5}],options:{title:"Browser Market Share"}}),doughnut:d({type:"pie",data:[{name:"Chrome",value:65},{name:"Safari",value:18},{name:"Firefox",value:7},{name:"Other",value:10}],options:{title:"Browser Share — Doughnut",variant:"doughnut"}}),gauge:d({type:"gauge",data:{value:72,max:100,label:"Score"},options:{title:"Server Response Score"}})},i={mermaid:`Diagrams use the **\`mermaid\`** fence. Theme follows \`data-theme\` on \`<html>\` (light / dark).

## Flowchart

\`\`\`mermaid
flowchart LR
  A[i-chat] --> B[Markdown]
  B --> C[Mermaid SVG]
\`\`\`

## Sequence

\`\`\`mermaid
sequenceDiagram
  participant U as User
  participant C as Chat
  U->>C: message
  C-->>U: streamed reply
\`\`\`

## Graph

\`\`\`mermaid
graph TD
  A[Enter Chart Definition] --> B(Preview)
  B --> C{decide}
  C --> D[Keep]
  C --> E[Edit Definition]
  E --> B
  D --> F[Save Image and Code]
  F --> B
\`\`\`
`,chart:`Here are the chart types supported by **@bndynet/icharts**.

## XY Charts

### Bar

`+c.bar+`

### Bar — Horizontal

`+c.barH+`

### Line

`+c.line+`

### Area

`+c.area+`

## Pie

`+c.pie+`

### Doughnut

`+c.doughnut+`

## Gauge

`+c.gauge,kpis:'Here is the KPI summary for today:\n\n```kpi\n{"label": "Revenue", "value": "$50,846.90", "trend": -12}\n```\n\n```kpi\n{"label": "New Users", "value": "1,284", "trend": 8}\n```\n\n```kpi\n{"label": "Churn Rate", "value": "3.2%", "trend": 0.5, "unit": "pp"}\n```\n\n```kpi\n{"label": "MRR", "value": "$128,400"}\n```',kpiGroup:`Here is the combined KPI overview:

\`\`\`kpis
[
  {"label": "Revenue", "value": "$50,846.90", "trend": -12},
  {"label": "New Users", "value": "1,284", "trend": 8},
  {"label": "MRR", "value": "$128,400"}
]
\`\`\``,timeline:`## Deployment Pipeline

### BUILD
<!-- bid:build -->
1. [done] Build Docker image
2. [error] Run test suite
3. [active] Push to registry

### DEPLOY
<!-- bid:deploy -->
1. [done] Deploy to staging
2. [error] Run smoke tests
3. [pending] Promote to production
`,form:`Please fill out the feedback form below:

\`\`\`form
{
  "id": "user-feedback",
  "title": "User Feedback",
  "submitLabel": "Send Feedback",
  "fields": [
    {"name": "name", "label": "Your Name", "type": "text", "required": true},
    {"name": "satisfaction", "label": "Satisfaction", "type": "select", "options": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"]},
    {"name": "source", "label": "How did you find us?", "type": "radio", "options": ["Search", "Social media", "Word of mouth", "Other"]},
    {"name": "subscribe", "label": "Subscribe to newsletter", "type": "checkbox"},
    {"name": "comments", "label": "Additional Comments", "type": "textarea"}
  ]
}
\`\`\``,detailsFence:`The following use the **fence syntax** (\` \`\`\`details Title \`) to collapse content.

\`\`\`details 📋 Project Overview
A modern chat interface with rich markdown support.

**Features:**
- Streaming messages with typewriter effect
- Collapsible reasoning blocks
- Charts, KPI cards, timelines, forms
\`\`\`

\`\`\`details 🔍 Tech Stack
| Layer | Technology |
| --- | --- |
| UI | Lit / Web Components |
| Markdown | markdown-it |
| Charts | ECharts via @bndynet/icharts |
| Sanitisation | DOMPurify |
\`\`\``,detailsContainer:`The following use the **container syntax** (\`:::details Title\`) for collapsible blocks.

:::details 📋 Project Overview
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
:::`},I=[{reasoning:"**Parse intent:** User sent `thinking`. Demo **all-in-one** — same SSE shape as production (`reasoning` + `content`), but the reply body pulls in every preset from `demoData`: Charts → KPI cards → KPI group → Form → Details (fence + container) → Markdown notes → dev timeline.\n\n"},{reasoning:'<!-- bid:plan -->\n1. [done] **Scope** — Reasoning stays in the collapsible block; body streams preset content by reference.\n2. [done] **Charts** — `charts.*` fences via `demoData.Charts`.\n3. [done] **KPI** — `kpi` / `kpis` blocks from `demoData["KPI Cards"]` and `demoData["KPI Group"]`.\n4. [done] **Form** — JSON form fence from `demoData.Form`.\n5. [done] **Details** — Fence + container from `demoData["Details (fence)"]` and `demoData["Details (container)"]`.\n6. [done] **Pace** — Chunked `content` events so streaming stays visible.\n7. [done] **UX** — Expand thinking (推理过程); answer emphasizes widgets + timeline.\n8. [done] **Contract** — Optional `reasoning` + `content` per event.\n\n'},{reasoning:"**Sanity check:** Reasoning must not duplicate into the Markdown body; preset strings are appended only under `content`.\n\n",delay:8e3},{content:`## All-in-one streaming demo

`},{content:`Plan steps above streamed as **reasoning**; below, the same markdown as the sidebar presets (single pass).

`},{content:i.chart+`

`},{content:i.kpiGroup+`

`},{content:i.kpis+`

`},{content:i.timeline+`

`},{content:i.form+`

`},{content:i.detailsFence+`

`},{content:i.detailsContainer+`

`},{content:`## Markdown in the bubble

Unordered list:

- **Streaming** — chunks append as they arrive.
- **Reasoning** — optional collapsible block above the fold.
- **Markdown** — headings, lists, tables, and fences.

`},{content:`GFM-style table:

| Feature | Notes |
| --- | --- |
| Lists | \`-\` / \`1.\` with optional nesting |
| Tables | Pipe rows + header separator row |
| Code | Indented block or fenced blocks |

`},{content:`## Timeline

Vertical timeline with status indicators:

<!-- bid:dev -->
1. [done] Collect requirements from stakeholders
2. [done] Design system architecture
3. [active] Implement core API endpoints
4. [pending] Write integration tests
5. [error] Deploy to staging (rollback triggered)
6. [skipped] Performance benchmarking

`}],v={min:280,max:520};let R=0,p=null;const w=()=>"msg-"+ ++R;function x(n,a,t){const o={reasoning:void 0,content:""};let s=0,l=!1,m=null;p=()=>{l=!0,clearTimeout(m),p=null};function k(e){return(e==null?void 0:e.delay)??v.min+Math.random()*(v.max-v.min)}function g(){if(l)return;if(s>=t.length){n.value.updateMessage(a,{...o,streaming:!1}),p=null;return}const e=t[s++];typeof e.reasoning=="string"&&(o.reasoning=(o.reasoning??"")+e.reasoning),typeof e.content=="string"&&(o.content+=e.content),n.value.updateMessage(a,{...o,streaming:!0}),m=setTimeout(g,k(e))}g()}function _(n){const a=n.value;setTimeout(()=>{const t=w();a.addMessage({id:t,role:"assistant",content:"",reasoning:"",streaming:!0,timestamp:Date.now()}),x(n,t,I)},400)}function B(){p&&p()}function K(n,a){n.value=a.detail.streaming}function H(n,a){var l;const t=n.value;t.addMessage({id:w(),role:"self",content:a,timestamp:Date.now()});const o=a.toLowerCase(),s=(l=Object.entries(i).find(([m])=>m.toLowerCase().includes(o)))==null?void 0:l[1];if(s){t.addMessage({id:w(),role:"assistant",content:s,timestamp:Date.now(),streaming:!1});return}_(n)}const L=(n,a)=>{const t=n.__vccOpts||n;for(const[o,s]of a)t[o]=s;return t},U={class:"demo-chat-toolbar"},A="*— Response stopped —*",N={__name:"ChatToolbar",props:{streaming:{type:Boolean,default:!1},chatRef:{required:!1,default:null,validator:n=>n==null||typeof n=="object"}},setup(n){const a=n,t=F(()=>u(a.chatRef));let o=0;function s(){return`msg-${++o}`}function l(){const e=t.value;e&&(e.addMessage({id:s(),role:"self",content:"Tell me about quantum computing",timestamp:Date.now()}),setTimeout(()=>{e.addMessage({id:s(),role:"assistant",content:"",error:"Service temporarily unavailable. Please try again later.",timestamp:Date.now()})},500))}function m(){var e;(e=t.value)==null||e.showError("Network lost. Reconnecting…",{duration:5e3})}function k(){var e;B(),(e=t.value)==null||e.cancel(A)}function g(){var e;(e=t.value)==null||e.clear()}return(e,r)=>{const h=C("el-button");return S(),D("div",U,[f(h,{size:"small",disabled:n.streaming,icon:u(M),onClick:l},{default:b(()=>[...r[0]||(r[0]=[y(" Error Message ",-1)])]),_:1},8,["disabled","icon"]),f(h,{size:"small",icon:u(P),onClick:m},{default:b(()=>[...r[1]||(r[1]=[y(" Error Banner ",-1)])]),_:1},8,["icon"]),f(h,{size:"small",type:"danger",icon:u(T),disabled:!n.streaming,onClick:k},{default:b(()=>[...r[2]||(r[2]=[y(" Cancel ",-1)])]),_:1},8,["icon","disabled"]),f(h,{size:"small",type:"danger",plain:"",icon:u(E),onClick:g},{default:b(()=>[...r[3]||(r[3]=[y(" Clear ",-1)])]),_:1},8,["icon"])])}}},G=L(N,[["__scopeId","data-v-92aa5fb7"]]);export{G as C,L as _,i as d,w as n,H as r,K as s};
