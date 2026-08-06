import{r as e}from"./rolldown-runtime.hePW80VL.js";import{x as t}from"./Tooltip.BgFwEKP3.js";import{a as n}from"./ButtonBase.BXIivUkB.js";import{t as r}from"./jsx-runtime.CWLBoBiw.js";import{t as i}from"./mui.CdqQIcZ5.js";var a=e(r(),1),o=n`
  0%, 25% { opacity: 0; }
  25.1%, 100% { opacity: 1; }
`,s=n`
  0%, 50% { opacity: 0; }
  50.1%, 100% { opacity: 1; }
`,c=n`
  0%, 75% { opacity: 0; }
  75.1%, 100% { opacity: 1; }
`,l=i()({dots:{display:`inline-block`,width:`1em`,textAlign:`left`,"& span":{display:`inline-block`,opacity:0,willChange:`opacity`,"&:nth-of-type(1)":{animation:`${o} 1.2s infinite`},"&:nth-of-type(2)":{animation:`${s} 1.2s infinite`},"&:nth-of-type(3)":{animation:`${c} 1.2s infinite`}}}});function u(){let{classes:e}=l();return(0,a.jsxs)(`span`,{className:e.dots,children:[(0,a.jsx)(`span`,{children:`.`}),(0,a.jsx)(`span`,{children:`.`}),(0,a.jsx)(`span`,{children:`.`})]})}function d({message:e,variant:n=`body2`,...r}){return(0,a.jsxs)(t,{...r,variant:n,children:[e||`Loading`,(0,a.jsx)(u,{})]})}export{d as t};