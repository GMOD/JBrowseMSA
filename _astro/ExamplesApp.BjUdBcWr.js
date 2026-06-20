import{e as J,j as t,c as I,s as Q,u as X,h as P,r as _,a as ee,d as te,m as oe,b as U,g as H,f as re,i as G,k as ne,l as q,L as $,n as ae,o as ie,p as K,B as se,q as le,t as ce,v as de,w as me,x as T,y as L,z as y,A as M,S as ue,M as pe,C as V,D as p,E as he,F as fe,G as Se,H as ge,I as k,J as ve,K as xe,N as we,O as w,T as j,P as be,Q as ye,R as Me,U as z}from"./exampleData.BVkMQk82.js";import{r as c}from"./client.B3mIXEr8.js";import{F}from"./FormControlLabel.D6JSOakp.js";import{S as B}from"./Switch.CYH1GQCi.js";const Ae=re(),Ce=Q("div",{name:"MuiStack",slot:"Root"});function ke(e){return X({props:e,name:"MuiStack",defaultTheme:Ae})}function je(e,r){const o=c.Children.toArray(e).filter(Boolean);return o.reduce((a,l,n)=>(a.push(l),n<o.length-1&&a.push(c.cloneElement(r,{key:`separator-${n}`})),a),[])}const Fe=e=>({row:"Left","row-reverse":"Right",column:"Top","column-reverse":"Bottom"})[e],Be=({ownerState:e,theme:r})=>{let o={display:"flex",flexDirection:"column",...P({theme:r},_({values:e.direction,breakpoints:r.breakpoints.values}),a=>({flexDirection:a}))};if(e.spacing){const a=ee(r),l=Object.keys(r.breakpoints.values).reduce((s,i)=>((typeof e.spacing=="object"&&e.spacing[i]!=null||typeof e.direction=="object"&&e.direction[i]!=null)&&(s[i]=!0),s),{}),n=_({values:e.direction,base:l}),d=_({values:e.spacing,base:l});typeof n=="object"&&Object.keys(n).forEach((s,i,h)=>{if(!n[s]){const f=i>0?n[h[i-1]]:"column";n[s]=f}}),o=te(o,P({theme:r},d,(s,i)=>e.useFlexGap?{gap:G(a,s)}:{"& > :not(style):not(style)":{margin:0},"& > :not(style) ~ :not(style)":{[`margin${Fe(i?n[i]:e.direction)}`]:G(a,s)}}))}return o=oe(r.breakpoints,o),o};function Te(e={}){const{createStyledComponent:r=Ce,useThemeProps:o=ke,componentName:a="MuiStack"}=e,l=()=>U({root:["root"]},s=>H(a,s),{}),n=r(Be);return c.forwardRef(function(s,i){const h=o(s),A=J(h),{component:f="div",direction:R="column",spacing:m=0,divider:S,children:g,className:v,useFlexGap:C=!1,...x}=A,W={direction:R,spacing:m,useFlexGap:C},D=l();return t.jsx(n,{as:f,ownerState:W,ref:i,className:I(D.root,v),...x,children:S?je(g,S):g})})}function Le(e){return H("MuiListItemButton",e)}const b=ne("MuiListItemButton",["root","focusVisible","dense","alignItemsFlexStart","disabled","divider","gutters","selected"]),Ve=(e,r)=>{const{ownerState:o}=e;return[r.root,o.dense&&r.dense,o.alignItems==="flex-start"&&r.alignItemsFlexStart,o.divider&&r.divider,!o.disableGutters&&r.gutters]},Ne=e=>{const{alignItems:r,classes:o,dense:a,disabled:l,disableGutters:n,divider:d,selected:u}=e,i=U({root:["root",a&&"dense",!n&&"gutters",d&&"divider",l&&"disabled",r==="flex-start"&&"alignItemsFlexStart",u&&"selected"]},Le,o);return{...o,...i}},Re=K(se,{shouldForwardProp:e=>le(e)||e==="classes",name:"MuiListItemButton",slot:"Root",overridesResolver:Ve})(ce(({theme:e})=>({display:"flex",flexGrow:1,justifyContent:"flex-start",alignItems:"center",position:"relative",textDecoration:"none",minWidth:0,boxSizing:"border-box",textAlign:"left",paddingTop:8,paddingBottom:8,transition:e.transitions.create("background-color",{duration:e.transitions.duration.shortest}),"&:hover":{textDecoration:"none",backgroundColor:(e.vars||e).palette.action.hover,"@media (hover: none)":{backgroundColor:"transparent"}},[`&.${b.selected}`]:{backgroundColor:e.alpha((e.vars||e).palette.primary.main,(e.vars||e).palette.action.selectedOpacity),[`&.${b.focusVisible}`]:{backgroundColor:e.alpha((e.vars||e).palette.primary.main,`${(e.vars||e).palette.action.selectedOpacity} + ${(e.vars||e).palette.action.focusOpacity}`)}},[`&.${b.selected}:hover`]:{backgroundColor:e.alpha((e.vars||e).palette.primary.main,`${(e.vars||e).palette.action.selectedOpacity} + ${(e.vars||e).palette.action.hoverOpacity}`),"@media (hover: none)":{backgroundColor:e.alpha((e.vars||e).palette.primary.main,(e.vars||e).palette.action.selectedOpacity)}},[`&.${b.focusVisible}`]:{backgroundColor:(e.vars||e).palette.action.focus},[`&.${b.disabled}`]:{opacity:(e.vars||e).palette.action.disabledOpacity},variants:[{props:({ownerState:r})=>r.divider,style:{borderBottom:`1px solid ${(e.vars||e).palette.divider}`,backgroundClip:"padding-box"}},{props:{alignItems:"flex-start"},style:{alignItems:"flex-start"}},{props:({ownerState:r})=>!r.disableGutters,style:{paddingLeft:16,paddingRight:16}},{props:({ownerState:r})=>r.dense,style:{paddingTop:4,paddingBottom:4}}]}))),De=c.forwardRef(function(r,o){const a=q({props:r,name:"MuiListItemButton"}),{alignItems:l="center",autoFocus:n=!1,component:d="div",children:u,dense:s=!1,disableGutters:i=!1,divider:h=!1,focusVisibleClassName:A,selected:f=!1,className:R,...m}=a,S=c.useContext($),g=c.useMemo(()=>({dense:s||S.dense||!1,alignItems:l,disableGutters:i}),[l,S.dense,s,i]),v=c.useRef(null);ae(()=>{n&&v.current&&v.current.focus()},[n]);const C={...a,alignItems:l,dense:g.dense,disableGutters:i,divider:h,selected:f},x=Ne(C),{root:W,...D}=x,Z=ie(v,o);return t.jsx($.Provider,{value:g,children:t.jsx(Re,{ref:Z,href:m.href||m.to,component:(m.href||m.to)&&d==="div"?"button":d,focusVisibleClassName:I(x.focusVisible,A),ownerState:C,className:I(x.root,R),...m,classes:D,children:u})})}),Y=Te({createStyledComponent:K("div",{name:"MuiStack",slot:"Root"}),useThemeProps:e=>q({props:e,name:"MuiStack"})});function N(e){const[r,{width:o}]=de();return c.useEffect(()=>{o&&me(e)&&requestAnimationFrame(()=>{e.setWidth(o)})},[e,o]),r}const _e=["maeditor","clustal","clustalx_protein","clustalx_protein_dynamic","percent_identity_dynamic","lesk","cinema","flower","jalview_taylor","jalview_zappo","jalview_hydrophobicity","jalview_buried","none"],Ie=T(function(){const[e]=c.useState(()=>L().create({type:"MsaView",height:500,colorSchemeName:"maeditor",data:{msa:M,tree:y}})),r=N(e);return t.jsxs("div",{children:[t.jsx(ue,{value:e.colorSchemeName,size:"small",onChange:o=>{e.setColorSchemeName(o.target.value)},sx:{mb:1},children:_e.map(o=>t.jsx(pe,{value:o,children:o},o))}),t.jsx("div",{ref:r,children:t.jsx(V,{model:e})})]})}),We=`import { useState } from 'react'

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
`;function Pe(){return t.jsx(p,{msa:fe,gff:he,colorScheme:"clustalx_protein_dynamic",height:400})}const Ge=`import { MSAViewer } from 'react-msaview'

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
`;function $e(){return t.jsx(p,{msa:Se,colorScheme:"nucleotide",height:500})}const ze=`import { MSAViewer } from 'react-msaview'

import { lysineMSA } from './exampleData'

// A real ~60 sequence ncRNA family (Rfam Lysine riboswitch, RF00168) with its
// full inferred tree embedded in the Stockholm file (#=GF NH), auto-extracted
// by the parser. Shows the canvas tiling holds up well past toy-sized data.
export default function LargeTree() {
  return <MSAViewer msa={lysineMSA} colorScheme="nucleotide" height={500} />
}
`,E="https://jbrowse.org/genomes/multiple_sequence_alignments";function Ee(){return t.jsx(p,{msaFilehandle:{uri:`${E}/pfam-cov2.stock`,locationType:"UriLocation"},gffFilehandle:{uri:`${E}/pfam-cov2-domains.gff`,locationType:"UriLocation"},colorScheme:"maeditor",height:550})}const Oe=`import { MSAViewer } from 'react-msaview'

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
`,Ue=T(function(){const[e]=c.useState(()=>L().create({type:"MsaView",height:550,colWidth:16,rowHeight:20,data:{msa:M,tree:y}})),r=N(e);return t.jsx("div",{ref:r,children:t.jsx(V,{model:e})})}),He=`import { useState } from 'react'

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
`;function qe(){return t.jsx(p,{msa:ge,colorScheme:"jbrowse_dna",height:300})}const Ke=`import { MSAViewer } from 'react-msaview'

import { nucleotideMSA } from './exampleData'

// A nucleotide alignment with no tree. Any of the DNA/RNA color schemes
// (nucleotide, rainbow_dna, jbrowse_dna, ...) can be passed.
export default function NucleotideAlignment() {
  return (
    <MSAViewer msa={nucleotideMSA} colorScheme="jbrowse_dna" height={300} />
  )
}
`,Ye=T(function(){const[e]=c.useState(()=>L().create({type:"MsaView",height:500,data:{msa:M,tree:y}})),r=N(e);return t.jsxs("div",{children:[t.jsxs(Y,{direction:"row",spacing:1,sx:{mb:1,flexWrap:"wrap"},children:[t.jsx(k,{variant:"outlined",size:"small",onClick:()=>{e.setColWidth(e.colWidth+2)},children:"Wider columns"}),t.jsx(k,{variant:"outlined",size:"small",onClick:()=>{e.setColWidth(Math.max(1,e.colWidth-2))},children:"Narrower columns"}),t.jsx(k,{variant:"outlined",size:"small",onClick:()=>{e.setRowHeight(e.rowHeight+2)},children:"Taller rows"}),t.jsx(k,{variant:"outlined",size:"small",onClick:()=>{e.fit()},children:"Fit to view"})]}),t.jsx("div",{ref:r,children:t.jsx(V,{model:e})})]})}),Ze=`import { useState } from 'react'

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
`;function Je(){return t.jsx(p,{msa:we,tree:xe,gff:ve,colorScheme:"clustalx_protein_dynamic",height:500})}const Qe=`import { MSAViewer } from 'react-msaview'

import { kinaseDomainsGFF, kinaseMSA, kinaseTree } from './exampleData'

// A real Src-family kinase (SFK) family — SRC, YES, FYN, FGR, HCK, LYN, LCK,
// BLK — with its tree and real InterProScan domain annotations generated by
// \`react-msaview-cli interproscan\`. Every member shares the signature
// SH3 + SH2 + tyrosine-kinase catalytic architecture, drawn as three labelled
// boxes per row over the alignment.
export default function RealDomains() {
  return (
    <MSAViewer
      msa={kinaseMSA}
      tree={kinaseTree}
      gff={kinaseDomainsGFF}
      colorScheme="clustalx_protein_dynamic"
      height={500}
    />
  )
}
`,Xe=T(function(){const[e]=c.useState(()=>L().create({type:"MsaView",height:500,data:{msa:M,tree:y}})),r=N(e);return t.jsxs("div",{children:[t.jsxs(Y,{direction:"row",spacing:2,sx:{mb:1,flexWrap:"wrap"},children:[t.jsx(F,{control:t.jsx(B,{checked:e.showBranchLen,onChange:o=>{e.setShowBranchLen(o.target.checked)}}),label:"Branch lengths"}),t.jsx(F,{control:t.jsx(B,{checked:e.labelsAlignRight,onChange:o=>{e.setLabelsAlignRight(o.target.checked)}}),label:"Align labels right"}),t.jsx(F,{control:t.jsx(B,{checked:e.drawNodeBubbles,onChange:o=>{e.setDrawNodeBubbles(o.target.checked)}}),label:"Node bubbles"}),t.jsx(F,{control:t.jsx(B,{checked:e.drawTree,onChange:o=>{e.setDrawTree(o.target.checked)}}),label:"Show tree"})]}),t.jsx("div",{ref:r,children:t.jsx(V,{model:e})})]})}),et=`import { useState } from 'react'

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
`;function tt(){return t.jsx(p,{msa:M,tree:y,colorScheme:"maeditor",height:550})}const ot=`import { MSAViewer } from 'react-msaview'

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
`,O=[{name:"Zero-config viewer",description:"The simplest usage: pass alignment + tree text as strings to MSAViewer.",Component:tt,source:ot},{name:"Nucleotide alignment",description:"A DNA alignment with no tree, using a nucleotide color scheme.",Component:qe,source:Ke},{name:"Color schemes",description:"Switch color schemes at runtime via model.setColorSchemeName.",Component:Ie,source:We},{name:"Model API",description:"Create the model yourself with MSAModelF and render it with MSAView.",Component:Ue,source:He},{name:"Programmatic control",description:"Drive the viewer by calling model actions from buttons.",Component:Ye,source:Ze},{name:"Tree options",description:"Toggle branch lengths, label alignment, node bubbles, and the tree panel.",Component:Xe,source:et},{name:"Protein domains",description:"Overlay InterProScan domain annotations from an inline GFF3 string.",Component:Pe,source:Ge},{name:"Real domains (Src-family kinases)",description:"A real Src-family kinase family (SRC, FYN, LCK, ...) with its tree and real InterProScan annotations — the signature SH3 + SH2 + kinase domains generated by react-msaview-cli interproscan.",Component:Je,source:Qe},{name:"Large tree (Lysine riboswitch)",description:"A real ~60 sequence ncRNA family (Rfam Lysine riboswitch) with its full inferred tree — shows the canvas tiling holds up past toy data.",Component:$e,source:ze},{name:"Load from URL",description:"Fetch a remote Stockholm alignment plus an InterProScan domain GFF.",Component:Ee,source:Oe}];function st(){const[e,r]=c.useState(0),o=O[e],{Component:a}=o;return t.jsxs(w,{sx:{display:"flex",height:"100vh"},children:[t.jsxs(w,{component:"nav",sx:{width:240,flexShrink:0,borderRight:1,borderColor:"divider",overflowY:"auto"},children:[t.jsx(w,{sx:{p:2},children:t.jsx(j,{variant:"subtitle2",color:"text.secondary",children:"Live examples"})}),t.jsx(be,{}),t.jsx(ye,{dense:!0,children:O.map((l,n)=>t.jsx(De,{selected:n===e,onClick:()=>{r(n)},children:t.jsx(Me,{primary:l.name})},l.name))})]}),t.jsxs(w,{sx:{flex:1,overflowY:"auto",p:3},children:[t.jsx(j,{variant:"h5",gutterBottom:!0,children:o.name}),t.jsx(j,{variant:"body2",color:"text.secondary",gutterBottom:!0,children:o.description}),t.jsx(z,{variant:"outlined",sx:{p:2,my:2},children:t.jsx(a,{})}),t.jsx(j,{variant:"subtitle2",gutterBottom:!0,children:"Source"}),t.jsx(z,{variant:"outlined",sx:{p:2,overflowX:"auto",backgroundColor:"action.hover"},children:t.jsx(w,{component:"pre",sx:{m:0,fontSize:13,fontFamily:"monospace",whiteSpace:"pre"},children:o.source})})]})]})}export{st as default};
