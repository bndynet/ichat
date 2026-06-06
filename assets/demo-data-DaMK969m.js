import{t as h,i as S}from"./index-Bp0ACXWZ.js";const o=n=>"```chart\n"+JSON.stringify(n,null,2)+"\n```",s={bar:o({type:"bar",data:{categories:["JS","Python","TS","Java","Rust","Go"],series:[{name:"Popularity",data:[95,88,78,65,42,38]}]},options:{title:"Most Popular Languages 2025"}}),barH:o({type:"bar",data:{categories:["React","Vue","Angular","Svelte"],series:[{name:"Stars (k)",data:[220,207,93,77]}]},options:{title:"Framework Stars",variant:"horizontal"}}),line:o({type:"line",data:{categories:["Jan","Feb","Mar","Apr","May","Jun"],series:[{name:"Revenue",data:[3200,4500,3800,5100,4700,6200]}]},options:{title:"Monthly Revenue 2025"}}),area:o({type:"area",data:{categories:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],series:[{name:"Visitors",data:[820,932,901,934,1290,1330,1320]}]},options:{title:"Website Visitors"}}),pie:o({type:"pie",data:[{name:"Chrome",value:65},{name:"Safari",value:18},{name:"Firefox",value:7},{name:"Edge",value:5},{name:"Other",value:5}],options:{title:"Browser Market Share"}}),doughnut:o({type:"pie",data:[{name:"Chrome",value:65},{name:"Safari",value:18},{name:"Firefox",value:7},{name:"Other",value:10}],options:{title:"Browser Share — Doughnut",variant:"doughnut"}}),gauge:o({type:"gauge",data:{value:72,max:100,label:"Score"},options:{title:"Server Response Score"}})},i={mermaid:`Diagrams use the **\`mermaid\`** fence. Theme follows \`data-theme\` on \`<html>\` (light / dark).

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

`+s.bar+`

### Bar — Horizontal

`+s.barH+`

### Line

`+s.line+`

### Area

`+s.area+`

## Pie

`+s.pie+`

### Doughnut

`+s.doughnut+`

## Gauge

`+s.gauge,kpis:'Here is the KPI summary for today:\n\n```kpi\n{"label": "Revenue", "value": "$50,846.90", "trend": -12}\n```\n\n```kpi\n{"label": "New Users", "value": "1,284", "trend": 8}\n```\n\n```kpi\n{"label": "Churn Rate", "value": "3.2%", "trend": 0.5, "unit": "pp"}\n```\n\n```kpi\n{"label": "MRR", "value": "$128,400"}\n```',kpiGroup:`Here is the combined KPI overview:

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
:::`},P=[{reasoning:"**Parse intent:** User sent `thinking`. Demo **all-in-one** — same SSE shape as production (`reasoning` + `content`), but the reply body pulls in every preset from `demoData`: Charts → KPI cards → KPI group → Form → Details (fence + container) → Markdown notes → dev timeline.\n\n"},{reasoning:'<!-- bid:plan -->\n1. [done] **Scope** — Reasoning stays in the collapsible block; body streams preset content by reference.\n2. [done] **Charts** — `charts.*` fences via `demoData.Charts`.\n3. [done] **KPI** — `kpi` / `kpis` blocks from `demoData["KPI Cards"]` and `demoData["KPI Group"]`.\n4. [done] **Form** — JSON form fence from `demoData.Form`.\n5. [done] **Details** — Fence + container from `demoData["Details (fence)"]` and `demoData["Details (container)"]`.\n6. [done] **Pace** — Chunked `content` events so streaming stays visible.\n7. [done] **UX** — Expand thinking (推理过程); answer emphasizes widgets + timeline.\n8. [done] **Contract** — Optional `reasoning` + `content` per event.\n\n'},{reasoning:"**Sanity check:** Reasoning must not duplicate into the Markdown body; preset strings are appended only under `content`.\n\n",delay:8e3},{content:`## All-in-one streaming demo

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

`}],u={min:280,max:520};let C=0,m=null;const g=()=>"msg-"+ ++C,b="reasoning",p="content";function D(n,e,a){const r=n.value;let d="",l="",c=!1,f=0,y=!1,k=null;m=()=>{y=!0,clearTimeout(k),m=null};function w(t){return(t==null?void 0:t.delay)??u.min+Math.random()*(u.max-u.min)}function v(){if(y)return;if(f>=a.length){r.updatePart(e,b,{status:"complete"}),c&&r.updatePart(e,p,{status:"complete"}),r.updateMessage(e,{streaming:!1}),m=null;return}const t=a[f++];typeof t.reasoning=="string"&&(d+=t.reasoning,r.updatePart(e,b,{text:d,status:"streaming"})),typeof t.content=="string"&&(l+=t.content,c?r.updatePart(e,p,{text:l,status:"streaming"}):(r.appendPart(e,h(l,{id:p,status:"streaming"})),c=!0)),k=setTimeout(v,w(t))}v()}function T(n){const e=n.value;setTimeout(()=>{const a=g();e.addMessage({id:a,role:"assistant",parts:[S("",{id:b,status:"streaming"})],streaming:!0,timestamp:Date.now()}),D(n,a,P)},400)}function F(){m&&m()}function R(n,e){var l;const a=n.value;a.addMessage({id:g(),role:"self",parts:[h(e)],timestamp:Date.now()});const r=e.toLowerCase(),d=(l=Object.entries(i).find(([c])=>c.toLowerCase().includes(r)))==null?void 0:l[1];if(d){a.addMessage({id:g(),role:"assistant",parts:[h(d)],timestamp:Date.now(),streaming:!1});return}T(n)}export{F as c,i as d,g as n,R as r};
