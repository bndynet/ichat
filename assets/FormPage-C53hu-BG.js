import{o as r,n as m,t as s,b as i,c,r as l}from"./index-Bp0ACXWZ.js";import{d,n}from"./demo-data-DaMK969m.js";const _={__name:"FormPage",setup(u){const t=l(null);r(async()=>{await m(),t.value.addMessage({id:n(),role:"assistant",parts:[s(d.form)],timestamp:Date.now()})});function o(e){const a=`Form submitted: 
\`\`\`json
${JSON.stringify(e.detail,null,2)}
\`\`\``;console.log(a),t.value.addMessage({id:n(),role:"assistant",parts:[s(a)],timestamp:Date.now()})}return(e,a)=>(i(),c("i-chat-messages",{ref_key:"chatRef",ref:t,onFormSubmit:o},null,544))}};export{_ as default};
