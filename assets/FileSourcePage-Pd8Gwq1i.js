import{o as s,n as a,t as n,a as o,c as l,d as r,f as A,u as p,F as d,g as m}from"./index-Db_WKFtx.js";import{n as i}from"./demo-data-T6QExYDe.js";import{E as c}from"./ExampleCodeDrawer-BIhtKBBb.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const g=`## Add files to a message

File parts render images inline and provide download links for other MIME types.

\`\`\`js
import "@bndynet/ichat";
import { textPart } from "@bndynet/ichat";

const chat = document.querySelector("i-chat-messages");
const DEMO_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAA9klEQVR42u3ZQQ6DIBCF4blXb9fj9D69Sre4bZqiKAzO8P6XsBR8nxI1mhFCyI0p71eRKts6ZIsvB9FTPj3CiPJpEUaWT4fgUT4Ngmf5FAjSADPKh0YAAAAAdAFmlgeBLQBADIDH81O+x0yA37UBiAAwC+HfulLbIEz5O+6CUFe/BuCFUFsr3NPAAyFs+T2AUQh784cH6EU4mjvMW+DRiZ6FaJkv1GtwywnXUK4euwRAzwj3MSRdHgAA5iGE/jMEgDqAN4JliDyAF4JlCgDqAKMRLGMAUAcYhWCZA4A6QC+CrRAA1AGuIthKAUAd4CyCEUIIIe7ZAFXVGuWAntoXAAAAAElFTkSuQmCC";

chat.addMessage({
  id: crypto.randomUUID(),
  role: "assistant",
  timestamp: Date.now(),
  parts: [
    textPart(
      "**\`file\` parts** — images render inline outside the text bubble; other MIME types become lightweight download links.",
    ),
    {
      id: "file-img-url",
      type: "file",
      mediaType: "image/png",
      url: "https://static.bndy.net/images/logo.png",
      name: "logo.png",
    },
    {
      id: "file-img-data",
      type: "file",
      mediaType: "image/png",
      data: DEMO_PNG_BASE64,
      name: "embedded.png",
    },
    {
      id: "file-pdf",
      type: "file",
      mediaType: "application/pdf",
      url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      name: "dummy.pdf",
      size: 13264,
    },
  ],
});
\`\`\`

## Add the page's source citations

Source parts are lightweight citation rows. A title is optional; the URL is used when no title is supplied.

\`\`\`js
chat.addMessage({
  id: crypto.randomUUID(),
  role: "assistant",
  timestamp: Date.now(),
  parts: [
    {
      id: "src-lit",
      type: "source",
      url: "https://lit.dev/docs/components/overview/",
      title: "Lit – Overview",
      snippet:
        "Lit is a library for building fast, lightweight web components.",
    },
    {
      id: "src-mdn",
      type: "source",
      url: "https://developer.mozilla.org/en-US/docs/Web/API/Web_components",
      title: "MDN – Web Components",
      snippet:
        "Web Components is a suite of technologies allowing the creation of reusable custom elements.",
    },
    {
      id: "src-no-title",
      type: "source",
      url: "https://github.com/lit/lit",
      snippet: "When \`title\` is omitted, the URL is shown as the link text.",
    },
  ],
});
\`\`\`
`,u="iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAA9klEQVR42u3ZQQ6DIBCF4blXb9fj9D69Sre4bZqiKAzO8P6XsBR8nxI1mhFCyI0p71eRKts6ZIsvB9FTPj3CiPJpEUaWT4fgUT4Ngmf5FAjSADPKh0YAAAAAdAFmlgeBLQBADIDH81O+x0yA37UBiAAwC+HfulLbIEz5O+6CUFe/BuCFUFsr3NPAAyFs+T2AUQh784cH6EU4mjvMW+DRiZ6FaJkv1GtwywnXUK4euwRAzwj3MSRdHgAA5iGE/jMEgDqAN4JliDyAF4JlCgDqAKMRLGMAUAcYhWCZA4A6QC+CrRAA1AGuIthKAUAd4CyCEUIIIe7ZAFXVGuWAntoXAAAAAElFTkSuQmCC",U={__name:"FileSourcePage",setup(h){const t=m(null);return s(async()=>{await a();const e=t.value;e.addMessage({id:i(),role:"assistant",timestamp:Date.now(),parts:[n("**`file` parts** — images render inline outside the text bubble; other MIME types become lightweight download links. Three variants below: URL, raw base64 (`data` field), and non-image attachment."),{id:"file-img-url",type:"file",mediaType:"image/png",url:"https://static.bndy.net/images/logo.png",name:"logo.png"},{id:"file-img-data",type:"file",mediaType:"image/png",data:u,name:"embedded.png"},{id:"file-pdf",type:"file",mediaType:"application/pdf",url:"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",name:"dummy.pdf",size:13264}]}),e.addMessage({id:i(),role:"assistant",timestamp:Date.now(),parts:[n("**`source` parts** — lightweight citation rows for RAG / web search. Each part renders a title (or URL) plus an optional snippet outside the text bubble."),{id:"src-lit",type:"source",url:"https://lit.dev/docs/components/overview/",title:"Lit – Overview",snippet:"Lit is a library for building fast, lightweight web components."},{id:"src-mdn",type:"source",url:"https://developer.mozilla.org/en-US/docs/Web/API/Web_components",title:"MDN – Web Components",snippet:"Web Components is a suite of technologies allowing the creation of reusable custom elements."},{id:"src-no-title",type:"source",url:"https://github.com/lit/lit",snippet:"When `title` is omitted, the URL is shown as the link text."}]})}),(e,f)=>(o(),l(d,null,[r("i-chat-messages",{ref_key:"chatRef",ref:t},null,512),A(c,{title:"File and source code example",content:p(g)},null,8,["content"])],64))}};export{U as default};
