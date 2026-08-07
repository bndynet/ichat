import{o as R,s as w,a as g,c as C,d as n,f as r,w as d,e as u,v as p,x as E,y as $,z,A as I,j as N,u as V,F as j,n as M,t as Q,g as l}from"./index-Db_WKFtx.js";import{n as U}from"./demo-data-T6QExYDe.js";import{E as B}from"./ExampleCodeDrawer-BIhtKBBb.js";import{_ as F}from"./_plugin-vue_export-helper-DlAUqK2U.js";const K=`## Request a confirmation

Call \`requestConfirmation()\` on an \`i-chat\` element when an action needs a user decision. The returned promise resolves after the user confirms or cancels.

\`\`\`js
import "@bndynet/ichat";

const chat = document.querySelector("i-chat");

const result = await chat.requestConfirmation({
  title: "Run data refresh?",
  description: "The app generated this copy from a trusted action schema.",
  details: {
    action: "refresh_dashboard",
    rows: 1284,
    source: "warehouse.daily_metrics",
  },
  confirmLabel: "Run",
  cancelLabel: "Skip",
});

if (result.confirmed) {
  console.log("Refresh confirmed:", result.request.details);
}
\`\`\`

## Request the page's destructive action and queue

The demo also shows a danger confirmation followed by three queued requests.

\`\`\`js
void chat.requestConfirmation({
  title: "Delete generated report?",
  description:
    "This is a destructive action. The primary copy is owned by the app, not the model.",
  details: {
    action: "delete_file",
    path: "/tmp/reports/q2-draft.pdf",
    irreversible: true,
  },
  confirmLabel: "Delete",
  variant: "danger",
});

for (const request of [
  {
    title: "Archive old thread?",
    description: "This is the first queued confirmation.",
    details: { action: "archive_thread", threadId: "thread_001" },
    confirmLabel: "Archive",
  },
  {
    title: "Send summary email?",
    description: "This waits behind the archive confirmation.",
    details: { action: "send_email", to: "team@example.com" },
    confirmLabel: "Send",
  },
  {
    title: "Sync files to workspace?",
    description: "This is the third queued confirmation.",
    details: { action: "sync_files", count: 6 },
    confirmLabel: "Sync",
  },
]) {
  void chat.requestConfirmation(request);
}
\`\`\`

## Observe confirmation state

The component emits lifecycle events so surrounding UI can reflect the active request and queue length.

\`\`\`js
chat.addEventListener("confirmation-change", (event) => {
  const { active, queueLength } = event.detail;
  console.log("Active confirmation:", active?.title ?? "none");
  console.log("Queued confirmations:", queueLength);
});

chat.addEventListener("confirmation-decision", (event) => {
  console.log(\`\${event.detail.request.title}: \${event.detail.action}\`);
});
\`\`\`
`,P={class:"confirmation-demo-bar"},O={class:"confirmation-demo-actions"},H={class:"confirmation-demo-status"},J={key:0,slot:"input",class:"confirmation-composer"},G=["onKeydown"],W={class:"confirmation-composer__toolbar"},X={__name:"ConfirmationPage",setup(Y){const o=l(null),a=l(""),m=l(!1),v=l(""),y=l(0),_=l("No confirmation yet"),q={locale:"zh-CN"};function f(t,e){const s=o.value;s&&s.addMessage({id:U(),role:t,parts:[Q(e)],timestamp:Date.now()})}async function x(t=30){for(let e=0;e<t;e++){if(o.value)return o.value;await M()}return o.value}R(async()=>{await x(),f("assistant",'Confirmation demo. Use the switch above the chat to compare the default composer with a custom `slot="input"` composer. In both modes, the confirmation panel replaces the input area while active.')});function T(t){const e=t.detail.content;f("self",e),setTimeout(()=>{f("assistant",`Echo: ${e}`)},350)}function b(){const t=a.value.trim(),e=o.value;!t||!e||(e.dispatchEvent(new CustomEvent("send",{detail:{content:t},bubbles:!0,composed:!0})),a.value="")}function D(t){var e;v.value=((e=t.detail.active)==null?void 0:e.title)??"",y.value=t.detail.queueLength}function L(t){const e=t.detail;_.value=`${e.request.title}: ${e.action}`}async function c(t,e){const s=o.value;if(!s)return;const i=await s.requestConfirmation(e);f("assistant",`**${t}** was **${i.confirmed?"confirmed":"cancelled"}**.

\`\`\`json
${JSON.stringify(i.request.details??{},null,2)}
\`\`\``)}function S(){c("Data refresh",{title:"Run data refresh?",description:"The app generated this copy from a trusted action schema.",details:{action:"refresh_dashboard",rows:1284,source:"warehouse.daily_metrics"},confirmLabel:"Run",cancelLabel:"Skip"})}function k(){c("Delete report",{title:"Delete generated report?",description:"This is a destructive action. The primary copy is owned by the app, not the model.",details:{action:"delete_file",path:"/tmp/reports/q2-draft.pdf",irreversible:!0},confirmLabel:"Delete",variant:"danger"})}function A(){c("Archive thread",{title:"Archive old thread?",description:"This is the first queued confirmation.",details:{action:"archive_thread",threadId:"thread_001"},confirmLabel:"Archive"}),c("Send summary",{title:"Send summary email?",description:"This waits behind the archive confirmation.",details:{action:"send_email",to:"team@example.com"},confirmLabel:"Send"}),c("Sync files",{title:"Sync files to workspace?",description:"This is the third queued confirmation.",details:{action:"sync_files",count:6},confirmLabel:"Sync"})}return(t,e)=>{const s=w("el-switch"),i=w("el-button");return g(),C(j,null,[n("div",P,[n("div",O,[r(s,{modelValue:m.value,"onUpdate:modelValue":e[0]||(e[0]=h=>m.value=h),size:"small","active-text":"Custom input","inactive-text":"Default input"},null,8,["modelValue"]),r(i,{size:"small",type:"primary",onClick:S},{default:d(()=>[...e[3]||(e[3]=[u(" Normal ",-1)])]),_:1}),r(i,{size:"small",type:"danger",onClick:k},{default:d(()=>[...e[4]||(e[4]=[u(" Danger ",-1)])]),_:1}),r(i,{size:"small",onClick:A},{default:d(()=>[...e[5]||(e[5]=[u(" Queue 3 ",-1)])]),_:1})]),n("div",H,[n("span",null,"Active: "+p(v.value||"none"),1),n("span",null,"Queue: "+p(y.value),1),n("span",null,"Input: "+p(m.value?"custom slot":"default composer"),1),n("span",null,p(_.value),1)])]),n("i-chat",{ref_key:"chatRef",ref:o,config:q,onSend:T,onConfirmationChange:D,onConfirmationDecision:L},[m.value?(g(),C("div",J,[e[8]||(e[8]=n("div",{class:"confirmation-composer__label"},"Custom composer",-1)),E(n("textarea",{"onUpdate:modelValue":e[1]||(e[1]=h=>a.value=h),class:"confirmation-composer__textarea",rows:"1",placeholder:"This custom input is replaced while confirmation is active.",onKeydown:z(I(b,["exact","prevent"]),["enter"])},null,40,G),[[$,a.value]]),n("div",W,[r(i,{size:"small",text:"",bg:"",onClick:e[2]||(e[2]=h=>a.value+=(a.value?" ":"")+"[file]")},{default:d(()=>[...e[6]||(e[6]=[u(" Attach ",-1)])]),_:1}),r(i,{size:"small",type:"primary",disabled:!a.value.trim(),onClick:b},{default:d(()=>[...e[7]||(e[7]=[u(" Send ",-1)])]),_:1},8,["disabled"])])])):N("v-if",!0)],544),r(B,{title:"Confirmation code example",content:V(K)},null,8,["content"])],64)}}},ie=F(X,[["__scopeId","data-v-11f5e41a"]]);export{ie as default};
