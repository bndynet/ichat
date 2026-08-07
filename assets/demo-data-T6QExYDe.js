import{t as h,r as y}from"./index-Db_WKFtx.js";const i=e=>"```chart\n"+JSON.stringify(e,null,2)+"\n```",l={bar:i({type:"bar",data:{categories:["JS","Python","TS","Java","Rust","Go"],series:[{name:"Popularity",data:[95,88,78,65,42,38]}]},options:{title:"Most Popular Languages 2025"}}),barH:i({type:"bar",data:{categories:["React","Vue","Angular","Svelte"],series:[{name:"Stars (k)",data:[220,207,93,77]}]},options:{title:"Framework Stars",variant:"horizontal"}}),line:i({type:"line",data:{categories:["Jan","Feb","Mar","Apr","May","Jun"],series:[{name:"Revenue",data:[3200,4500,3800,5100,4700,6200]}]},options:{title:"Monthly Revenue 2025"}}),area:i({type:"area",data:{categories:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],series:[{name:"Visitors",data:[820,932,901,934,1290,1330,1320]}]},options:{title:"Website Visitors"}}),pie:i({type:"pie",data:[{name:"Chrome",value:65},{name:"Safari",value:18},{name:"Firefox",value:7},{name:"Edge",value:5},{name:"Other",value:5}],options:{title:"Browser Market Share"}}),doughnut:i({type:"pie",data:[{name:"Chrome",value:65},{name:"Safari",value:18},{name:"Firefox",value:7},{name:"Other",value:10}],options:{title:"Browser Share — Doughnut",variant:"doughnut"}}),gauge:i({type:"gauge",data:{value:72,max:100,label:"Score"},options:{title:"Server Response Score"}})},r={mermaid:`Diagrams use the **\`mermaid\`** fence. Theme follows \`data-theme\` on \`<html>\` (light / dark).

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

`+l.bar+`

### Bar — Horizontal

`+l.barH+`

### Line

`+l.line+`

### Area

`+l.area+`

## Pie

`+l.pie+`

### Doughnut

`+l.doughnut+`

## Gauge

`+l.gauge,kpis:'Here is the KPI summary for today:\n\n```kpi\n{"label": "Revenue", "value": "$50,846.90", "trend": -12}\n```\n\n```kpi\n{"label": "New Users", "value": "1,284", "trend": 8}\n```\n\n```kpi\n{"label": "Churn Rate", "value": "3.2%", "trend": 0.5, "unit": "pp"}\n```\n\n```kpi\n{"label": "MRR", "value": "$128,400"}\n```',kpiGroup:`Here is the combined KPI overview:

\`\`\`kpis
[
  {"label": "Revenue", "value": "$50,846.90", "trend": -12},
  {"label": "New Users", "value": "1,284", "trend": 8},
  {"label": "MRR", "value": "$128,400"}
]
\`\`\``,progress:`## Deployment Pipeline

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
\`\`\``,formSubmitted:`Previously submitted form (history replay):

\`\`\`form
{
  "id": "feedback-123",
  "title": "User Feedback",
  "fields": [
    {"name": "name", "label": "Your Name", "type": "text"},
    {"name": "satisfaction", "label": "Satisfaction", "type": "select", "options": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"]},
    {"name": "source", "label": "How did you find us?", "type": "radio", "options": ["Search", "Social media", "Word of mouth", "Other"]},
    {"name": "subscribe", "label": "Subscribe to newsletter", "type": "checkbox"},
    {"name": "comments", "label": "Additional Comments", "type": "textarea"}
  ],
  "submittedValues": {
    "name": "Alice",
    "satisfaction": "Very Satisfied",
    "source": "Social media",
    "subscribe": true,
    "comments": "Great product! Love the new features."
  }
}
\`\`\``,detailsFence:`The following use the **fence syntax** (\` \`\`\`details Title \`) to collapse content.

\`\`\`details 📋 Project Overview
A modern chat interface with rich markdown support.

**Features:**
- Streaming messages with typewriter effect
- Collapsible reasoning blocks
- Charts, KPI cards, progress, forms
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
:::`},w=[{reasoning:`**Summary:** The user asked for the all-in-one demo, so I will keep the thought stream compact and use the answer body for the heavy markdown/rendering examples.

`},{reasoning:`<!-- bid:plan -->
1. [done] **Classify** — Treat this as a showcase request.
2. [active] **Prepare** — Stream a short thought summary while the answer gathers charts, KPI, form, details, and progress examples.
3. [pending] **Answer** — Put the user-facing result in the main bubble.
4. [pending] **Finish** — Collapse the summary when generation completes.

`},{reasoning:`**Check:** Keep the summary useful but secondary; avoid duplicating the final answer.

> Thought summaries may be brief, missing, or redacted depending on the model provider. The UI should still feel stable.

`,delay:8e3},{content:`## All-in-one streaming demo

`},{content:`The compact **thought summary** above streams separately; below, the answer body renders the same markdown as the sidebar presets in one pass.

`},{content:r.chart+`

`},{content:r.kpiGroup+`

`},{content:r.kpis+`

`},{content:r.progress+`

`},{content:r.form+`

`},{content:`## Form with submitted values

`+r.formSubmitted+`

`},{content:r.detailsFence+`

`},{content:r.detailsContainer+`

`},{content:`## Markdown in the bubble

Unordered list:

- **Streaming** — chunks append as they arrive.
- **Thought summary** — optional collapsible context above the answer.
- **Markdown** — headings, lists, tables, and fences.

Links (open in new window):

- [Google](https://www.google.com)
- [GitHub](https://github.com)
- [Example relative link](./relative)
- [Anchor link](#markdown-in-the-bubble)
- [mailto link](mailto:test@example.com)

`},{content:`> **Note:** This is a blockquote inside the message content — compare its spacing with the one in the reasoning body.
>
> It can span multiple lines too.

> **Second quote (content):** Another blockquote to check spacing between two consecutive quotes.

`},{content:`GFM-style table:

| Feature | Notes |
| --- | --- |
| Lists | \`-\` / \`1.\` with optional nesting |
| Tables | Pipe rows + header separator row |
| Code | Indented block or fenced blocks |

`},{content:`## Progress

Vertical progress block with status indicators:

<!-- bid:dev -->
1. [done] Collect requirements from stakeholders
2. [done] Design system architecture
3. [active] Implement core API endpoints
4. [pending] Write integration tests
5. [error] Deploy to staging (rollback triggered)
6. [skipped] Performance benchmarking

`}],u={min:280,max:520};let k=0,c=null;const v=()=>"msg-"+ ++k,b="reasoning",p="content";function S(e,s,n){let t="",d="",m=!1,o=0;function f(a){return(a==null?void 0:a.delay)??u.min+Math.random()*(u.max-u.min)}function g(){if(n.cancelled)return;if(o>=s.length){e.updatePart(b,{status:"complete"}),m&&e.updatePart(p,{status:"complete"}),e.complete(),n.timer=null,c===e&&(c=null);return}const a=s[o++];typeof a.reasoning=="string"&&(t+=a.reasoning,e.updatePart(b,{text:t,status:"streaming"})),typeof a.content=="string"&&(d+=a.content,m?e.updatePart(p,{text:d,status:"streaming"}):(e.appendPart(h(d,{id:p,status:"streaming"})),m=!0)),n.timer=setTimeout(g,f(a))}g()}function C(e){const s=e.value,n={cancelled:!1,timer:null},t=s.createRunController({onCancel:()=>{n.cancelled=!0,n.timer!==null&&clearTimeout(n.timer),n.timer=null,c===t&&(c=null)}});c=t,t.start([y("",{id:b,status:"streaming"})]),n.timer=setTimeout(()=>{n.timer=null,!n.cancelled&&S(t,w,n)},3e3)}function T(e){return c?(c.cancel(e),!0):!1}function x(e,s){var m;const n=e.value;n.addMessage({id:v(),role:"self",parts:[h(s)],timestamp:Date.now()});const t=s.toLowerCase(),d=(m=Object.entries(r).find(([o])=>o.toLowerCase().includes(t)))==null?void 0:m[1];if(d){const o=n.createRunController();return o.start(),o.complete({parts:[h(d)]}),!1}return C(e),!0}export{T as c,r as d,v as n,x as r};
