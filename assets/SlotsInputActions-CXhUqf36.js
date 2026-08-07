import{o as l,n as d,a as r,c as u,d as a,f as s,w as p,e as m,u as n,l as h,E as f,F as x,g as _}from"./index-Db_WKFtx.js";import{r as A}from"./demo-data-T6QExYDe.js";import{E}from"./ExampleCodeDrawer-BIhtKBBb.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const b=`## Add actions beside the default composer

Use \`slot="actions"\` when you want to retain the built-in input and add controls to its action area.

\`\`\`js
import "@bndynet/ichat";

const chat = document.querySelector("i-chat");
const actions = document.createElement("div");
const attach = document.createElement("button");

actions.slot = "actions";
attach.type = "button";
attach.textContent = "Attach";

attach.addEventListener("click", () => {
  console.info("[SlotsInputActions] Attach requested");
});

actions.append(attach);
chat.append(actions);
\`\`\`

## Keep the normal send flow

The default composer still emits \`send\`; extra actions do not need to reimplement message submission.

\`\`\`js
chat.addEventListener("send", (event) => {
  console.log("Send message:", event.detail.content);
});
\`\`\`
`,w={slot:"actions"},B={__name:"SlotsInputActions",setup(y){const e=_(null);function c(o){const t=o.detail.content;A(e,t)}function i(){console.info("[SlotsInputActions] Attach requested")}return l(async()=>{await d()}),(o,t)=>(r(),u(x,null,[a("i-chat",{ref_key:"chatRef",ref:e,onSend:c},[a("div",w,[s(n(f),{size:"small",icon:n(h),text:"",bg:"",onClick:i},{default:p(()=>[...t[0]||(t[0]=[m("Attach",-1)])]),_:1},8,["icon"])])],544),s(E,{title:"Input actions code example",content:n(b)},null,8,["content"])],64))}};export{B as default};
