import{Z as u,o as g,n as x,t as d,a as w,c as y,d as c,f,u as _,F as v,g as b}from"./index-Db_WKFtx.js";import{n as p}from"./demo-data-T6QExYDe.js";import{E as k}from"./ExampleCodeDrawer-BIhtKBBb.js";import{_ as C}from"./_plugin-vue_export-helper-DlAUqK2U.js";function l(e){u.register(e)}const E=`## Register a custom element renderer

Register an \`x-*\` part type before adding a matching part. Registration may happen at startup or lazily after chat components have mounted. The element receives the part data as a property.

\`\`\`js
import "@bndynet/ichat";
import { registerPartRenderer, textPart } from "@bndynet/ichat";

class WeatherCard extends HTMLElement {
  set data(value) {
    const {
      city = "Unknown",
      temp = "--",
      unit = "",
      condition = "",
    } = value ?? {};
    this.innerHTML = \`<strong>\${temp}\${unit}</strong> \${city} — \${condition}\`;
  }
}

customElements.define("x-weather-card", WeatherCard);

registerPartRenderer({
  name: "weather-card",
  test: (type) => type === "x-weather",
  element: "x-weather-card",
});
\`\`\`

## Add and update the part

\`updatePart()\` patches the existing custom-element instance, so the host can stream fresh data without rebuilding the message.

\`\`\`js
const chat = document.querySelector("i-chat-messages");
const messageId = crypto.randomUUID();

chat.addMessage({
  id: messageId,
  role: "assistant",
  timestamp: Date.now(),
  parts: [
    textPart(
      "**Element mode** — the element instance is preserved across \`updatePart\`.",
    ),
    {
      id: "x-weather-live",
      type: "x-weather",
      data: { city: "Shanghai", temp: 22, unit: "°C", condition: "Cloudy" },
    },
  ],
});

chat.updatePart(messageId, "x-weather-live", {
  data: { city: "Shanghai", temp: 27, unit: "°C", condition: "Sunny" },
});
\`\`\`

## Add the page's other custom parts

The page also renders a string-mode weather card and shows the JSON fallback for an unregistered \`x-*\` part.

\`\`\`js
chat.addMessage({
  id: crypto.randomUUID(),
  role: "assistant",
  timestamp: Date.now(),
  parts: [
    {
      id: "x-weather-html-1",
      type: "x-weather-html",
      data: { city: "Tokyo", temp: 18, unit: "°C", condition: "Light rain" },
    },
    {
      id: "x-unknown-1",
      type: "x-product-card",
      data: { sku: "A-1024", name: "Wireless Mouse", price: 29.9 },
    },
  ],
});
\`\`\`
`;function n(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}const P=`
  .weather-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    border: 1px solid var(--chat-border, #e2e8f0);
    border-radius: 12px;
    background: var(--chat-surface-alt, #f8f9fa);
    color: var(--chat-text, #1a202c);
    max-width: 320px;
  }
  .weather-card__temp { font-size: 1.75rem; font-weight: 700; line-height: 1; }
  .weather-card__body { display: flex; flex-direction: column; gap: 2px; }
  .weather-card__city { font-weight: 600; }
  .weather-card__condition { color: var(--chat-text-secondary, #4a5568); font-size: 0.875rem; }
`;function M(e){const t=e.temp!=null?n(String(e.temp)):"--",s=n(e.unit??""),r=n(e.city??"Unknown"),i=n(e.condition??"");return`
    <div class="weather-card">
      <div class="weather-card__temp">${t}${s}</div>
      <div class="weather-card__body">
        <span class="weather-card__city">${r}</span>
        <span class="weather-card__condition">${i}</span>
      </div>
    </div>`}class S extends HTMLElement{constructor(){super(...arguments),this._data={}}set data(t){this._data=t??{},this._render()}get data(){return this._data}connectedCallback(){this._render()}_render(){this.innerHTML=`<style>${P}</style>${M(this._data)}`}}customElements.get("x-weather-card")||customElements.define("x-weather-card",S);const T={name:"weather-element",test:e=>e==="x-weather",element:"x-weather-card"},R={name:"weather-string",test:e=>e==="x-weather-html",render:e=>{const t=e.data,s=t.temp!=null?n(String(t.temp)):"--",r=n(t.unit??""),i=n(t.city??"Unknown"),a=n(t.condition??"");return`
      <div style="${["display:flex","align-items:center","gap:14px","padding:14px 18px","border:1px solid var(--chat-border,#e2e8f0)","border-radius:12px","background:var(--chat-surface-alt,#f8f9fa)","color:var(--chat-text,#1a202c)","max-width:320px"].join(";")}">
        <div style="font-size:1.75rem;font-weight:700;line-height:1">${s}${r}</div>
        <div style="display:flex;flex-direction:column;gap:2px">
          <span style="font-weight:600">${i}</span>
          <span style="color:var(--chat-text-secondary,#4a5568);font-size:0.875rem">${a}</span>
        </div>
      </div>`}},$={class:"custom-part-page"},m="custom-part-element",h="x-weather-live",D={__name:"CustomPartPage",setup(e){l(T),l(R);const t=b(null);g(async()=>{await x();const a=t.value;a.addMessage({id:m,role:"assistant",timestamp:Date.now(),parts:[d("**Element mode** — `registerPartRenderer({ test, element })`. The library renders `<x-weather-card .data .part>`; the element instance is preserved across `updatePart`, so streaming updates do not rebuild the DOM. Click the button below to patch `data` live."),{id:h,type:"x-weather",data:{city:"Shanghai",temp:22,unit:"°C",condition:"Cloudy"}}]}),a.addMessage({id:p(),role:"assistant",timestamp:Date.now(),parts:[d("**String mode** — `registerPartRenderer({ test, render })`. The renderer returns an HTML string, sanitised with DOMPurify and patched in place via morphdom (same channel as `text` parts)."),{id:"x-weather-html-1",type:"x-weather-html",data:{city:"Tokyo",temp:18,unit:"°C",condition:"Light rain"}}]}),a.addMessage({id:p(),role:"assistant",timestamp:Date.now(),parts:[d("**Unregistered fallback** — a custom `x-*` part with no matching renderer is shown as a readable JSON dump."),{id:"x-unknown-1",type:"x-product-card",data:{sku:"A-1024",name:"Wireless Mouse",price:29.9}}]})});const s=[{temp:22,condition:"Cloudy"},{temp:27,condition:"Sunny"},{temp:16,condition:"Thunderstorm"},{temp:9,condition:"Snow"}];let r=0;function i(){const a=t.value;if(!a)return;r=(r+1)%s.length;const o=s[r];a.updatePart(m,h,{data:{city:"Shanghai",temp:o.temp,unit:"°C",condition:o.condition}})}return(a,o)=>(w(),y(v,null,[c("div",$,[c("button",{type:"button",class:"update-btn",onClick:i}," Update weather (element mode, live patch) "),c("i-chat-messages",{ref_key:"chatRef",ref:t},null,512)]),f(k,{title:"Custom part code example",content:_(E)},null,8,["content"])],64))}},A=C(D,[["__scopeId","data-v-96f6e70c"]]);export{A as default};
