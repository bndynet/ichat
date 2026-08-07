import{o as P,n as B,s as p,a as m,c as G,d as n,j as V,x as M,y as z,z as A,A as D,f as o,w as u,e as v,u as b,l as L,B as x,C as U,F as q,g as l}from"./index-Db_WKFtx.js";import{c as N,r as j}from"./demo-data-T6QExYDe.js";import{E as I}from"./ExampleCodeDrawer-BIhtKBBb.js";import{_ as K}from"./_plugin-vue_export-helper-DlAUqK2U.js";const F=`## Replace the composer

Add a DOM node with \`slot="input"\` to replace the built-in composer. Dispatch a bubbling, composed \`send\` event when the user submits text.

\`\`\`js
import "@bndynet/ichat";

const chat = document.querySelector("i-chat");
const input = document.createElement("div");

input.slot = "input";
input.innerHTML = \`
  <textarea rows="1" placeholder="Say hi…"></textarea>
  <button type="button" data-action="attach">Attach</button>
  <select aria-label="Select Model">
    <option value="gpt-4o">GPT-4o</option>
    <option value="gpt-4o-mini">GPT-4o-mini</option>
    <option value="gpt-4">GPT-4</option>
    <option value="gpt-3.5-turbo">GPT-3.5-turbo</option>
    <option value="gpt-3.5-turbo-mini">GPT-3.5-turbo-mini</option>
  </select>
  <button type="button" data-action="send">Send</button>
\`;

const textarea = input.querySelector("textarea");
const sendButton = input.querySelector('[data-action="send"]');
let busy = chat.busy;

chat.addEventListener("busy-change", (event) => {
  busy = event.detail.busy;
  sendButton.disabled = busy;
});

input.querySelector('[data-action="attach"]').addEventListener("click", () => {
  textarea.value += \`\${textarea.value ? "\\n" : ""}[attachment placeholder]\`;
  textarea.focus();
});

sendButton.addEventListener("click", () => {
  const content = textarea.value.trim();
  if (!content || busy) return;

  input.dispatchEvent(
    new CustomEvent("send", {
      detail: { content },
      bubbles: true,
      composed: true,
    }),
  );
  textarea.value = "";
});

chat.append(input);
\`\`\`

## Receive the message

The custom event follows the same host-level \`send\` contract as the default composer.

\`\`\`js
chat.addEventListener("send", (event) => {
  console.log("User submitted:", event.detail.content);
});
\`\`\`
`,H=["onKeydown"],O={class:"slots-input-toolbar"},$={class:"slots-input-actions"},J={style:{width:"180px"}},Q={class:"slots-input-end"},W={__name:"SlotsInput",setup(X){const a=l(""),f=l(""),h=l(null),y=l(null),s=l(!1),_=l(!1),c=l(null);function S(e){s.value=e.detail.busy}function w(e){_.value=e.detail.streaming}function g(){const e=a.value.trim();if(!e||s.value)return;const t=h.value;t&&(t.dispatchEvent(new CustomEvent("send",{bubbles:!0,composed:!0,detail:{content:e}})),a.value="")}function C(){const e="*— Response stopped —*";N(e)||c.value.cancel(e)}function T(){var e;a.value+=(a.value?`
`:"")+"[attachment placeholder]",(e=y.value)==null||e.focus()}function k(e){const t=e.detail.content;j(c,t)}function E(e){console.log(e)}return P(async()=>{await B()}),(e,t)=>{const d=p("el-button"),i=p("el-option"),R=p("el-select");return m(),G(q,null,[n("i-chat",{ref_key:"chatRef",ref:c,onBusyChange:S,onStreamingChange:w,onSend:k},[V(" Replace default i-chat-input: bottom-left actions = any Vue components "),n("div",{ref_key:"inputRootRef",ref:h,slot:"input",class:"slots-input"},[M(n("textarea",{ref_key:"textareaRef",ref:y,"onUpdate:modelValue":t[0]||(t[0]=r=>a.value=r),class:"slots-input-textarea",placeholder:"Say hi…",rows:"1",onKeydown:A(D(g,["exact","prevent"]),["enter"])},null,40,H),[[z,a.value]]),n("div",O,[n("div",$,[n("div",null,[o(d,{size:"small",icon:b(L),text:"",bg:"",disabled:s.value,onClick:T},{default:u(()=>[...t[2]||(t[2]=[v("Attach",-1)])]),_:1},8,["icon","disabled"])]),n("div",J,[o(R,{modelValue:f.value,"onUpdate:modelValue":t[1]||(t[1]=r=>f.value=r),size:"small",placeholder:"Select Model",disabled:s.value,onChange:E},{default:u(()=>[o(i,{value:"gpt-4o",label:"GPT-4o"}),o(i,{value:"gpt-4o-mini",label:"GPT-4o-mini"}),o(i,{value:"gpt-4",label:"GPT-4"}),o(i,{value:"gpt-3.5-turbo",label:"GPT-3.5-turbo"}),o(i,{value:"gpt-3.5-turbo-mini",label:"GPT-3.5-turbo-mini"})]),_:1},8,["modelValue","disabled"])])]),n("div",Q,[_.value?(m(),x(d,{key:0,size:"small",type:"warning",onClick:C},{default:u(()=>[...t[3]||(t[3]=[v(" Stop ",-1)])]),_:1})):(m(),x(d,{key:1,size:"small",type:"primary",icon:b(U),disabled:s.value||!a.value.trim(),onClick:g},{default:u(()=>[...t[4]||(t[4]=[v(" Send ",-1)])]),_:1},8,["icon","disabled"]))])])],512)],544),o(I,{title:"Custom input code example",content:b(F)},null,8,["content"])],64)}}},ne=K(W,[["__scopeId","data-v-45c5126f"]]);export{ne as default};
