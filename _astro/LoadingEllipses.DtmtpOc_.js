import{r as e}from"./rolldown-runtime.hePW80VL.js";import{C as t,t as n}from"./mui.CHa6vxLx.js";import{a as r}from"./ButtonBase.C52q-uU-.js";import{t as i}from"./jsx-runtime.CWLBoBiw.js";var a=e(i(),1),o=r`
  0%, 25% { opacity: 0; }
  25.1%, 100% { opacity: 1; }
`,s=r`
  0%, 50% { opacity: 0; }
  50.1%, 100% { opacity: 1; }
`,c=r`
  0%, 75% { opacity: 0; }
  75.1%, 100% { opacity: 1; }
`,l=n()({dots:{display:`inline-block`,width:`1em`,textAlign:`left`,"& span":{display:`inline-block`,opacity:0,willChange:`opacity`,"&:nth-of-type(1)":{animation:`${o} 1.2s infinite`},"&:nth-of-type(2)":{animation:`${s} 1.2s infinite`},"&:nth-of-type(3)":{animation:`${c} 1.2s infinite`}}}});function u(){let{classes:e}=l();return(0,a.jsxs)(`span`,{className:e.dots,children:[(0,a.jsx)(`span`,{children:`.`}),(0,a.jsx)(`span`,{children:`.`}),(0,a.jsx)(`span`,{children:`.`})]})}function d({message:e,variant:n=`body2`,...r}){return(0,a.jsxs)(t,{...r,variant:n,children:[e||`Loading`,(0,a.jsx)(u,{})]})}export{d as t};