import{e as K,j as t,c as D,s as X,u as Q,h as R,r as _,a as ee,d as te,m as oe,b as U,g as H,f as re,i as $,k as ne,l as q,L as G,n as ae,o as se,p as Z,B as ie,q as le,t as ce,v as de,w as me,x as B,y as T,z as w,A as y,S as ue,M as pe,C as V,D as L,E as he,F as fe,G as ge,H as A,I as x,T as j,J as Se,K as ve,N as xe,P as z}from"./exampleData.BrDr1myq.js";import{r as c}from"./client.B3mIXEr8.js";import{F as k}from"./FormControlLabel.DmBxVC6p.js";import{S as F}from"./Switch.C-QCQmnG.js";const be=re(),we=X("div",{name:"MuiStack",slot:"Root"});function ye(e){return Q({props:e,name:"MuiStack",defaultTheme:be})}function Me(e,r){const o=c.Children.toArray(e).filter(Boolean);return o.reduce((a,l,n)=>(a.push(l),n<o.length-1&&a.push(c.cloneElement(r,{key:`separator-${n}`})),a),[])}const Ce=e=>({row:"Left","row-reverse":"Right",column:"Top","column-reverse":"Bottom"})[e],Ae=({ownerState:e,theme:r})=>{let o={display:"flex",flexDirection:"column",...R({theme:r},_({values:e.direction,breakpoints:r.breakpoints.values}),a=>({flexDirection:a}))};if(e.spacing){const a=ee(r),l=Object.keys(r.breakpoints.values).reduce((i,s)=>((typeof e.spacing=="object"&&e.spacing[s]!=null||typeof e.direction=="object"&&e.direction[s]!=null)&&(i[s]=!0),i),{}),n=_({values:e.direction,base:l}),d=_({values:e.spacing,base:l});typeof n=="object"&&Object.keys(n).forEach((i,s,p)=>{if(!n[i]){const h=s>0?n[p[s-1]]:"column";n[i]=h}}),o=te(o,R({theme:r},d,(i,s)=>e.useFlexGap?{gap:$(a,i)}:{"& > :not(style):not(style)":{margin:0},"& > :not(style) ~ :not(style)":{[`margin${Ce(s?n[s]:e.direction)}`]:$(a,i)}}))}return o=oe(r.breakpoints,o),o};function je(e={}){const{createStyledComponent:r=we,useThemeProps:o=ye,componentName:a="MuiStack"}=e,l=()=>U({root:["root"]},i=>H(a,i),{}),n=r(Ae);return c.forwardRef(function(i,s){const p=o(i),M=K(p),{component:h="div",direction:N="column",spacing:m=0,divider:f,children:g,className:S,useFlexGap:C=!1,...v}=M,P={direction:N,spacing:m,useFlexGap:C},W=l();return t.jsx(n,{as:h,ownerState:P,ref:s,className:D(W.root,S),...v,children:f?Me(g,f):g})})}function ke(e){return H("MuiListItemButton",e)}const b=ne("MuiListItemButton",["root","focusVisible","dense","alignItemsFlexStart","disabled","divider","gutters","selected"]),Fe=(e,r)=>{const{ownerState:o}=e;return[r.root,o.dense&&r.dense,o.alignItems==="flex-start"&&r.alignItemsFlexStart,o.divider&&r.divider,!o.disableGutters&&r.gutters]},Be=e=>{const{alignItems:r,classes:o,dense:a,disabled:l,disableGutters:n,divider:d,selected:u}=e,s=U({root:["root",a&&"dense",!n&&"gutters",d&&"divider",l&&"disabled",r==="flex-start"&&"alignItemsFlexStart",u&&"selected"]},ke,o);return{...o,...s}},Te=Z(ie,{shouldForwardProp:e=>le(e)||e==="classes",name:"MuiListItemButton",slot:"Root",overridesResolver:Fe})(ce(({theme:e})=>({display:"flex",flexGrow:1,justifyContent:"flex-start",alignItems:"center",position:"relative",textDecoration:"none",minWidth:0,boxSizing:"border-box",textAlign:"left",paddingTop:8,paddingBottom:8,transition:e.transitions.create("background-color",{duration:e.transitions.duration.shortest}),"&:hover":{textDecoration:"none",backgroundColor:(e.vars||e).palette.action.hover,"@media (hover: none)":{backgroundColor:"transparent"}},[`&.${b.selected}`]:{backgroundColor:e.alpha((e.vars||e).palette.primary.main,(e.vars||e).palette.action.selectedOpacity),[`&.${b.focusVisible}`]:{backgroundColor:e.alpha((e.vars||e).palette.primary.main,`${(e.vars||e).palette.action.selectedOpacity} + ${(e.vars||e).palette.action.focusOpacity}`)}},[`&.${b.selected}:hover`]:{backgroundColor:e.alpha((e.vars||e).palette.primary.main,`${(e.vars||e).palette.action.selectedOpacity} + ${(e.vars||e).palette.action.hoverOpacity}`),"@media (hover: none)":{backgroundColor:e.alpha((e.vars||e).palette.primary.main,(e.vars||e).palette.action.selectedOpacity)}},[`&.${b.focusVisible}`]:{backgroundColor:(e.vars||e).palette.action.focus},[`&.${b.disabled}`]:{opacity:(e.vars||e).palette.action.disabledOpacity},variants:[{props:({ownerState:r})=>r.divider,style:{borderBottom:`1px solid ${(e.vars||e).palette.divider}`,backgroundClip:"padding-box"}},{props:{alignItems:"flex-start"},style:{alignItems:"flex-start"}},{props:({ownerState:r})=>!r.disableGutters,style:{paddingLeft:16,paddingRight:16}},{props:({ownerState:r})=>r.dense,style:{paddingTop:4,paddingBottom:4}}]}))),Ve=c.forwardRef(function(r,o){const a=q({props:r,name:"MuiListItemButton"}),{alignItems:l="center",autoFocus:n=!1,component:d="div",children:u,dense:i=!1,disableGutters:s=!1,divider:p=!1,focusVisibleClassName:M,selected:h=!1,className:N,...m}=a,f=c.useContext(G),g=c.useMemo(()=>({dense:i||f.dense||!1,alignItems:l,disableGutters:s}),[l,f.dense,i,s]),S=c.useRef(null);ae(()=>{n&&S.current&&S.current.focus()},[n]);const C={...a,alignItems:l,dense:g.dense,disableGutters:s,divider:p,selected:h},v=Be(C),{root:P,...W}=v,Y=se(S,o);return t.jsx(G.Provider,{value:g,children:t.jsx(Te,{ref:Y,href:m.href||m.to,component:(m.href||m.to)&&d==="div"?"button":d,focusVisibleClassName:D(v.focusVisible,M),ownerState:C,className:D(v.root,N),...m,classes:W,children:u})})}),J=je({createStyledComponent:Z("div",{name:"MuiStack",slot:"Root"}),useThemeProps:e=>q({props:e,name:"MuiStack"})});function I(e){const[r,{width:o}]=de();return c.useEffect(()=>{o&&me(e)&&requestAnimationFrame(()=>{e.setWidth(o)})},[e,o]),r}const Le=["maeditor","clustal","clustalx_protein","clustalx_protein_dynamic","percent_identity_dynamic","lesk","cinema","flower","jalview_taylor","jalview_zappo","jalview_hydrophobicity","jalview_buried","none"],Ie=B(function(){const[e]=c.useState(()=>T().create({type:"MsaView",height:500,colorSchemeName:"maeditor",data:{msa:y,tree:w}})),r=I(e);return t.jsxs("div",{children:[t.jsx(ue,{value:e.colorSchemeName,size:"small",onChange:o=>{e.setColorSchemeName(o.target.value)},sx:{mb:1},children:Le.map(o=>t.jsx(pe,{value:o,children:o},o))}),t.jsx("div",{ref:r,children:t.jsx(V,{model:e})})]})}),Ne=`import { useState } from 'react'

import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'

import { proteinMSA, proteinTree } from './exampleData'
import useWidthSetter from './useWidthSetter'

const colorSchemes = [
  'maeditor',
  'clustal',
  'clustalx_protein',
  'clustalx_protein_dynamic',
  'percent_identity_dynamic',
  'lesk',
  'cinema',
  'flower',
  'jalview_taylor',
  'jalview_zappo',
  'jalview_hydrophobicity',
  'jalview_buried',
  'none',
]

// Color schemes can be changed at runtime via model.setColorSchemeName. The
// view re-renders reactively because the component is wrapped in observer.
const ColorSchemes = observer(function () {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 500,
      colorSchemeName: 'maeditor',
      data: { msa: proteinMSA, tree: proteinTree },
    }),
  )
  const ref = useWidthSetter(model)
  return (
    <div>
      <Select
        value={model.colorSchemeName}
        size="small"
        onChange={event => {
          model.setColorSchemeName(event.target.value)
        }}
        sx={{ mb: 1 }}
      >
        {colorSchemes.map(name => (
          <MenuItem key={name} value={name}>
            {name}
          </MenuItem>
        ))}
      </Select>
      <div ref={ref}>
        <MSAView model={model} />
      </div>
    </div>
  )
})

export default ColorSchemes
`;function We(){return t.jsx(L,{msa:fe,gff:he,colorScheme:"clustalx_protein_dynamic",height:400})}const _e=`import { MSAViewer } from 'react-msaview'

import { domainsGFF, domainsMSA } from './exampleData'

// Protein domain annotations — for example the GFF3 produced by
// \`react-msaview-cli interproscan alignment.fasta -o domains.gff\` — can be
// passed inline as the \`gff\` prop. Each protein_match is drawn as a labelled
// box over the matching rows, and the overlay turns on automatically.
export default function Domains() {
  return (
    <MSAViewer
      msa={domainsMSA}
      gff={domainsGFF}
      colorScheme="clustalx_protein_dynamic"
      height={400}
    />
  )
}
`,O="https://jbrowse.org/genomes/multiple_sequence_alignments";function De(){return t.jsx(L,{msaFilehandle:{uri:`${O}/pfam-cov2.stock`,locationType:"UriLocation"},gffFilehandle:{uri:`${O}/pfam-cov2-domains.gff`,locationType:"UriLocation"},colorScheme:"maeditor",height:550})}const Pe=`import { MSAViewer } from 'react-msaview'

const BASE = 'https://jbrowse.org/genomes/multiple_sequence_alignments'

// Instead of inline strings, the viewer can fetch remote files. A Stockholm
// file can carry its own embedded tree, and an InterProScan GFF can be layered
// on top to draw protein domain annotations.
export default function LoadFromUrl() {
  return (
    <MSAViewer
      msaFilehandle={{
        uri: \`\${BASE}/pfam-cov2.stock\`,
        locationType: 'UriLocation',
      }}
      gffFilehandle={{
        uri: \`\${BASE}/pfam-cov2-domains.gff\`,
        locationType: 'UriLocation',
      }}
      colorScheme="maeditor"
      height={550}
    />
  )
}
`,Re=B(function(){const[e]=c.useState(()=>T().create({type:"MsaView",height:550,colWidth:16,rowHeight:20,data:{msa:y,tree:w}})),r=I(e);return t.jsx("div",{ref:r,children:t.jsx(V,{model:e})})}),$e=`import { useState } from 'react'

import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'

import { proteinMSA, proteinTree } from './exampleData'
import useWidthSetter from './useWidthSetter'

// For full control over viewer state, create the model yourself with MSAModelF
// and render it with MSAView. This is what MSAViewer does internally, but here
// you hold the model instance and can read/write any of its properties.
const ModelApi = observer(function () {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 550,
      colWidth: 16,
      rowHeight: 20,
      data: {
        msa: proteinMSA,
        tree: proteinTree,
      },
    }),
  )
  const ref = useWidthSetter(model)
  return (
    <div ref={ref}>
      <MSAView model={model} />
    </div>
  )
})

export default ModelApi
`;function Ge(){return t.jsx(L,{msa:ge,colorScheme:"jbrowse_dna",height:300})}const ze=`import { MSAViewer } from 'react-msaview'

import { nucleotideMSA } from './exampleData'

// A nucleotide alignment with no tree. Any of the DNA/RNA color schemes
// (nucleotide, rainbow_dna, jbrowse_dna, ...) can be passed.
export default function NucleotideAlignment() {
  return (
    <MSAViewer msa={nucleotideMSA} colorScheme="jbrowse_dna" height={300} />
  )
}
`,Oe=B(function(){const[e]=c.useState(()=>T().create({type:"MsaView",height:500,data:{msa:y,tree:w}})),r=I(e);return t.jsxs("div",{children:[t.jsxs(J,{direction:"row",spacing:1,sx:{mb:1,flexWrap:"wrap"},children:[t.jsx(A,{variant:"outlined",size:"small",onClick:()=>{e.setColWidth(e.colWidth+2)},children:"Wider columns"}),t.jsx(A,{variant:"outlined",size:"small",onClick:()=>{e.setColWidth(Math.max(1,e.colWidth-2))},children:"Narrower columns"}),t.jsx(A,{variant:"outlined",size:"small",onClick:()=>{e.setRowHeight(e.rowHeight+2)},children:"Taller rows"}),t.jsx(A,{variant:"outlined",size:"small",onClick:()=>{e.fit()},children:"Fit to view"})]}),t.jsx("div",{ref:r,children:t.jsx(V,{model:e})})]})}),Ee=`import { useState } from 'react'

import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'

import { proteinMSA, proteinTree } from './exampleData'
import useWidthSetter from './useWidthSetter'

// The model exposes actions for programmatic control. Because MSAView is an
// observer, any action that mutates the model triggers a re-render.
const ProgrammaticControl = observer(function () {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 500,
      data: { msa: proteinMSA, tree: proteinTree },
    }),
  )
  const ref = useWidthSetter(model)
  return (
    <div>
      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            model.setColWidth(model.colWidth + 2)
          }}
        >
          Wider columns
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            model.setColWidth(Math.max(1, model.colWidth - 2))
          }}
        >
          Narrower columns
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            model.setRowHeight(model.rowHeight + 2)
          }}
        >
          Taller rows
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            model.fit()
          }}
        >
          Fit to view
        </Button>
      </Stack>
      <div ref={ref}>
        <MSAView model={model} />
      </div>
    </div>
  )
})

export default ProgrammaticControl
`,Ue=B(function(){const[e]=c.useState(()=>T().create({type:"MsaView",height:500,data:{msa:y,tree:w}})),r=I(e);return t.jsxs("div",{children:[t.jsxs(J,{direction:"row",spacing:2,sx:{mb:1,flexWrap:"wrap"},children:[t.jsx(k,{control:t.jsx(F,{checked:e.showBranchLen,onChange:o=>{e.setShowBranchLen(o.target.checked)}}),label:"Branch lengths"}),t.jsx(k,{control:t.jsx(F,{checked:e.labelsAlignRight,onChange:o=>{e.setLabelsAlignRight(o.target.checked)}}),label:"Align labels right"}),t.jsx(k,{control:t.jsx(F,{checked:e.drawNodeBubbles,onChange:o=>{e.setDrawNodeBubbles(o.target.checked)}}),label:"Node bubbles"}),t.jsx(k,{control:t.jsx(F,{checked:e.drawTree,onChange:o=>{e.setDrawTree(o.target.checked)}}),label:"Show tree"})]}),t.jsx("div",{ref:r,children:t.jsx(V,{model:e})})]})}),He=`import { useState } from 'react'

import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'

import { proteinMSA, proteinTree } from './exampleData'
import useWidthSetter from './useWidthSetter'

// The tree panel has several display toggles, each backed by a model action.
// Flipping them mutates the model and the observer re-renders the canvas.
const TreeOptions = observer(function () {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 500,
      data: { msa: proteinMSA, tree: proteinTree },
    }),
  )
  const ref = useWidthSetter(model)
  return (
    <div>
      <Stack direction="row" spacing={2} sx={{ mb: 1, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Switch
              checked={model.showBranchLen}
              onChange={event => {
                model.setShowBranchLen(event.target.checked)
              }}
            />
          }
          label="Branch lengths"
        />
        <FormControlLabel
          control={
            <Switch
              checked={model.labelsAlignRight}
              onChange={event => {
                model.setLabelsAlignRight(event.target.checked)
              }}
            />
          }
          label="Align labels right"
        />
        <FormControlLabel
          control={
            <Switch
              checked={model.drawNodeBubbles}
              onChange={event => {
                model.setDrawNodeBubbles(event.target.checked)
              }}
            />
          }
          label="Node bubbles"
        />
        <FormControlLabel
          control={
            <Switch
              checked={model.drawTree}
              onChange={event => {
                model.setDrawTree(event.target.checked)
              }}
            />
          }
          label="Show tree"
        />
      </Stack>
      <div ref={ref}>
        <MSAView model={model} />
      </div>
    </div>
  )
})

export default TreeOptions
`;function qe(){return t.jsx(L,{msa:y,tree:w,colorScheme:"maeditor",height:550})}const Ze=`import { MSAViewer } from 'react-msaview'

import { proteinMSA, proteinTree } from './exampleData'

// The MSAViewer component is the simplest entry point: pass alignment and tree
// text as strings and it creates the model, measures width, and applies the
// JBrowse theme for you.
export default function ZeroConfig() {
  return (
    <MSAViewer
      msa={proteinMSA}
      tree={proteinTree}
      colorScheme="maeditor"
      height={550}
    />
  )
}
`,E=[{name:"Zero-config viewer",description:"The simplest usage: pass alignment + tree text as strings to MSAViewer.",Component:qe,source:Ze},{name:"Nucleotide alignment",description:"A DNA alignment with no tree, using a nucleotide color scheme.",Component:Ge,source:ze},{name:"Color schemes",description:"Switch color schemes at runtime via model.setColorSchemeName.",Component:Ie,source:Ne},{name:"Model API",description:"Create the model yourself with MSAModelF and render it with MSAView.",Component:Re,source:$e},{name:"Programmatic control",description:"Drive the viewer by calling model actions from buttons.",Component:Oe,source:Ee},{name:"Tree options",description:"Toggle branch lengths, label alignment, node bubbles, and the tree panel.",Component:Ue,source:He},{name:"Protein domains",description:"Overlay InterProScan domain annotations from an inline GFF3 string.",Component:We,source:_e},{name:"Load from URL",description:"Fetch a remote Stockholm alignment plus an InterProScan domain GFF.",Component:De,source:Pe}];function Qe(){const[e,r]=c.useState(0),o=E[e],{Component:a}=o;return t.jsxs(x,{sx:{display:"flex",height:"100vh"},children:[t.jsxs(x,{component:"nav",sx:{width:240,flexShrink:0,borderRight:1,borderColor:"divider",overflowY:"auto"},children:[t.jsx(x,{sx:{p:2},children:t.jsx(j,{variant:"subtitle2",color:"text.secondary",children:"Live examples"})}),t.jsx(Se,{}),t.jsx(ve,{dense:!0,children:E.map((l,n)=>t.jsx(Ve,{selected:n===e,onClick:()=>{r(n)},children:t.jsx(xe,{primary:l.name})},l.name))})]}),t.jsxs(x,{sx:{flex:1,overflowY:"auto",p:3},children:[t.jsx(j,{variant:"h5",gutterBottom:!0,children:o.name}),t.jsx(j,{variant:"body2",color:"text.secondary",gutterBottom:!0,children:o.description}),t.jsx(z,{variant:"outlined",sx:{p:2,my:2},children:t.jsx(a,{})}),t.jsx(j,{variant:"subtitle2",gutterBottom:!0,children:"Source"}),t.jsx(z,{variant:"outlined",sx:{p:2,overflowX:"auto",backgroundColor:"action.hover"},children:t.jsx(x,{component:"pre",sx:{m:0,fontSize:13,fontFamily:"monospace",whiteSpace:"pre"},children:o.source})})]})]})}export{Qe as default};
