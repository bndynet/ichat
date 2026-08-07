import{o as i,n as m,t as s,a as d,c as l,d as c,f as u,u as f,F as p,g as b}from"./index-Db_WKFtx.js";import{d as y,n as r}from"./demo-data-T6QExYDe.js";import{E as h}from"./ExampleCodeDrawer-BIhtKBBb.js";import"./_plugin-vue_export-helper-DlAUqK2U.js";const S=`## Register the form renderer

Import the renderer package before rendering a \`form\` fence. It may be loaded from the application entry or lazily with the route.

\`\`\`js
import "@bndynet/ichat";
import "@bndynet/ichat-renderers"; // Auto-registers the form renderer
import { textPart } from "@bndynet/ichat";

const chat = document.querySelector("i-chat-messages");
\`\`\`

## Send the definition

The renderer creates native form controls from the field definitions.

\`\`\`js
const form = {
  id: "user-feedback",
  title: "User Feedback",
  submitLabel: "Send Feedback",
  fields: [
    { name: "name", label: "Your Name", type: "text", required: true },
    {
      name: "satisfaction",
      label: "Satisfaction",
      type: "select",
      options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"],
    },
    {
      name: "source",
      label: "How did you find us?",
      type: "radio",
      options: ["Search", "Social media", "Word of mouth", "Other"],
    },
    { name: "subscribe", label: "Subscribe to newsletter", type: "checkbox" },
    { name: "comments", label: "Additional Comments", type: "textarea" },
  ],
};

chat.addMessage({
  id: crypto.randomUUID(),
  role: "assistant",
  timestamp: Date.now(),
  parts: [textPart(\`\\\`\\\`\\\`form\\n\${JSON.stringify(form, null, 2)}\\n\\\`\\\`\\\`\`)],
});
\`\`\`

## Handle submission

Form submission is emitted as a \`part-action\`; validate and persist its data in your host application.

\`\`\`js
chat.addEventListener("part-action", (event) => {
  if (event.detail?.kind !== "form") return;

  const submission = event.detail.payload;
  console.log("Submitted form:", submission);
});
\`\`\`

## History replay with submitted values

For history records (previously submitted forms), include \`"submittedValues"\` in the schema to render the summary view instead of an interactive form.

\`\`\`js
const form = {
  id: "user-feedback",
  title: "User Feedback",
  fields: [
    { name: "name", label: "Your Name", type: "text" },
    {
      name: "satisfaction",
      label: "Satisfaction",
      type: "select",
      options: ["Very Satisfied", "Satisfied", "Neutral"],
    },
    {
      name: "source",
      label: "How did you find us?",
      type: "radio",
      options: ["Search", "Social media", "Other"],
    },
    { name: "subscribe", label: "Subscribe to newsletter", type: "checkbox" },
    { name: "comments", label: "Additional Comments", type: "textarea" },
  ],
  submittedValues: {
    name: "Alice",
    satisfaction: "Very Satisfied",
    source: "Social media",
    subscribe: true,
    comments: "Great product!",
  },
};

chat.addMessage({
  id: crypto.randomUUID(),
  role: "assistant",
  timestamp: Date.now(),
  parts: [textPart(\`\\\`\\\`\\\`form\\n\${JSON.stringify(form, null, 2)}\\n\\\`\\\`\\\`\`)],
});
\`\`\`
`,F={__name:"FormPage",setup(g){const e=b(null);i(async()=>{await m(),e.value.addMessage({id:r(),role:"assistant",parts:[s(y.form)],timestamp:Date.now()})});function o(n){var a;if(((a=n.detail)==null?void 0:a.kind)!=="form")return;const t=`Form submitted via part-action: 
\`\`\`json
${JSON.stringify(n.detail.payload,null,2)}
\`\`\``;console.log(t),e.value.addMessage({id:r(),role:"assistant",parts:[s(t)],timestamp:Date.now()})}return(n,t)=>(d(),l(p,null,[c("i-chat-messages",{ref_key:"chatRef",ref:e,onPartAction:o},null,544),u(h,{title:"Form code example",content:f(S)},null,8,["content"])],64))}};export{F as default};
