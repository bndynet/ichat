import{o as d,n as c,t as s,a as m,c as p,d as n,j as o,k as g,f as v,u as f,F as h,g as u}from"./index-Db_WKFtx.js";import{n as r,r as y}from"./demo-data-T6QExYDe.js";import{E as b}from"./ExampleCodeDrawer-BIhtKBBb.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const A=`## Provide role-specific avatars

Add elements with an avatar slot name. The content can be an image, SVG, or any custom DOM.

\`\`\`js
import "@bndynet/ichat";

const chat = document.querySelector("i-chat");

const selfAvatar = document.createElement("img");
selfAvatar.slot = "self-avatar";
selfAvatar.src = "https://static.bndy.net/images/logo.png";
selfAvatar.alt = "";
selfAvatar.style.cssText =
  "width:100%;height:100%;border-radius:50%;object-fit:cover";

const assistantAvatar = document.createElement("div");
assistantAvatar.slot = "assistant-avatar";
assistantAvatar.textContent = "AI";
assistantAvatar.style.cssText = \`
  width:100%; height:100%; border-radius:50%; display:grid; place-items:center;
  color:white; background:linear-gradient(135deg, #f093fb, #f5576c);
\`;

const peerAvatar = document.createElement("div");
peerAvatar.slot = "peer-avatar";
peerAvatar.textContent = "Peer";
peerAvatar.style.cssText = \`
  width:100%; height:100%; border-radius:50%; display:grid; place-items:center;
  color:white; background:linear-gradient(135deg, #0ea5e9, #06b6d4);
\`;

chat.append(selfAvatar, assistantAvatar, peerAvatar);
\`\`\`

## Add the page's messages

The page renders one assistant message, one peer message, and one peer message with a per-message avatar override.

\`\`\`js
import { textPart } from "@bndynet/ichat";

for (const message of [
  { role: "assistant", parts: [textPart("Hello from assistant")] },
  { role: "peer", parts: [textPart("Hello from peer")] },
  {
    role: "peer",
    avatar: "https://static.bndy.net/images/logo_white_blue_circle.svg",
    parts: [textPart("Hello from your friend")],
  },
]) {
  chat.addMessage({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...message,
  });
}
\`\`\`
`,P={__name:"Avatar",setup(x){const t=u(null);d(async()=>{await c(),t.value.addMessage({id:r(),role:"assistant",parts:[s("Hello from assistant")]}),t.value.addMessage({id:r(),role:"peer",parts:[s("Hello from peer")]}),t.value.addMessage({id:r(),avatar:"https://static.bndy.net/images/logo_white_blue_circle.svg",role:"peer",parts:[s("Hello from your friend")]}),setTimeout(()=>{},5e3)});function i(a){const e=a.detail.content;y(t,e)}function l(a){console.log("[Avatar message-action]",a.detail)}return(a,e)=>(m(),p(h,null,[n("i-chat",{ref_key:"chatRef",ref:t,onSend:i,onMessageAction:l},[o(" avatar slots "),e[0]||(e[0]=g('<div slot="self-avatar"><img src="https://static.bndy.net/images/logo.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt=""></div><div slot="assistant-avatar"><div style="background:linear-gradient(135deg, #f093fb, #f5576c);width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;"> AI </div></div><div slot="peer-avatar"><div style="background:linear-gradient(135deg, #0ea5e9, #06b6d4);width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;"> Peer </div></div>',3)),o(" empty slots "),e[1]||(e[1]=n("div",{slot:"empty",style:{"text-align":"center"}},[n("h2",null,"Welcome!"),n("p",null," Start a conversation below. You will see your avatar on the right side and the other user's avatar on the left side. ")],-1))],544),v(b,{title:"Avatar code example",content:f(A)},null,8,["content"])],64))}};export{P as default};
