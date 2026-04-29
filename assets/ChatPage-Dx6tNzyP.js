import{n as t,C as v,r as C}from"./ChatToolbar-B7pBGMJS.js";import{o as D,n as T,a as i,c as l,b as _,d as c,F as M,r as m}from"./index-Durlmml-.js";const I={slot:"empty",style:{"text-align":"center"}},U={key:0},x={key:1},F="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAA9klEQVR42u3ZQQ6DIBCF4blXb9fj9D69Sre4bZqiKAzO8P6XsBR8nxI1mhFCyI0p71eRKts6ZIsvB9FTPj3CiPJpEUaWT4fgUT4Ngmf5FAjSADPKh0YAAAAAdAFmlgeBLQBADIDH81O+x0yA37UBiAAwC+HfulLbIEz5O+6CUFe/BuCFUFsr3NPAAyFs+T2AUQh784cH6EU4mjvMW+DRiZ6FaJkv1GtwywnXUK4euwRAzwj3MSRdHgAA5iGE/jMEgDqAN4JliDyAF4JlCgDqAKMRLGMAUAcYhWCZA4A6QC+CrRAA1AGuIthKAUAd4CyCEUIIIe7ZAFXVGuWAntoXAAAAAElFTkSuQmCC",R='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="14" fill="#f59e0b"/><text x="16" y="20" text-anchor="middle" font-size="12" fill="#fff" font-family="system-ui,sans-serif">S</text></svg>',B={__name:"ChatPage",setup(E){const d=m(!0),s=m(null),g={locale:"zh-CN"};function n(e){const a=new Date;return a.setDate(a.getDate()-e),a.setHours(12,0,0,0),a.getTime()}D(async()=>{await T();const e=s.value;setTimeout(()=>{e.addMessage({id:t(),role:"peer",content:"**Date separators** — this message is **8+ calendar days** old, so the divider shows **Older**. English is the default; set **config.locale** to **zh-CN** for Chinese labels.",timestamp:n(12)}),e.addMessage({id:t(),role:"peer",content:"**7 days ago** — dividers update when the day bucket changes (see **7 days ago** label).",timestamp:n(7)}),e.addMessage({id:t(),role:"peer",content:"**3 days ago** — between **2** and **7** days the label is **N days ago**.",timestamp:n(3)}),e.addMessage({id:t(),role:"peer",content:"**Yesterday** — previous calendar day.",timestamp:n(1)}),e.addMessage({id:t(),role:"assistant",content:"Hi there! This is the **complete `<i-chat>`** component. It bundles messages, input, and all renderers in one tag. Try typing a message below!\n\nThe next **three self rows** demo per-message `avatar`: HTTP URL, `data:image/png;base64,…`, and inline `<svg>`.",timestamp:Date.now()}),e.addMessage({id:t(),role:"self",content:"**HTTP URL** — `avatar` is an image URL.",timestamp:Date.now(),avatar:"https://static.bndy.net/images/logo.png"}),e.addMessage({id:t(),role:"peer",content:"**Data URL** — `data:image/png;base64,…` (embedded 64×64 person icon).",timestamp:Date.now(),avatar:F}),e.addMessage({id:t(),role:"peer",content:"**Inline SVG** — `avatar` is a full `<svg>…</svg>` string.",timestamp:Date.now(),avatar:R}),e.addMessage({id:t(),role:"peer",content:'**Peer** — `role: "peer"` is for another human (left-aligned). Theme with `--chat-peer-*` (defaults match assistant until overridden).',timestamp:Date.now()}),e.addMessage({id:t(),role:"assistant",content:`**Embedded form** — submit the fields below. The page listens for **\`form-submit\`** on \`<i-chat>\` and echoes the payload as the next row.

\`\`\`form
{
  "id": "demo-contact",
  "title": "Quick feedback",
  "submitLabel": "Send",
  "fields": [
    { "name": "topic", "label": "Topic", "type": "text", "placeholder": "e.g. UI" },
    { "name": "note", "label": "Note", "type": "textarea" }
  ]
}
\`\`\``,timestamp:Date.now()}),d.value=!1},3e3)});function h(e){const a=e.detail.content;C(s,a)}function A(){s.value.cancel("*— Response stopped —*")}function p(e){console.log("form submit:",e.detail);const{formId:a,title:r,values:f,messageId:u,message:o}=e.detail,y=s.value,b=JSON.stringify(f,null,2),w=o!=null?`

**message** — \`id\`: \`${o.id}\`, \`role\`: \`${o.role}\``:"";y.addMessage({id:t(),role:"assistant",content:`**form-submit** — \`${a}\`${r?` — *${r}*`:""}

**messageId:** \`${u}\`${w}

\`\`\`json
${b}
\`\`\``,timestamp:Date.now()})}return(e,a)=>(i(),l(M,null,[_(v,{"chat-ref":s.value},null,8,["chat-ref"]),c("i-chat",{ref_key:"chatRef",ref:s,config:g,placeholder:"Type something…",onSend:h,onCancel:A,onFormSubmit:p},[c("div",I,[d.value?(i(),l("h2",U,"Fetching history messages...")):(i(),l("h2",x,"Start chatting..."))])],544)],64))}};export{B as default};
