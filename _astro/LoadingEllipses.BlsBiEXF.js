import{F as e,Gt as t}from"./Close.BgfIAWiH.js";import{t as n}from"./jsx-runtime.C6cmW1Aq.js";import{t as r}from"./mui.B4wamkYO.js";var i=n(),a=t`
  0%, 25% { visibility: hidden; }
  25.1%, 100% { visibility: visible; }
`,o=t`
  0%, 50% { visibility: hidden; }
  50.1%, 100% { visibility: visible; }
`,s=t`
  0%, 75% { visibility: hidden; }
  75.1%, 100% { visibility: visible; }
`,c=r()({dots:{display:`inline-block`,width:`1em`,textAlign:`left`,"& span":{visibility:`hidden`,"&:nth-of-type(1)":{animation:`${a} 1.2s infinite`},"&:nth-of-type(2)":{animation:`${o} 1.2s infinite`},"&:nth-of-type(3)":{animation:`${s} 1.2s infinite`}}}});function l(){let{classes:e}=c();return(0,i.jsxs)(`span`,{className:e.dots,children:[(0,i.jsx)(`span`,{children:`.`}),(0,i.jsx)(`span`,{children:`.`}),(0,i.jsx)(`span`,{children:`.`})]})}function u({message:t,variant:n=`body2`,...r}){return(0,i.jsxs)(e,{...r,variant:n,children:[t||`Loading`,(0,i.jsx)(l,{})]})}export{u as t};