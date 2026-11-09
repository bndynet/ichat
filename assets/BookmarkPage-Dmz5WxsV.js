import{o as T,n as g,s as f,c as y,d as v,e as n,f as i,w as d,i as r,F as w,B as C,v as R,G as P,u as E,g as m,t as _}from"./index-fyJKpX9K.js";import{E as $}from"./ExampleCodeDrawer-BwR-MUVL.js";import{_ as S}from"./_plugin-vue_export-helper-DlAUqK2U.js";const V=`# Bookmarks (message rail)

Mark selected messages with \`bookmark\` so they appear in a compact, clickable
rail. The rail is a **standalone** Web Component — \`@bndynet/ichat-bookmarks\` —
so you can place it anywhere in your layout (a sidebar, a gutter, a toolbar).
In a busy chatroom you mark only the messages worth jumping back to — system
announcements, conclusions, or mentions — while every other message stays out
of the rail.

\`\`\`bash
npm install @bndynet/ichat-bookmarks
\`\`\`

\`\`\`js
import "@bndynet/ichat-bookmarks";
import { textPart } from "@bndynet/ichat";

chat.addMessage({
  id: "a1",
  role: "assistant",
  parts: [textPart("The final answer is 42.")],
  bookmark: true, // default label: the message's text preview
});

chat.addMessage({
  id: "a2",
  role: "system",
  parts: [textPart("…")],
  bookmark: { label: "结论：方案 B 已通过" }, // custom short label
});

// Messages without \`bookmark\` never appear in the rail.
chat.addMessage({
  id: "a3",
  role: "self",
  parts: [textPart("普通消息，不上榜")],
});
\`\`\`

## Connect the rail

Bind it to a chat/list element by id with \`for\` (works in any framework and
native HTML):

\`\`\`html
<i-chat id="chat-1"></i-chat> <i-chat-bookmarks for="chat-1"></i-chat-bookmarks>
\`\`\`

Or set \`.source\` programmatically:

\`\`\`js
document.querySelector("i-chat-bookmarks").source =
  document.getElementById("chat-1");
\`\`\`

## Behaviour

- Only messages with a truthy \`bookmark\` are shown, in message order.
- Hovering a bar previews the \`label\` (or a truncated plain-text preview).
- Clicking a bar scrolls to the message (reusing \`scrollToMessage\`) and
  highlights it.
- Auto-syncs on \`messages-change\`. After a direct \`chat.messages = […]\`
  assignment, call \`bookmarks.refresh()\`.

## Theming

The bar colour is \`--chat-bookmark-color\`, defaulting to a neutral gray
(\`--chat-text-secondary\`), so it follows your light/dark theme automatically.

\`\`\`css
:root {
  --chat-bookmark-color: #f59e0b;
  --chat-bookmarks-gap: 6px; /* spacing between bars */
}
\`\`\`

## Vue example

\`\`\`vue
<script setup>
import "@bndynet/ichat";
import "@bndynet/ichat-bookmarks";
import { nextTick, onMounted, ref } from "vue";
import { textPart } from "@bndynet/ichat";

const chatRef = ref(null);
const bookmarksRef = ref(null);

onMounted(async () => {
  await nextTick();
  chatRef.value.messages = [
    {
      id: "msg-1",
      role: "assistant",
      parts: [textPart("The answer is 42.")],
      bookmark: { label: "结论" },
    },
    {
      id: "msg-2",
      role: "self",
      parts: [textPart("A normal message.")],
      // no bookmark → not shown in the rail
    },
  ];
  bookmarksRef.value.refresh(); // after a direct .messages assignment
});
<\/script>

<template>
  <div style="display: flex; height: 100%">
    <aside style="flex: 0 0 44px; display: flex; justify-content: center">
      <i-chat-bookmarks for="bookmark-chat" ref="bookmarksRef" />
    </aside>
    <i-chat-messages id="bookmark-chat" ref="chatRef" style="flex: 1" />
  </div>
</template>
\`\`\`
`,j={class:"demo-toolbar"},D={class:"toolbar-control"},O={class:"toolbar-control"},A={class:"demo-body"},F={class:"floating-rail"},z={__name:"BookmarkPage",setup(H){const c=m(null),k=m(null),b=m("few"),u=m(""),h=m(!1),x=[{label:"Default",value:""},{label:"Warning",value:"#f59e0b"},{label:"Success",value:"#10b981"},{label:"Error",value:"#ef4444"}];function p(){const s=Date.now(),a=[];for(let e=1;e<=30;e++){const t=e%4===0?"self":e%2===0?"assistant":"peer";let o;e===3?o=!0:e===7?o={label:"结论：方案 B 已通过"}:e===14?o={label:"系统公告"}:e===21?o={label:"@我 的重要消息"}:e===27&&(o=!0),a.push({id:`bm-${e}`,role:t,parts:[_(`**Message ${e}**  
${"Some chatroom chatter for this message. ".repeat(e%3+1)}`,{id:`bm-part-${e}`})],timestamp:s-(30-e)*6e4,...o?{bookmark:o}:{}})}return a}function M(){const s=Date.now();return Array.from({length:1e3},(a,e)=>{const t=e+1,o=t===1||t===250||t===500||t===750||t===1e3;return{id:`bm-many-${t}`,role:t%4===0?"self":"assistant",parts:[_(`**Message ${t}**`,{id:`bm-many-part-${t}`})],timestamp:s+t,...o?{bookmark:t===1?{label:"最早的消息"}:!0}:{}}})}async function B(s){var e;const a=c.value;a&&(h.value=!0,b.value=s,await g(),a.messages=s==="few"?p():M(),(e=k.value)==null||e.refresh(),await a.updateComplete,h.value=!1)}return T(async()=>{var s;await g(),c.value&&(c.value.messages=p(),(s=k.value)==null||s.refresh())}),(s,a)=>{const e=f("el-radio-button"),t=f("el-radio-group"),o=f("el-button");return y(),v(w,null,[n("div",{class:"bookmark-demo",style:P(u.value?{"--chat-bookmark-color":u.value}:{})},[n("div",j,[n("div",D,[a[3]||(a[3]=n("span",{class:"toolbar-label"},"Messages",-1)),i(t,{modelValue:b.value,"onUpdate:modelValue":a[0]||(a[0]=l=>b.value=l),size:"small",disabled:h.value,onChange:B},{default:d(()=>[i(e,{value:"few"},{default:d(()=>[...a[1]||(a[1]=[r("Few (regular)",-1)])]),_:1}),i(e,{value:"many"},{default:d(()=>[...a[2]||(a[2]=[r("Many (virtual)",-1)])]),_:1})]),_:1},8,["modelValue","disabled"])]),n("div",O,[a[4]||(a[4]=n("span",{class:"toolbar-label"},"Bar color",-1)),(y(),v(w,null,C(x,l=>i(o,{key:l.label,size:"small",type:u.value===l.value?"primary":"default",onClick:I=>u.value=l.value},{default:d(()=>[r(R(l.label),1)]),_:2},1032,["type","onClick"])),64))])]),a[5]||(a[5]=n("p",{class:"demo-note"},[r(" Only messages with a truthy "),n("code",null,"bookmark"),r(" appear in the rail. Hover a bar to preview; click to jump. The rail is a standalone "),n("code",null,"<i-chat-bookmarks>"),r(" element bound with "),n("code",null,'for="bookmark-chat"'),r(" — place it anywhere in your layout. ")],-1)),n("div",A,[n("div",F,[n("i-chat-bookmarks",{for:"bookmark-chat",ref_key:"bookmarksRef",ref:k},null,512)]),n("i-chat-messages",{id:"bookmark-chat",ref_key:"chatRef",ref:c,class:"message-list"},null,512)])],4),i($,{title:"Bookmarks code example",content:E(V)},null,8,["content"])],64)}}},q=S(z,[["__scopeId","data-v-ce5eacf0"]]);export{q as default};
