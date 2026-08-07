import{o as m,t as h,i as f,h as g,a as v,c as y,d as I,f as T,u as w,F as P,n as k,g as x}from"./index-Db_WKFtx.js";import{n as U}from"./demo-data-T6QExYDe.js";import{E as b}from"./ExampleCodeDrawer-BIhtKBBb.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const _=`## Create the plan

Place an \`<i-chat>\` element on the page, then create a message containing a text part and a \`todoPart\`. Each item needs a stable \`id\`, a \`title\`, and a \`status\`.

\`\`\`js
import "@bndynet/ichat";
import { textPart, todoPart } from "@bndynet/ichat";

const chat = document.querySelector("i-chat");
const messageId = crypto.randomUUID();

chat.addMessage({
  id: messageId,
  role: "assistant",
  timestamp: Date.now(),
  parts: [
    textPart("I will work through this plan and keep it up to date."),
    todoPart(
      [
        { id: "model", title: "Define the todo data model", status: "done" },
        {
          id: "panel",
          title: "Build the collapsible chat panel",
          status: "active",
        },
        {
          id: "events",
          title: "Connect status update events",
          status: "pending",
        },
        { id: "docs", title: "Document the public API", status: "pending" },
        {
          id: "verify",
          title: "Verify the production build",
          status: "pending",
        },
      ],
      { id: "todo-plan", status: "streaming" },
    ),
  ],
});
\`\`\`

## Apply ordered updates

Use \`tryUpdateTodoItem()\` when a server event reports progress. Pass a monotonically increasing \`revision\` for every update; stale or duplicate events are rejected safely.

\`\`\`js
function updateTodo(itemId, patch, revision) {
  const result = chat.tryUpdateTodoItem(
    messageId,
    "todo-plan",
    itemId,
    patch,
    revision,
  );

  if (!result.ok) {
    console.warn("To-do update ignored:", result.reason);
  }
}

updateTodo("panel", { status: "done" }, 1);
updateTodo("events", { status: "active" }, 2);
\`\`\`

## Respond to user actions

\`i-chat\` emits \`part-action\` when a user changes a to-do item. The host decides whether to persist and apply that request.

\`\`\`js
chat.addEventListener("part-action", (event) => {
  if (event.detail?.kind !== "todo") return;

  const { messageId, part, itemId, status } = event.detail.payload;
  const result = chat.tryUpdateTodoItem(messageId, part.id, itemId, { status });

  if (!result.ok) {
    console.warn("User-requested update ignored:", result.reason);
  }
});
\`\`\`
`,j={__name:"TodoPage",setup(D){const n=x(null),l=[],c=(t,e)=>l.push(setTimeout(e,t));function s(t,e,d,i,r,o){const a=t.tryUpdateTodoItem(e,d,i,r,o);a.ok||console.warn("[TodoPage] Todo update ignored:",a.reason)}async function u(t=30){for(let e=0;e<t;e++){if(n.value)return n.value;await k()}return n.value}m(async()=>{const t=await u();if(!t)return;const e=U();t.addMessage({id:e,role:"assistant",timestamp:Date.now(),parts:[h("I will work through this plan and keep it up to date."),f([{id:"model",title:"Define the todo data model",status:"done"},{id:"panel",title:"Build the collapsible chat panel",status:"active"},{id:"events",title:"Connect status update events",status:"pending"},{id:"docs",title:"Document the public API",status:"pending"},{id:"verify",title:"Verify the production build",status:"pending"}],{id:"todo-plan",status:"streaming"})]}),c(1200,()=>s(t,e,"todo-plan","panel",{status:"done"},1)),c(1600,()=>s(t,e,"todo-plan","events",{status:"active"},2))}),g(()=>l.forEach(clearTimeout));function p(t){var a;if(((a=t.detail)==null?void 0:a.kind)!=="todo")return;const e=t.detail.messageId,{part:d,itemId:i,status:r}=t.detail.payload,o=n.value;o&&s(o,e,d.id,i,{status:r})}return(t,e)=>(v(),y(P,null,[I("i-chat",{ref_key:"chatRef",ref:n,onPartAction:p},null,544),T(b,{title:"To-dos code example",content:w(_)},null,8,["content"])],64))}};export{j as default};
