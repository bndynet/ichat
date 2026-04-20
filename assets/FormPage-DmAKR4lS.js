import{o,n as r,a as c,c as l,b as m,d as i,F as d,r as u}from"./index-CYSp967g.js";import{d as f,n,C as p}from"./ChatToolbar-DdCZwgK2.js";const F={__name:"FormPage",setup(_){const e=u(null);o(async()=>{await r(),e.value.addMessage({id:n(),role:"assistant",content:f.form,timestamp:Date.now()})});function s(t){const a=`Form submitted: 
\`\`\`json
${JSON.stringify(t.detail,null,2)}
\`\`\``;console.log(a),e.value.addMessage({id:n(),role:"assistant",content:a,timestamp:Date.now()})}return(t,a)=>(c(),l(d,null,[m(p,{"chat-ref":e.value},null,8,["chat-ref"]),i("i-chat-messages",{ref_key:"chatRef",ref:e,onFormSubmit:s},null,544)],64))}};export{F as default};
