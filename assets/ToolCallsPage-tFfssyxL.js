import{o as f,h as v,a as y,c as b,d as I,f as x,u as T,F as _,n as C,g as u}from"./index-Db_WKFtx.js";import{n as m}from"./demo-data-T6QExYDe.js";import{E as w}from"./ExampleCodeDrawer-BIhtKBBb.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const M=`## Stream the page's search tool call

The first page message starts with a completed reasoning part, then adds the same \`search_web\` tool call after streaming begins.

\`\`\`js
import "@bndynet/ichat";
import { textPart } from "@bndynet/ichat";

const chat = document.querySelector("i-chat");
const messageId = crypto.randomUUID();

chat.addMessage({
  id: messageId,
  role: "assistant",
  streaming: true,
  timestamp: Date.now(),
  parts: [
    {
      id: "r1",
      type: "reasoning",
      text: "I should search the docs, then run the tests before answering.",
      status: "complete",
    },
  ],
});

chat.appendPart(messageId, {
  id: "tc-a",
  type: "tool-call",
  toolCallId: "call_a",
  toolName: "search_web",
  args: { q: "lit 3 web components" },
  state: "input-available",
});
\`\`\`

## Update the result

Use the part id to advance the tool-call state. The host decides when the message is no longer streaming.

\`\`\`js
function updateToolCall(partId, patch) {
  const result = chat.tryUpdateToolCall(messageId, partId, patch);
  if (!result.ok) console.warn("Tool update ignored:", result.reason);
}

updateToolCall("tc-a", { state: "executing" });

setTimeout(() => {
  updateToolCall("tc-a", {
    state: "output-available",
    durationMs: 1100,
    resultParts: [
      {
        id: "tc-a-r1",
        type: "text",
        text: "Found **3 results**: \`lit.dev\`, \`github.com/lit/lit\`, MDN.",
      },
    ],
  });
  chat.appendPart(messageId, {
    id: "ans",
    type: "text",
    text: "Based on the docs, use \`@customElement\`. Note: one unit test is currently failing — see the tool result above.",
  });
  chat.updateMessage(messageId, { streaming: false });
}, 1100);
\`\`\`

## Add the page's failed test run

The same streaming message later adds a \`run_tests\` call and reports the error state.

\`\`\`js
chat.appendPart(messageId, {
  id: "tc-b",
  type: "tool-call",
  toolCallId: "call_b",
  toolName: "run_tests",
  args: { suite: "unit" },
  state: "input-streaming",
});

updateToolCall("tc-b", { state: "executing" });
updateToolCall("tc-b", {
  state: "output-error",
  durationMs: 1200,
  error: "1 of 24 tests failed: streaming-controller.test.ts",
});
\`\`\`

## Handle approval

The second page message requests approval to remove the build cache. Listen for \`part-action\` and apply the decision in your application.

\`\`\`js
const approvalMessageId = crypto.randomUUID();

chat.addMessage({
  id: approvalMessageId,
  role: "assistant",
  timestamp: Date.now(),
  parts: [
    textPart("This action needs your confirmation:"),
    {
      id: "tc-c",
      type: "tool-call",
      toolCallId: "call_c",
      toolName: "delete_file",
      title: "delete_file — remove build cache",
      args: { path: "/tmp/.cache", recursive: true },
      state: "input-available",
      approval: "required",
    },
  ],
});

chat.addEventListener("part-action", (event) => {
  if (event.detail?.kind !== "tool-call") return;

  const { action, part } = event.detail.payload;
  const messageId = event.detail.messageId;
  if (action === "approve") {
    chat.tryUpdateToolCall(messageId, part.id, {
      approval: "approved",
      state: "executing",
    });
  } else if (action === "reject") {
    chat.tryUpdateToolCall(messageId, part.id, {
      approval: "rejected",
      state: "output-error",
      error: "Cancelled by user.",
    });
  }
});
\`\`\`
`,E={__name:"ToolCallsPage",setup(P){const l=u(null),c=u(null);async function g(t=30){for(let e=0;e<t;e++){if(l.value)return l.value;await C()}return l.value}const d=[],n=(t,e)=>d.push(setTimeout(e,t));function s(t,e,a,i){const o=t.tryUpdateToolCall(e,a,i);o.ok||console.warn("[ToolCallsPage] Tool update ignored:",o.reason)}f(async()=>{const t=await g();if(!t)return;const e=m();t.addMessage({id:e,role:"assistant",streaming:!0,timestamp:Date.now(),parts:[{id:"r1",type:"reasoning",text:"I should search the docs, then run the tests before answering.",status:"complete"}]}),n(500,()=>{t.appendPart(e,{id:"tc-a",type:"tool-call",toolCallId:"call_a",toolName:"search_web",args:{q:"lit 3 web components"},state:"input-available"})}),n(1100,()=>s(t,e,"tc-a",{state:"executing"})),n(2200,()=>s(t,e,"tc-a",{state:"output-available",durationMs:1100,resultParts:[{id:"tc-a-r1",type:"text",text:"Found **3 results**: `lit.dev`, `github.com/lit/lit`, MDN."}]})),n(2600,()=>{t.appendPart(e,{id:"tc-b",type:"tool-call",toolCallId:"call_b",toolName:"run_tests",args:{suite:"unit"},state:"input-streaming"})}),n(3200,()=>s(t,e,"tc-b",{state:"executing"})),n(4400,()=>s(t,e,"tc-b",{state:"output-error",durationMs:1200,error:"1 of 24 tests failed: streaming-controller.test.ts"})),n(4900,()=>{t.appendPart(e,{id:"ans",type:"text",text:"Based on the docs, use `@customElement`. Note: one unit test is currently failing — see the tool result above."}),t.updateMessage(e,{streaming:!1})}),n(5400,()=>{const a=m();c.value=a,t.addMessage({id:a,role:"assistant",timestamp:Date.now(),parts:[{id:"t",type:"text",text:"This action needs your confirmation:"},{id:"tc-c",type:"tool-call",toolCallId:"call_c",toolName:"delete_file",title:"delete_file — remove build cache",args:{path:"/tmp/.cache",recursive:!0},state:"input-available",approval:"required"}]})})}),v(()=>d.forEach(clearTimeout));function h(t){var p;if(((p=t.detail)==null?void 0:p.kind)!=="tool-call")return;const{action:e,part:a}=t.detail.payload,i=t.detail.messageId;console.log("[ToolCallsPage part-action]",t.detail);const o=l.value,r=i||c.value;!o||!r||!a||(e==="approve"?(s(o,r,a.id,{approval:"approved",state:"executing"}),setTimeout(()=>s(o,r,a.id,{state:"output-available",durationMs:800,result:{removed:!0,freedBytes:1048576}}),900)):s(o,r,a.id,{approval:"rejected",state:"output-error",error:"Cancelled by user."}))}return(t,e)=>(y(),b(_,null,[I("i-chat",{ref_key:"chatRef",ref:l,onPartAction:h},null,544),x(w,{title:"Tool calls code example",content:T(M)},null,8,["content"])],64))}};export{E as default};
