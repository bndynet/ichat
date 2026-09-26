import{o as ae,s as F,c as b,d as C,e as n,f as i,w as c,i as s,v as l,x as se,y as ie,z as re,A as L,j as E,F as P,B as le,u as ue,n as de,t as ce,g,C as _}from"./index-KO6qPNXA.js";import{n as me}from"./demo-data-C5MCjIWI.js";import{E as pe}from"./ExampleCodeDrawer-CQc7Z2Um.js";import{_ as ve}from"./_plugin-vue_export-helper-DlAUqK2U.js";const fe=`## Address form

\`x-address-form\` is a request kind, not a Web Component.

\`\`\`html
<button id="open-address" type="button">Open address form</button>

<i-chat id="chat" style="display: block; height: 28rem">
  <form id="address-form" aria-label="Shipping address form" hidden>
    <label>City <input name="city" required /></label>
    <label>Country <input name="country" required /></label>
    <button id="cancel-address" type="button">Cancel</button>
    <button type="submit">Use address</button>
  </form>
</i-chat>

<script type="module">
  import "@bndynet/ichat";

  const chat = document.querySelector("#chat");
  const form = document.querySelector("#address-form");
  let activeId = null;

  chat.addEventListener("composer-interaction-change", (event) => {
    const active = event.detail.active;
    const visible = active?.kind === "x-address-form";

    form.hidden = !visible;
    if (!visible) {
      form.removeAttribute("slot");
      activeId = null;
      return;
    }

    form.slot = "composer-interaction";
    if (activeId === active.id) return;
    activeId = active.id;
    form.elements.city.value = active.payload?.defaults?.city ?? "";
    form.elements.country.value = active.payload?.defaults?.country ?? "";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    chat.completeComposerInteraction(
      activeId,
      Object.fromEntries(new FormData(form)),
    );
  });

  document.querySelector("#cancel-address").addEventListener("click", () => {
    chat.cancelComposerInteraction(activeId);
  });

  document
    .querySelector("#open-address")
    .addEventListener("click", async () => {
      const result = await chat.requestComposerInteraction({
        kind: "x-address-form",
        ariaLabel: "Shipping address form",
        payload: {
          defaults: { city: "London", country: "United Kingdom" },
        },
      });

      console.log(result);
    });
<\/script>
\`\`\`
`,ye={class:"interaction-demo-bar"},be={class:"interaction-demo-actions"},Ce={class:"interaction-demo-status","aria-live":"polite"},ge={key:0,slot:"input",class:"custom-composer"},he=["onKeydown"],ke={class:"custom-composer__toolbar"},we=["aria-label"],xe={class:"interaction-panel__heading"},_e={class:"address-grid"},qe=["value"],Ie=["value"],Se=["value"],Ae=["value"],Le={class:"interaction-panel__actions"},Ee={type:"submit",class:"primary"},Te={class:"interaction-panel__heading"},De={class:"selector-options"},$e=["value","checked"],Re={__name:"ComposerInteractionPage",setup(ze){const m=g(null),w=g(!1),v=g("Draft survives custom interactions"),q=g(null),T=g(0),D=g("No interaction yet"),f=g(null);let $=0;const N={locale:"en-US"},p=_(()=>{const t=q.value;return(t==null?void 0:t.kind)==="x-address-form"||(t==null?void 0:t.kind)==="x-delivery-selector"?t:null}),r=_(()=>{var e;const t=(e=p.value)==null?void 0:e.payload;return t&&typeof t=="object"?t:{}}),K=_(()=>{const t=r.value.options;return Array.isArray(t)?t.filter(e=>e&&typeof e=="object"&&typeof e.value=="string"&&typeof e.label=="string"):[]}),B=_(()=>{var e,o;const t=q.value;return t?t.kind==="confirmation"?((e=t.payload)==null?void 0:e.title)??"confirmation":((o=t.payload)==null?void 0:o.title)??t.kind:"none"});function k(t){return $+=1,`${t}-${Date.now()}-${$}`}function h(t,e){const o=m.value;o&&o.addMessage({id:me(),role:t,parts:[ce(e)],timestamp:Date.now()})}async function O(t=30){for(let e=0;e<t;e++){if(m.value)return m.value;await de()}return m.value}ae(async()=>{await O(),h("assistant","Composer Interaction demo. Type a draft, then open a form, selector, or mixed queue. The composer stays mounted and restores the draft after the queue finishes.")});function j(t){const e=t.detail.content;h("self",e),setTimeout(()=>h("assistant",`Echo: ${e}`),250)}function R(){const t=v.value.trim(),e=m.value;!t||!e||(e.dispatchEvent(new CustomEvent("send",{detail:{content:t},bubbles:!0,composed:!0})),v.value="")}function Q(t){q.value=t.detail.active,T.value=t.detail.queueLength}function W(t){const e=t.detail;D.value=e.status==="completed"?`${e.request.kind}: completed`:`${e.request.kind}: ${e.reason}`}function I(t,e,o){t.dispatchEvent(new CustomEvent(e,{detail:o,bubbles:!0,composed:!0}))}function H(t){const e=p.value;if(!e||e.kind!=="x-address-form")return;const o=new FormData(t.currentTarget);I(t.currentTarget,"composer-interaction-complete",{id:e.id,value:{recipient:String(o.get("recipient")??""),street:String(o.get("street")??""),city:String(o.get("city")??""),country:String(o.get("country")??"")}})}function J(t){const e=p.value;if(!e||e.kind!=="x-delivery-selector")return;const o=new FormData(t.currentTarget);I(t.currentTarget,"composer-interaction-complete",{id:e.id,value:{delivery:String(o.get("delivery")??"")}})}function z(t){const e=p.value;e&&I(t.currentTarget,"composer-interaction-cancel",{id:e.id})}async function y(t,e,o=null){const a=m.value;if(a)try{const u=await a.requestComposerInteraction(e),x=u.status==="completed"?`completed with \`${JSON.stringify(u.value)}\``:`cancelled (${u.reason})`;h("assistant",`**${t}** ${x}.`)}catch(u){h("assistant",`**${t}** could not be queued: ${u instanceof Error?u.message:String(u)}`)}finally{o&&f.value===o&&(f.value=null)}}async function U(t,e){const o=m.value;if(!o)return;const a=await o.requestConfirmation(e);h("assistant",`**${t}** was **${a.confirmed?"confirmed":"cancelled"}**.`)}function S(t={}){return{id:k("address"),kind:"x-address-form",ariaLabel:"Shipping address form",payload:{title:"Shipping address",description:"This host-rendered form is temporary and is not added to message history.",submitLabel:"Use address",defaults:{recipient:"Ada Lovelace",street:"12 Analytical Engine Way",city:"London",country:"United Kingdom"}},...t}}function A(t={}){return{id:k("selector"),kind:"x-delivery-selector",ariaLabel:"Delivery speed selector",payload:{title:"Delivery speed",description:"Choose one option to continue.",defaultValue:"standard",options:[{value:"standard",label:"Standard",description:"3–5 business days"},{value:"express",label:"Express",description:"Next business day"},{value:"pickup",label:"Pickup",description:"Collect from the nearest location"}]},...t}}function G(){y("Address form",S())}function X(){y("Delivery selector",A())}function Y(){y("Queued address",S()),y("Queued selector",A())}function Z(){U("Review order",{id:k("confirm"),title:"Review the order first?",description:"Confirmation A is followed by a custom selector and confirmation C.",confirmLabel:"Review"}),y("Mixed delivery selector",A()),U("Place order",{id:k("confirm"),title:"Place the order?",description:"This confirmation waits behind the custom selector.",confirmLabel:"Place order"})}function ee(){if(f.value)return;const t=new AbortController;f.value=t,y("Abortable address",S({signal:t.signal}),t)}function te(){var t;(t=f.value)==null||t.abort()}function ne(){y("Unknown renderer",{id:k("unknown"),kind:"x-unknown-demo",ariaLabel:"Unknown interaction fallback",payload:{privateMarker:"This payload must not be rendered."}})}function oe(){var t;(t=m.value)==null||t.clearComposerInteractions("cleared")}return(t,e)=>{var u,x,V,M;const o=F("el-switch"),a=F("el-button");return b(),C(P,null,[n("div",ye,[n("div",be,[i(o,{modelValue:w.value,"onUpdate:modelValue":e[0]||(e[0]=d=>w.value=d),size:"small","active-text":"Custom input","inactive-text":"Default input"},null,8,["modelValue"]),i(a,{size:"small",type:"primary",onClick:G},{default:c(()=>[...e[3]||(e[3]=[s(" Address form ",-1)])]),_:1}),i(a,{size:"small",onClick:X},{default:c(()=>[...e[4]||(e[4]=[s(" Selector ",-1)])]),_:1}),i(a,{size:"small",onClick:Y},{default:c(()=>[...e[5]||(e[5]=[s(" Queue 2 custom ",-1)])]),_:1}),i(a,{size:"small",onClick:Z},{default:c(()=>[...e[6]||(e[6]=[s(" Mixed FIFO ",-1)])]),_:1}),i(a,{size:"small",type:"warning",disabled:!!f.value,onClick:ee},{default:c(()=>[...e[7]||(e[7]=[s(" Abortable ",-1)])]),_:1},8,["disabled"]),i(a,{size:"small",disabled:!f.value,onClick:te},{default:c(()=>[...e[8]||(e[8]=[s(" Abort request ",-1)])]),_:1},8,["disabled"]),i(a,{size:"small",onClick:ne},{default:c(()=>[...e[9]||(e[9]=[s(" Unknown kind ",-1)])]),_:1}),i(a,{size:"small",text:"",onClick:oe},{default:c(()=>[...e[10]||(e[10]=[s(" Clear all ",-1)])]),_:1})]),n("div",Ce,[n("span",null,"Active: "+l(B.value),1),n("span",null,"Queue: "+l(T.value),1),n("span",null,"Input: "+l(w.value?"custom slot":"default"),1),n("span",null,l(D.value),1)]),e[11]||(e[11]=n("p",{class:"interaction-demo-hint"}," Type a draft before opening an interaction. It should reappear unchanged after the queue finishes. ",-1))]),n("i-chat",{ref_key:"chatRef",ref:m,config:N,onSend:j,onComposerInteractionChange:Q,onComposerInteractionResult:W},[w.value?(b(),C("div",ge,[e[14]||(e[14]=n("div",{class:"custom-composer__label"},"Custom composer",-1)),se(n("textarea",{"onUpdate:modelValue":e[1]||(e[1]=d=>v.value=d),class:"custom-composer__textarea",rows:"1",placeholder:"This draft stays mounted during interactions.",onKeydown:re(L(R,["exact","prevent"]),["enter"])},null,40,he),[[ie,v.value]]),n("div",ke,[i(a,{size:"small",text:"",bg:"",onClick:e[2]||(e[2]=d=>v.value+=(v.value?" ":"")+"[file]")},{default:c(()=>[...e[12]||(e[12]=[s(" Attach ",-1)])]),_:1}),i(a,{size:"small",type:"primary",disabled:!v.value.trim(),onClick:R},{default:c(()=>[...e[13]||(e[13]=[s(" Send ",-1)])]),_:1},8,["disabled"])])])):E("v-if",!0),p.value?(b(),C("section",{key:p.value.id,slot:"composer-interaction",class:"interaction-panel","aria-label":p.value.ariaLabel},[p.value.kind==="x-address-form"?(b(),C("form",{key:0,class:"interaction-form",onSubmit:L(H,["prevent"])},[n("div",xe,[n("strong",null,l(r.value.title),1),n("span",null,l(r.value.description),1)]),n("div",_e,[n("label",null,[e[15]||(e[15]=s(" Recipient ",-1)),n("input",{name:"recipient",required:"",autocomplete:"name",value:(u=r.value.defaults)==null?void 0:u.recipient},null,8,qe)]),n("label",null,[e[16]||(e[16]=s(" Street ",-1)),n("input",{name:"street",required:"",autocomplete:"street-address",value:(x=r.value.defaults)==null?void 0:x.street},null,8,Ie)]),n("label",null,[e[17]||(e[17]=s(" City ",-1)),n("input",{name:"city",required:"",autocomplete:"address-level2",value:(V=r.value.defaults)==null?void 0:V.city},null,8,Se)]),n("label",null,[e[18]||(e[18]=s(" Country ",-1)),n("input",{name:"country",required:"",autocomplete:"country-name",value:(M=r.value.defaults)==null?void 0:M.country},null,8,Ae)])]),n("div",Le,[n("button",{type:"button",class:"secondary",onClick:z}," Cancel "),n("button",Ee,l(r.value.submitLabel??"Submit"),1)])],32)):p.value.kind==="x-delivery-selector"?(b(),C("form",{key:1,class:"interaction-form",onSubmit:L(J,["prevent"])},[n("div",Te,[n("strong",null,l(r.value.title),1),n("span",null,l(r.value.description),1)]),n("div",De,[(b(!0),C(P,null,le(K.value,d=>(b(),C("label",{key:d.value,class:"selector-option"},[n("input",{type:"radio",name:"delivery",value:d.value,checked:d.value===r.value.defaultValue,required:""},null,8,$e),n("span",null,[n("strong",null,l(d.label),1),n("small",null,l(d.description),1)])]))),128))]),n("div",{class:"interaction-panel__actions"},[n("button",{type:"button",class:"secondary",onClick:z}," Cancel "),e[19]||(e[19]=n("button",{type:"submit",class:"primary"},"Continue",-1))])],32)):E("v-if",!0)],8,we)):E("v-if",!0)],544),i(pe,{title:"Composer Interaction code example",content:ue(fe)},null,8,["content"])],64)}}},Pe=ve(Re,[["__scopeId","data-v-8f07224b"]]);export{Pe as default};
