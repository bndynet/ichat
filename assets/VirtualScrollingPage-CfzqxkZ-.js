import{o as H,n as L,D as K,s as S,c as M,d as V,e as a,f as h,w as p,F,B as W,i as C,v as u,j as J,u as Q,g as r,t as X}from"./index-KO6qPNXA.js";import{E as Y}from"./ExampleCodeDrawer-CQc7Z2Um.js";import{_ as Z}from"./_plugin-vue_export-helper-DlAUqK2U.js";const ee=`# Virtual scrolling

Virtual scrolling is **enabled by default** (\`'auto'\` mode). It automatically
activates when the message count exceeds 500, keeping the lightweight regular
keyed list for short conversations.

\`\`\`js
const chat = document.querySelector("i-chat-messages");

// Default: auto (enables at > 500 messages)
chat.config = { ...chat.config };

// Always on
chat.config = { ...chat.config, virtualScroll: true };

// Always off
chat.config = { ...chat.config, virtualScroll: false };
\`\`\`

When virtual scrolling is active, only the visible rows plus a small buffer
remain mounted in the DOM.

## Vue example

\`\`\`vue
<script setup>
import "@bndynet/ichat";
import { nextTick, onMounted, ref } from "vue";
import { textPart } from "@bndynet/ichat";

const chatRef = ref(null);

onMounted(async () => {
  await nextTick();
  const chat = chatRef.value;

  // Default 'auto' — no explicit config needed
  chat.config = { ...chat.config };
  chat.messages = Array.from({ length: 10_000 }, (_, index) => ({
    id: \`message-\${index + 1}\`,
    role: index % 4 === 0 ? "self" : "assistant",
    parts: [
      textPart(\`Message \${index + 1}\`, {
        id: \`part-\${index + 1}\`,
      }),
    ],
    timestamp: Date.now() + index,
  }));
});
<\/script>

<template>
  <i-chat-messages ref="chatRef" />
</template>
\`\`\`

Because off-screen elements are recycled, keep durable custom-part state in
message data instead of private DOM state. Existing mutation and streaming APIs
continue to work without a separate virtual-list data model.

## Trade-offs

Keeping off-screen rows out of the DOM is what makes this fast, and it costs a
few browser behaviours that a chat history otherwise gets for free:

- Find-in-page (Ctrl/Cmd+F) only matches the rendered range.
- Text selection and copy cannot span the whole history.
- Printing and "save as PDF" capture only the rendered range.

Set \`virtualScroll: false\` when these matter more than large-history performance.

\`scrollToMessage()\` and \`scrollToPart()\` still reach unmounted rows: they return
\`true\` to mean _scheduled_, and the scroll settles over the next few frames as the
virtualizer measures the row.
`,te={class:"virtual-scroll-demo"},ae={class:"demo-toolbar"},ne={class:"toolbar-control"},se={class:"toolbar-control"},oe={class:"metrics","aria-live":"polite"},le={class:"metric"},re={class:"metric"},ie={class:"metric"},ue={class:"metric"},ce={class:"metric-status"},de={key:0,class:"demo-note"},me={__name:"VirtualScrollingPage",setup(fe){const I=[100,1e3,1e4],k=new Map,f=r(null),c=r(1e3),o=r("auto"),g=r(!1),d=r(!1),R=r(0),A=r(0),D=r(0),$=r("Auto"),w=r("Ready");let y=0,v=0;function E(t){const e=k.get(t);if(e)return e;const s=Date.now(),n=Array.from({length:t},(l,i)=>{const m=i+1;return{id:`virtual-msg-${m}`,role:m%4===0?"self":"assistant",parts:[X(`**Message ${m.toLocaleString()}** of ${t.toLocaleString()}`,{id:`virtual-part-${m}`})],timestamp:s}});return k.set(t,n),n}function b(){return new Promise(t=>requestAnimationFrame(t))}async function z(t,e){var s;if(await t.updateComplete,e)for(let n=0;n<90;n+=1){const l=(s=t.shadowRoot)==null?void 0:s.querySelector("lit-virtualizer");if(l){try{await l.layoutComplete}catch{}break}await b()}await b(),await b()}function _(){const t=f.value,e=t==null?void 0:t.shadowRoot;!t||!e||(R.value=e.querySelectorAll("i-chat-message").length,A.value=t.messages.length,$.value=e.querySelector("lit-virtualizer")?"Virtual":"Regular")}async function x(t="Scenario updated"){const e=f.value;if(!e)return;const s=++y;v+=1,d.value=!1,g.value=!0,await L();const n=performance.now();e.config={...e.config,virtualScroll:o.value},e.messages=E(c.value),await z(e,P()),s===y&&(D.value=performance.now()-n,_(),w.value=t,g.value=!1)}async function O(t){await x(`${t.toLocaleString()} messages loaded`)}function q(){o.value==="auto"?o.value=!0:o.value===!0?o.value=!1:o.value="auto",x(`Virtual scroll: ${o.value}`)}function B(){return o.value==="auto"?"Auto":o.value?"On":"Off"}function P(){const t=o.value;return t==="auto"?c.value>500:!!t}function N(){var e,s;const t=Array.from(((s=(e=f.value)==null?void 0:e.shadowRoot)==null?void 0:s.querySelectorAll("i-chat-message[data-message-id]"))??[]).flatMap(n=>{const l=/^virtual-msg-(\d+)$/.exec(n.dataset.messageId??"");return l?[Number(l[1])]:[]});return t.length===0?1:Math.round((Math.min(...t)+Math.max(...t))/2)}async function U(){const t=f.value;if(!t||d.value)return;const e=++v,s=N(),n=`virtual-msg-${s}`,l=`virtual-part-${s}`,i=`**Message ${s.toLocaleString()}** of ${c.value.toLocaleString()}`,m=[`

### Streaming variable-height update

`,"This visible message grows in place. ",`The virtual list measures the new height without mounting the full history.

`,`- First streamed item
`,`- Second streamed item with a little more content
`,"- Final item confirms the row can grow across multiple updates."];d.value=!0,t.updateMessage(n,{streaming:!0});let T=i;for(const j of m){if(await new Promise(G=>window.setTimeout(G,140)),e!==v)return;T+=j,t.updatePart(n,l,{text:T,status:"streaming"}),_()}e===v&&(t.updatePart(n,l,{status:"complete"}),t.updateMessage(n,{streaming:!1}),d.value=!1,w.value="Variable-height stream completed",await t.updateComplete,_())}return H(async()=>{await L(),await x("Initial virtual list ready")}),K(()=>{y+=1,v+=1}),(t,e)=>{const s=S("el-radio-button"),n=S("el-radio-group"),l=S("el-button");return M(),V(F,null,[a("div",te,[a("div",ae,[a("div",ne,[e[1]||(e[1]=a("span",{class:"toolbar-label"},"Messages",-1)),h(n,{modelValue:c.value,"onUpdate:modelValue":e[0]||(e[0]=i=>c.value=i),size:"small",disabled:g.value||d.value,onChange:O},{default:p(()=>[(M(),V(F,null,W(I,i=>h(s,{key:i,value:i},{default:p(()=>[C(u(i.toLocaleString()),1)]),_:2},1032,["value"])),64))]),_:1},8,["modelValue","disabled"])]),a("div",se,[e[2]||(e[2]=a("span",{class:"toolbar-label"},"Virtual scroll",-1)),h(l,{size:"small",type:o.value==="auto"?"primary":"default",disabled:g.value||d.value,onClick:q},{default:p(()=>[C(u(B()),1)]),_:1},8,["type","disabled"])]),h(l,{size:"small",type:"primary",loading:d.value,disabled:g.value,onClick:U},{default:p(()=>[...e[3]||(e[3]=[C(" Stream visible row ",-1)])]),_:1},8,["loading","disabled"])]),a("div",oe,[a("div",le,[e[4]||(e[4]=a("span",{class:"metric-label"},"Mode",-1)),a("strong",null,u($.value),1)]),a("div",re,[e[5]||(e[5]=a("span",{class:"metric-label"},"Data rows",-1)),a("strong",null,u(A.value.toLocaleString()),1)]),a("div",ie,[e[6]||(e[6]=a("span",{class:"metric-label"},"Mounted DOM rows",-1)),a("strong",null,u(R.value.toLocaleString()),1)]),a("div",ue,[e[7]||(e[7]=a("span",{class:"metric-label"},"Settle time",-1)),a("strong",null,u(D.value.toFixed(1))+" ms",1)]),a("p",ce,u(w.value),1)]),c.value>500&&o.value==="auto"?(M(),V("p",de," Auto mode enables virtual scrolling when messages exceed 500. Current count: "+u(c.value.toLocaleString())+" → "+u(P()?"Virtual":"Regular"),1)):J("v-if",!0),a("i-chat-messages",{ref_key:"chatRef",ref:f,class:"message-list"},null,512)]),h(Y,{title:"Virtual scrolling code example",content:Q(ee)},null,8,["content"])],64)}}},pe=Z(me,[["__scopeId","data-v-84a73368"]]);export{pe as default};
