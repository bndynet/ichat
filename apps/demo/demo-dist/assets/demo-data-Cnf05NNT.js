const o=e=>"```chart\n"+JSON.stringify(e,null,2)+"\n```",i={bar:o({type:"bar",data:{categories:["JS","Python","TS","Java","Rust","Go"],series:[{name:"Popularity",data:[95,88,78,65,42,38]}]},options:{title:"Most Popular Languages 2025"}}),barH:o({type:"bar",data:{categories:["React","Vue","Angular","Svelte"],series:[{name:"Stars (k)",data:[220,207,93,77]}]},options:{title:"Framework Stars",variant:"horizontal"}}),line:o({type:"line",data:{categories:["Jan","Feb","Mar","Apr","May","Jun"],series:[{name:"Revenue",data:[3200,4500,3800,5100,4700,6200]}]},options:{title:"Monthly Revenue 2025"}}),area:o({type:"area",data:{categories:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],series:[{name:"Visitors",data:[820,932,901,934,1290,1330,1320]}]},options:{title:"Website Visitors"}}),pie:o({type:"pie",data:[{name:"Chrome",value:65},{name:"Safari",value:18},{name:"Firefox",value:7},{name:"Edge",value:5},{name:"Other",value:5}],options:{title:"Browser Market Share"}}),doughnut:o({type:"pie",data:[{name:"Chrome",value:65},{name:"Safari",value:18},{name:"Firefox",value:7},{name:"Other",value:10}],options:{title:"Browser Share — Doughnut",variant:"doughnut"}}),gauge:o({type:"gauge",data:{value:72,max:100,label:"Score"},options:{title:"Server Response Score"}})},d=[["Charts",`Here are the chart types supported by **@bndynet/icharts**.

## XY Charts

### Bar

`+i.bar+`

### Bar — Horizontal

`+i.barH+`

### Line

`+i.line+`

### Area

`+i.area+`

## Pie

`+i.pie+`

### Doughnut

`+i.doughnut+`

## Gauge

`+i.gauge],["KPI Cards",'Here is the KPI summary for today:\n\n```kpi\n{"label": "Revenue", "value": "$50,846.90", "trend": -12}\n```\n\n```kpi\n{"label": "New Users", "value": "1,284", "trend": 8}\n```\n\n```kpi\n{"label": "Churn Rate", "value": "3.2%", "trend": 0.5, "unit": "pp"}\n```\n\n```kpi\n{"label": "MRR", "value": "$128,400"}\n```'],["KPI Group",`Here is the combined KPI overview:

\`\`\`kpis
[
  {"label": "Revenue", "value": "$50,846.90", "trend": -12},
  {"label": "New Users", "value": "1,284", "trend": 8},
  {"label": "MRR", "value": "$128,400"}
]
\`\`\``],["Form",`Please fill out the feedback form below:

\`\`\`form
{
  "id": "user-feedback",
  "title": "User Feedback",
  "submitLabel": "Send Feedback",
  "fields": [
    {"name": "name", "label": "Your Name", "type": "text", "required": true},
    {"name": "email", "label": "Email", "type": "email"},
    {"name": "satisfaction", "label": "Satisfaction", "type": "select", "options": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"]},
    {"name": "source", "label": "How did you find us?", "type": "radio", "options": ["Search", "Social media", "Word of mouth", "Other"]},
    {"name": "subscribe", "label": "Subscribe to newsletter", "type": "checkbox"},
    {"name": "comments", "label": "Additional Comments", "type": "textarea"}
  ]
}
\`\`\``],["Details (fence)",`The following use the **fence syntax** (\` \`\`\`details Title \`) to collapse content.

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
\`\`\``],["Details (container)",`The following use the **container syntax** (\`:::details Title\`) for collapsible blocks.

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
:::`]],b=[{reasoning:"**Parse intent:** User sent `thinking`. Demo **all-in-one** — same SSE shape as production (`reasoning` + `content`), but the reply body pulls in every preset from `demoData`: Charts → KPI cards → KPI group → Form → Details (fence + container) → Markdown notes → dev timeline.\n\n"},{reasoning:"<!-- bid:plan -->\n1. [done] **Scope** — Reasoning stays in the collapsible block; body streams preset content by reference.\n2. [done] **Charts** — `charts.*` fences via preset `demoData[0]`.\n3. [done] **KPI** — `kpi` / `kpis` blocks from presets `[1]` and `[2]`.\n4. [done] **Form** — JSON form fence from preset `[3]`.\n5. [done] **Details** — Fence + container variants from presets `[4]` and `[5]`.\n6. [done] **Pace** — Chunked `content` events so streaming stays visible.\n7. [done] **UX** — Expand thinking (推理过程); answer emphasizes widgets + timeline.\n8. [done] **Contract** — Optional `reasoning` + `content` per event.\n\n"},{reasoning:"**Sanity check:** Reasoning must not duplicate into the Markdown body; preset strings are appended only under `content`.\n\n",delay:8e3},{content:`## All-in-one streaming demo

`},{content:`Plan steps above streamed as **reasoning**; below, the same markdown as the sidebar presets (single pass).

`},{content:d[0][1]+`

`},{content:d[1][1]+`

`},{content:d[2][1]+`

`},{content:d[3][1]+`

`},{content:d[4][1]+`

`},{content:d[5][1]+`

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

`}],h={min:280,max:520};let f=0,p=null;const r=()=>"msg-"+ ++f;function y(e,n,t){const s={reasoning:void 0,content:""};let u=0,g=!1,l=null;p=()=>{g=!0,clearTimeout(l),p=null};function m(a){return(a==null?void 0:a.delay)??h.min+Math.random()*(h.max-h.min)}function c(){if(g)return;if(u>=t.length){e.value.updateMessage(n,{...s,streaming:!1}),p=null;return}const a=t[u++];typeof a.reasoning=="string"&&(s.reasoning=(s.reasoning??"")+a.reasoning),typeof a.content=="string"&&(s.content+=a.content),e.value.updateMessage(n,{...s,streaming:!0}),l=setTimeout(c,m(a))}c()}function v(e){const n=e.value;setTimeout(()=>{const t=r();n.addMessage({id:t,role:"assistant",content:"",reasoning:"",streaming:!0,timestamp:Date.now()}),y(e,t,b)},400)}function k(e){e.value.addMessage({id:r(),role:"self",content:"thinking",timestamp:Date.now()}),v(e)}function w(e){const n=e.value,t=r();n.addMessage({id:t,role:"assistant",timestamp:Date.now(),content:`## Deployment Pipeline

### BUILD
<!-- bid:build -->
1. [pending] Build Docker image
2. [pending] Run test suite
3. [pending] Push to registry

### DEPLOY
<!-- bid:deploy -->
1. [pending] Deploy to staging
2. [pending] Run smoke tests
3. [pending] Promote to production
`});const s=["active","done","error"].flatMap(l=>["build","deploy"].flatMap(m=>[0,1,2].map(c=>({bid:m,i:c,s:l}))));let u=0;const g=setInterval(()=>{if(u>=s.length){clearInterval(g);return}const{bid:l,i:m,s:c}=s[u++];n.updateTimeline(t,m,c,l)},500)}function S(e){const n=e.value;n.addMessage({id:r(),role:"self",content:"Tell me about quantum computing",timestamp:Date.now()}),setTimeout(()=>{n.addMessage({id:r(),role:"assistant",content:"",error:"Service temporarily unavailable. Please try again later.",timestamp:Date.now()})},500)}function M(e){e.value.showError("Network lost. Reconnecting…",{duration:5e3})}function D(e,n){e.value.addMessage({id:r(),role:"assistant",content:n,timestamp:Date.now(),streaming:!1})}function P(e,n){e.value.addMessage({...n,id:n.id??r(),timestamp:n.timestamp??Date.now()})}function T(e){p&&p(),e.value.cancel("*— Response stopped —*")}function C(e){e.value.clear()}function I(e,n){e.value=n.detail.streaming}function R(e){const{action:n,message:t}=e.detail;n==="copy"?navigator.clipboard.writeText(t.content):n==="like"&&console.info("[chat-demo] like",t.id)}export{D as a,w as b,C as c,d,k as e,T as f,M as g,R as h,I as i,P as j,v as r,S as s};
