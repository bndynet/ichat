import{o as p,t as u,h as m,a as g,c as f,d as h,f as y,u as b,F as P,n as v,g as I}from"./index-Db_WKFtx.js";import{d as k,n as x}from"./demo-data-T6QExYDe.js";import{E as D}from"./ExampleCodeDrawer-BIhtKBBb.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const w=`## Render progress

The progress renderer reads a Markdown list with status markers. Use a block id when you plan to update a specific progress block later.

\`\`\`js
import "@bndynet/ichat";
import { textPart } from "@bndynet/ichat";

const chat = document.querySelector("i-chat-messages");
const messageId = crypto.randomUUID();

chat.addMessage({
  id: messageId,
  role: "assistant",
  timestamp: Date.now(),
  parts: [
    textPart(\`## Deployment Pipeline

### BUILD
<!-- bid:build -->
1. [done] Build Docker image
2. [error] Run test suite
3. [active] Push to registry

### DEPLOY
<!-- bid:deploy -->
1. [done] Deploy to staging
2. [error] Run smoke tests
3. [pending] Promote to production\`),
  ],
});
\`\`\`

## Update an item

Use the message id, one-based step number, next status, and block id to apply a live update.

\`\`\`js
chat.updateProgressStep(messageId, 1, "active", "build");
chat.updateProgressStep(messageId, 2, "done", "build");
chat.updateProgressStep(messageId, 1, "active", "deploy");
\`\`\`
`,R={__name:"ProgressPage",setup(_){const s=I(null);async function c(n=30){for(let t=0;t<n;t++){const a=s.value;if(a)return a;await v()}return s.value}let e;return p(async()=>{const n=await c();if(!n)return;const t=x();n.addMessage({id:t,role:"assistant",parts:[u(k.progress)],timestamp:Date.now()});const a=["active","done","error"].flatMap(r=>["build","deploy"].flatMap(o=>[1,2,3].map(d=>({bid:o,step:d,s:r}))));let i=0;e=setInterval(()=>{if(i>=a.length){clearInterval(e),e=void 0;return}const r=s.value;if(!r){clearInterval(e),e=void 0;return}const{bid:o,step:d,s:l}=a[i++];r.updateProgressStep(t,d,l,o)},500)}),m(()=>{e!=null&&clearInterval(e)}),(n,t)=>(g(),f(P,null,[h("i-chat-messages",{ref_key:"chatRef",ref:s},null,512),y(D,{title:"Progress code example",content:b(w)},null,8,["content"])],64))}};export{R as default};
