import{o as r,n as p,t as s,a as l,c as d,d as a,e as m,f as u,u as g,F as h,g as f}from"./index-Db_WKFtx.js";import{n as o,r as y}from"./demo-data-T6QExYDe.js";import{E as v}from"./ExampleCodeDrawer-BIhtKBBb.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const x=`## Replace message actions

Supply custom content through \`slot="message-actions"\`. Give every action a \`data-action\` value so the chat component can report it consistently.

\`\`\`js
import "@bndynet/ichat";

const chat = document.querySelector("i-chat");
const actions = document.createElement("div");

actions.slot = "message-actions";
actions.innerHTML = \`
  <button type="button" data-action="like">Like</button>
  <button type="button" data-action="copy">Copy</button>
\`;

chat.append(actions);
\`\`\`

## Handle the page's action event

The page adds these two messages, then listens for \`message-action\` on the host.

\`\`\`js
import { textPart } from "@bndynet/ichat";

for (const message of [
  { role: "self", parts: [textPart("Hi")] },
  {
    role: "assistant",
    parts: [textPart("Hover over this message to see the actions")],
  },
]) {
  chat.addMessage({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...message,
  });
}

chat.addEventListener("message-action", (event) => {
  const { action, message } = event.detail;

  if (action === "copy") {
    navigator.clipboard.writeText(
      message.parts.map((part) => part.text ?? "").join(""),
    );
  }
});
\`\`\`
`,E={__name:"Actions",setup(b){const t=f(null);r(async()=>{await p(),t.value.addMessage({id:o(),role:"self",parts:[s("Hi")],timestamp:Date.now()}),t.value.addMessage({id:o(),role:"assistant",parts:[s("Hover over this message to see the actions")],timestamp:Date.now()})});function c(e){console.log(e)}function i(e){const n=e.detail.content;y(t,n)}return(e,n)=>(l(),d(h,null,[a("i-chat",{ref_key:"chatRef",ref:t,onSend:i,onMessageAction:c},[...n[0]||(n[0]=[a("div",{slot:"message-actions",style:{position:"relative",top:"-1px"}},[a("span",{"data-action":"like"},"Like"),m(),a("span",{"data-action":"copy"},"Copy")],-1)])],544),u(v,{title:"Message actions code example",content:g(x)},null,8,["content"])],64))}};export{E as default};
