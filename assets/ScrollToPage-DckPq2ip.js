import{o as y,t as $,s as M,a as b,c as k,d as r,f as o,w as l,e as a,z as P,v as C,j as S,u as z,F as V,n as R,g as p}from"./index-Db_WKFtx.js";import{E as I}from"./ExampleCodeDrawer-BIhtKBBb.js";import{_ as h}from"./_plugin-vue_export-helper-DlAUqK2U.js";const D=`# Scroll To Message / Part

\`<i-chat>\` exposes \`scrollToMessage(id)\` and \`scrollToPart(partId)\` to programmatically scroll a message or part element into view. These methods use the existing \`data-message-id\` / \`data-part-id\` DOM attributes.

## scrollToMessage(id)

Scrolls the \`<i-chat-message>\` element whose \`data-message-id\` matches \`id\` into view using \`scrollIntoView({ behavior: 'smooth', block: 'nearest' })\`.

\`\`\`js
const chat = document.querySelector("i-chat");

// Scroll to a specific message
const found = chat.scrollToMessage("msg-10");
console.log(found); // true if the message is rendered

// Returns false if the message ID doesn't exist or isn't rendered yet
chat.scrollToMessage("nonexistent"); // → false
\`\`\`

## scrollToPart(partId)

Scrolls any element inside the messages shadow DOM with a matching \`data-part-id\` attribute into view.

\`\`\`js
// Scroll to a specific part within a message
chat.scrollToPart("part-5");

// Returns false if the part isn't found
chat.scrollToPart("nope"); // → false
\`\`\`

## Vue example

\`\`\`vue
<script setup>
import "@bndynet/ichat";
import { textPart } from "@bndynet/ichat";
import { ref, onMounted, nextTick } from "vue";

const chatRef = ref(null);

onMounted(async () => {
  await nextTick();
  const chat = chatRef.value;
  if (!chat) return;

  // Add messages with known IDs
  for (let i = 1; i <= 20; i++) {
    chat.addMessage({
      id: \`msg-\${i}\`,
      role: i % 2 ? "self" : "assistant",
      parts: [textPart(\`Message \${i}\`, { id: \`part-\${i}\` })],
      timestamp: Date.now(),
    });
  }
});

function goToMessage(id) {
  chatRef.value?.scrollToMessage(id);
}

function goToPart(partId) {
  chatRef.value?.scrollToPart(partId);
}
<\/script>

<template>
  <el-button @click="goToMessage('msg-10')">Go to Message 10</el-button>
  <el-button @click="goToPart('part-5')">Go to Part 5</el-button>
  <i-chat ref="chatRef" />
</template>
\`\`\`
`,E={class:"scroll-to-demo"},N={class:"demo-toolbar"},j={class:"toolbar-group"},B={class:"toolbar-group"},F={class:"toolbar-group"},G={key:0,class:"toolbar-result"},w=20,K={__name:"ScrollToPage",setup(O){const i=p(null),f=p(""),c=p(""),d=p("");async function x(e=30){for(let t=0;t<e;t++){if(i.value)return i.value;await R()}return i.value}y(async()=>{const e=await x();if(e)for(let t=1;t<=w;t++)e.addMessage({id:`msg-${t}`,role:t%2===0?"assistant":"self",parts:[$(`**Message ${t}**  
${"Lorem ipsum dolor sit amet consectetur adipiscing elit. ".repeat(t%3+1)}`,{id:`part-${t}`})],timestamp:Date.now()-(w-t)*6e4})});function u(e){var s;const t=(s=i.value)==null?void 0:s.scrollToMessage(e);d.value=`scrollToMessage("${e}") → ${t?"✅ found":"❌ not found"}`}function m(e){var s;const t=(s=i.value)==null?void 0:s.scrollToPart(e);d.value=`scrollToPart("${e}") → ${t?"✅ found":"❌ not found"}`}function g(){const e=f.value.trim();e&&u(e)}function v(){const e=c.value.trim();e&&m(e)}return(e,t)=>{const s=M("el-button"),T=M("el-input");return b(),k(V,null,[r("div",E,[r("div",N,[r("div",j,[t[15]||(t[15]=r("span",{class:"toolbar-label"},"Message:",-1)),o(s,{size:"small",onClick:t[0]||(t[0]=n=>u("msg-1"))},{default:l(()=>[...t[10]||(t[10]=[a("#1",-1)])]),_:1}),o(s,{size:"small",onClick:t[1]||(t[1]=n=>u("msg-5"))},{default:l(()=>[...t[11]||(t[11]=[a("#5",-1)])]),_:1}),o(s,{size:"small",onClick:t[2]||(t[2]=n=>u("msg-10"))},{default:l(()=>[...t[12]||(t[12]=[a("#10",-1)])]),_:1}),o(s,{size:"small",onClick:t[3]||(t[3]=n=>u("msg-15"))},{default:l(()=>[...t[13]||(t[13]=[a("#15",-1)])]),_:1}),o(s,{size:"small",type:"primary",onClick:t[4]||(t[4]=n=>u("msg-20"))},{default:l(()=>[...t[14]||(t[14]=[a("#20 (last)",-1)])]),_:1})]),r("div",B,[t[19]||(t[19]=r("span",{class:"toolbar-label"},"Part:",-1)),o(s,{size:"small",onClick:t[5]||(t[5]=n=>m("part-3"))},{default:l(()=>[...t[16]||(t[16]=[a("Part #3",-1)])]),_:1}),o(s,{size:"small",onClick:t[6]||(t[6]=n=>m("part-8"))},{default:l(()=>[...t[17]||(t[17]=[a("Part #8",-1)])]),_:1}),o(s,{size:"small",type:"primary",onClick:t[7]||(t[7]=n=>m("part-18"))},{default:l(()=>[...t[18]||(t[18]=[a("Part #18",-1)])]),_:1})]),r("div",F,[t[22]||(t[22]=r("span",{class:"toolbar-label"},"Custom:",-1)),o(T,{modelValue:f.value,"onUpdate:modelValue":t[8]||(t[8]=n=>f.value=n),size:"small",placeholder:"msg-7",style:{width:"100px"},onKeyup:P(g,["enter"])},null,8,["modelValue"]),o(s,{size:"small",onClick:g},{default:l(()=>[...t[20]||(t[20]=[a("Scroll to msg",-1)])]),_:1}),o(T,{modelValue:c.value,"onUpdate:modelValue":t[9]||(t[9]=n=>c.value=n),size:"small",placeholder:"part-12",style:{width:"100px"},onKeyup:P(v,["enter"])},null,8,["modelValue"]),o(s,{size:"small",onClick:v},{default:l(()=>[...t[21]||(t[21]=[a("Scroll to part",-1)])]),_:1})]),d.value?(b(),k("div",G,C(d.value),1)):S("v-if",!0)]),r("i-chat",{ref_key:"chatRef",ref:i},null,512)]),o(I,{title:"Scroll To code example",content:z(D)},null,8,["content"])],64)}}},q=h(K,[["__scopeId","data-v-b8f30afe"]]);export{q as default};
