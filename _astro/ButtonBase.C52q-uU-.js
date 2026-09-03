import{r as e,t}from"./rolldown-runtime.hePW80VL.js";import{At as n,F as r,Ft as i,I as a,It as o,M as s,Mt as c,N as l,Nt as u,P as d,Pt as f,dt as p,et as m,f as h,ft as g,g as _,h as v,jt as y,k as b,kt as x,m as ee,p as S,pt as C,v as w,z as te}from"./mui.CHa6vxLx.js";import{t as T}from"./react.C2itep5K.js";import{t as E}from"./jsx-runtime.CWLBoBiw.js";var D=t((e=>{var t=typeof Symbol==`function`&&Symbol.for,n=t?Symbol.for(`react.element`):60103,r=t?Symbol.for(`react.portal`):60106,i=t?Symbol.for(`react.fragment`):60107,a=t?Symbol.for(`react.strict_mode`):60108,o=t?Symbol.for(`react.profiler`):60114,s=t?Symbol.for(`react.provider`):60109,c=t?Symbol.for(`react.context`):60110,l=t?Symbol.for(`react.async_mode`):60111,u=t?Symbol.for(`react.concurrent_mode`):60111,d=t?Symbol.for(`react.forward_ref`):60112,f=t?Symbol.for(`react.suspense`):60113,p=t?Symbol.for(`react.suspense_list`):60120,m=t?Symbol.for(`react.memo`):60115,h=t?Symbol.for(`react.lazy`):60116,g=t?Symbol.for(`react.block`):60121,_=t?Symbol.for(`react.fundamental`):60117,v=t?Symbol.for(`react.responder`):60118,y=t?Symbol.for(`react.scope`):60119;function b(e){if(typeof e==`object`&&e){var t=e.$$typeof;switch(t){case n:switch(e=e.type,e){case l:case u:case i:case o:case a:case f:return e;default:switch(e&&=e.$$typeof,e){case c:case d:case h:case m:case s:return e;default:return t}}case r:return t}}}function x(e){return b(e)===u}e.AsyncMode=l,e.ConcurrentMode=u,e.ContextConsumer=c,e.ContextProvider=s,e.Element=n,e.ForwardRef=d,e.Fragment=i,e.Lazy=h,e.Memo=m,e.Portal=r,e.Profiler=o,e.StrictMode=a,e.Suspense=f,e.isAsyncMode=function(e){return x(e)||b(e)===l},e.isConcurrentMode=x,e.isContextConsumer=function(e){return b(e)===c},e.isContextProvider=function(e){return b(e)===s},e.isElement=function(e){return typeof e==`object`&&!!e&&e.$$typeof===n},e.isForwardRef=function(e){return b(e)===d},e.isFragment=function(e){return b(e)===i},e.isLazy=function(e){return b(e)===h},e.isMemo=function(e){return b(e)===m},e.isPortal=function(e){return b(e)===r},e.isProfiler=function(e){return b(e)===o},e.isStrictMode=function(e){return b(e)===a},e.isSuspense=function(e){return b(e)===f},e.isValidElementType=function(e){return typeof e==`string`||typeof e==`function`||e===i||e===u||e===o||e===a||e===f||e===p||typeof e==`object`&&!!e&&(e.$$typeof===h||e.$$typeof===m||e.$$typeof===s||e.$$typeof===c||e.$$typeof===d||e.$$typeof===_||e.$$typeof===v||e.$$typeof===y||e.$$typeof===g)},e.typeOf=b})),O=t(((e,t)=>{t.exports=D()})),k=t(((e,t)=>{var n=O(),r={childContextTypes:!0,contextType:!0,contextTypes:!0,defaultProps:!0,displayName:!0,getDefaultProps:!0,getDerivedStateFromError:!0,getDerivedStateFromProps:!0,mixins:!0,propTypes:!0,type:!0},i={name:!0,length:!0,prototype:!0,caller:!0,callee:!0,arguments:!0,arity:!0},a={$$typeof:!0,render:!0,defaultProps:!0,displayName:!0,propTypes:!0},o={$$typeof:!0,compare:!0,defaultProps:!0,displayName:!0,propTypes:!0,type:!0},s={};s[n.ForwardRef]=a,s[n.Memo]=o;function c(e){return n.isMemo(e)?o:s[e.$$typeof]||r}var l=Object.defineProperty,u=Object.getOwnPropertyNames,d=Object.getOwnPropertySymbols,f=Object.getOwnPropertyDescriptor,p=Object.getPrototypeOf,m=Object.prototype;function h(e,t,n){if(typeof t!=`string`){if(m){var r=p(t);r&&r!==m&&h(e,r,n)}var a=u(t);d&&(a=a.concat(d(t)));for(var o=c(e),s=c(t),g=0;g<a.length;++g){var _=a[g];if(!i[_]&&!(n&&n[_])&&!(s&&s[_])&&!(o&&o[_])){var v=f(t,_);try{l(e,_,v)}catch{}}}}return e}t.exports=h})),A=e(T());k();var j=function(e,t){var n=arguments;if(t==null||!c.call(t,`css`))return A.createElement.apply(void 0,n);var r=n.length,i=Array(r);i[0]=x,i[1]=y(e,t);for(var a=2;a<r;a++)i[a]=n[a];return A.createElement.apply(null,i)};(function(e){var t;t||=e.JSX||={}})(j||={});var ne=u(function(e,t){var r=e.styles,a=i([r],void 0,A.useContext(n)),s=A.useRef();return f(function(){var e=t.key+`-global`,n=new t.sheet.constructor({key:e,nonce:t.sheet.nonce,container:t.sheet.container,speedy:t.sheet.isSpeedy}),r=!1,i=document.querySelector(`style[data-emotion="`+e+` `+a.name+`"]`);return t.sheet.tags.length&&(n.before=t.sheet.tags[0]),i!==null&&(r=!0,i.setAttribute(`data-emotion`,e),n.hydrate([i])),s.current=[n,r],function(){n.flush()}},[t]),f(function(){var e=s.current,n=e[0];if(e[1]){e[1]=!1;return}a.next!==void 0&&o(t,a.next,!0),n.tags.length&&(n.before=n.tags[n.tags.length-1].nextElementSibling,n.flush()),t.insert(``,a,n,!1)},[t,a.name]),null});function M(){return i([...arguments])}function N(){var e=M.apply(void 0,arguments),t=`animation-`+e.name;return{name:t,styles:`@keyframes `+t+`{`+e.styles+`}`,anim:1,toString:function(){return`_EMO_`+this.name+`_`+this.styles+`_EMO_`}}}function P(e){return g(`MuiSvgIcon`,e)}p(`MuiSvgIcon`,[`root`,`colorPrimary`,`colorSecondary`,`colorAction`,`colorError`,`colorDisabled`,`fontSizeInherit`,`fontSizeSmall`,`fontSizeMedium`,`fontSizeLarge`]);var F=e(E(),1),I=e=>{let{color:t,fontSize:n,classes:r}=e,i={root:[`root`,t!==`inherit`&&`color${l(t)}`,`fontSize${l(n)}`]};return m(i,P,r)},L=a(`svg`,{name:`MuiSvgIcon`,slot:`Root`,overridesResolver:(e,t)=>{let{ownerState:n}=e;return[t.root,n.color!==`inherit`&&t[`color${l(n.color)}`],t[`fontSize${l(n.fontSize)}`]]}})(r(({theme:e})=>({userSelect:`none`,width:`1em`,height:`1em`,display:`inline-block`,flexShrink:0,...b(e,`fill`,{duration:(e.vars??e).transitions?.duration?.shorter}),variants:[{props:e=>!e.hasSvgAsChild,style:{fill:`currentColor`}},{props:{fontSize:`inherit`},style:{fontSize:`inherit`}},{props:{fontSize:`small`},style:{fontSize:e.typography?.pxToRem?.(20)||`1.25rem`}},{props:{fontSize:`medium`},style:{fontSize:e.typography?.pxToRem?.(24)||`1.5rem`}},{props:{fontSize:`large`},style:{fontSize:e.typography?.pxToRem?.(35)||`2.1875rem`}},...Object.entries((e.vars??e).palette).filter(([,e])=>e&&e.main).map(([t])=>({props:{color:t},style:{color:(e.vars??e).palette?.[t]?.main}})),{props:{color:`action`},style:{color:(e.vars??e).palette?.action?.active}},{props:{color:`disabled`},style:{color:(e.vars??e).palette?.action?.disabled}},{props:{color:`inherit`},style:{color:void 0}}]}))),R=A.forwardRef(function(e,t){let n=d({props:e,name:`MuiSvgIcon`}),{children:r,className:i,color:a=`inherit`,component:o=`svg`,fontSize:s=`medium`,htmlColor:c,inheritViewBox:l=!1,titleAccess:u,viewBox:f=`0 0 24 24`,...p}=n,m=A.isValidElement(r)&&r.type===`svg`,h={...n,color:a,component:o,fontSize:s,instanceFontSize:e.fontSize,inheritViewBox:l,viewBox:f,hasSvgAsChild:m},g={};l||(g.viewBox=f);let _=I(h);return(0,F.jsxs)(L,{as:o,className:C(_.root,i),focusable:`false`,color:c,"aria-hidden":!u||void 0,role:u?`img`:void 0,ref:t,...g,...p,...m&&r.props,ownerState:h,children:[m?r.props.children:r,u?(0,F.jsx)(`title`,{children:u}):null]})});R.muiName=`SvgIcon`;function z(e,t){function n(t,n){return(0,F.jsx)(R,{"data-testid":void 0,ref:n,...t,children:e})}return n.muiName=R.muiName,A.memo(A.forwardRef(n))}function B(e){let{focusableWhenDisabled:t,disabled:n,composite:r=!1,tabIndex:i=0,isNativeButton:a}=e,o=r&&t!==!1,s=r&&t===!1;return A.useMemo(()=>{let e={onKeyDown(e){n&&t&&e.key!==`Tab`&&e.preventDefault()}};return r||(e.tabIndex=i,!a&&n&&(e.tabIndex=t?i:-1)),(a&&(t||o)||!a&&n)&&(e[`aria-disabled`]=n),a&&(!t||s)&&(e.disabled=n),e},[r,n,t,o,s,a,i])}var V={};function re(e){let{nativeButton:t,nativeButtonProp:n,internalNativeButton:r=t,allowInferredHostMismatch:i=!1,disabled:a,type:o,hasFormAction:s=!1,tabIndex:c=0,focusableWhenDisabled:l,stopEventPropagation:u=!1,onBeforeKeyDown:d,onBeforeKeyUp:f}=e,p=A.useRef(null),m=l===!0,h=B({focusableWhenDisabled:m,disabled:a,isNativeButton:t,tabIndex:c}),g=A.useCallback(()=>{let e=p.current;return e==null?t:e.tagName===`BUTTON`||!!(e.tagName===`A`&&e.href)},[t]),_=A.useMemo(()=>{let e=m?{}:{tabIndex:a?-1:c};return t?(e.type=o===void 0&&!s?`button`:o,m||(e.disabled=a)):(e.role=`button`,!m&&a&&(e[`aria-disabled`]=a)),m?{...e,...h}:e},[a,m,h,s,t,c,o]);return{getButtonProps:A.useCallback((e=V)=>{let{onClick:t,onKeyDown:n,onKeyUp:r,...i}=e,o=e=>{if(u&&e.stopPropagation(),a){e.preventDefault();return}t?.(e)},s=e=>{if(m&&h.onKeyDown(e),!a&&(d?.(e),n?.(e),!(e.target!==e.currentTarget||g()))){if(e.key===` `){e.preventDefault();return}e.key===`Enter`&&(e.preventDefault(),e.currentTarget.click())}},c=e=>{a||(f?.(e),r?.(e),e.target===e.currentTarget&&!g()&&e.key===` `&&!e.defaultPrevented&&e.currentTarget.click())};return{..._,...i,onClick:o,onKeyDown:s,onKeyUp:c}},[_,a,m,h,g,d,f,u]),rootRef:p}}var H=class e{static create(){return new e}static use(){let t=v(e.create).current,[n,r]=A.useState(!1);return t.shouldMount=n,t.setShouldMount=r,A.useEffect(t.mountEffect,[n]),t}constructor(){this.ref={current:null},this.mounted=null,this.didMount=!1,this.shouldMount=!1,this.setShouldMount=null}mount(){return this.mounted||(this.mounted=U(),this.shouldMount=!0,this.setShouldMount(this.shouldMount)),this.mounted}mountEffect=()=>{this.shouldMount&&!this.didMount&&this.ref.current!==null&&(this.didMount=!0,this.mounted.resolve())};start(...e){this.mount().then(()=>this.ref.current?.start(...e))}stop(...e){this.mount().then(()=>this.ref.current?.stop(...e))}pulsate(...e){this.mount().then(()=>this.ref.current?.pulsate(...e))}};function ie(){return H.use()}function U(){let e,t,n=new Promise((n,r)=>{e=n,t=r});return n.resolve=e,n.reject=t,n}function W(e){let{className:t,classes:n,pulsate:r=!1,rippleX:i,rippleY:a,rippleSize:o,in:s,onExited:c,timeout:l}=e,[u,d]=A.useState(!1),f=S(),p=A.useRef(!1),m=A.useRef(c);m.current=c;let h=c!=null,g=C(t,n.ripple,n.rippleVisible,r&&n.ripplePulsate),_={width:o,height:o,top:-(o/2)+a,left:-(o/2)+i},v=C(n.child,u&&n.childLeaving,r&&n.childPulsate);return!s&&!u&&d(!0),A.useEffect(()=>{!s&&h?p.current||(p.current=!0,f.start(l,()=>{p.current=!1,m.current?.()})):(p.current=!1,f.clear())},[f,h,s,l]),(0,F.jsx)(`span`,{className:g,style:_,children:(0,F.jsx)(`span`,{className:v})})}var G=p(`MuiTouchRipple`,[`root`,`ripple`,`rippleVisible`,`ripplePulsate`,`child`,`childLeaving`,`childPulsate`]),K=550,q={},J=[],Y=()=>{};function X(e,t){let n=new Set(t),r=new Map,i=[];for(let t of e)n.has(t)?i.length>0&&(r.set(t,i),i=[]):i.push(t);let a=[];for(let e of t){let t=r.get(e);t&&a.push(...t),a.push(e)}return a.push(...i),a}function ae({event:e,element:t,center:n}){let r=t?t.getBoundingClientRect():{width:0,height:0,left:0,top:0},i,a;if(n||e===void 0||e.clientX===0&&e.clientY===0||!e.clientX&&!e.touches)i=Math.round(r.width/2),a=Math.round(r.height/2);else{let{clientX:t,clientY:n}=e.touches&&e.touches.length>0?e.touches[0]:e;i=Math.round(t-r.left),a=Math.round(n-r.top)}let o;if(n)o=Math.sqrt((2*r.width**2+r.height**2)/3),o%2==0&&(o+=1);else{let e=Math.max(Math.abs((t?t.clientWidth:0)-i),i)*2+2,n=Math.max(Math.abs((t?t.clientHeight:0)-a),a)*2+2;o=Math.sqrt(e**2+n**2)}return{rippleX:i,rippleY:a,rippleSize:o}}var oe=N`
  0% {
    transform: scale(0);
    opacity: 0.1;
  }

  100% {
    transform: scale(1);
    opacity: 0.3;
  }
`,Z=N`
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
`,se=N`
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(0.92);
  }

  100% {
    transform: scale(1);
  }
`;function ce(e){if(e.motion.reducedMotion===`always`)return null;let t=M`
    &.${G.rippleVisible} {
      animation-name: ${oe};
      animation-duration: ${K}ms;
      animation-timing-function: ${e.transitions.easing.easeInOut};
    }

    &.${G.ripplePulsate} {
      animation-duration: ${e.transitions.duration.shorter}ms;
    }

    & .${G.childLeaving} {
      animation-name: ${Z};
      animation-duration: ${K}ms;
      animation-timing-function: ${e.transitions.easing.easeInOut};
    }

    & .${G.childPulsate} {
      animation-name: ${se};
      animation-duration: 2500ms;
      animation-timing-function: ${e.transitions.easing.easeInOut};
      animation-iteration-count: infinite;
      animation-delay: 200ms;
    }
  `;return e.motion.reducedMotion===`system`?M`
      @media (prefers-reduced-motion: no-preference) {
        ${t}
      }
    `:t}var le=a(`span`,{name:`MuiTouchRipple`,slot:`Root`})({overflow:`hidden`,pointerEvents:`none`,position:`absolute`,zIndex:0,top:0,right:0,bottom:0,left:0,borderRadius:`inherit`}),ue=a(W,{name:`MuiTouchRipple`,slot:`Ripple`})`
  opacity: 0;
  position: absolute;

  &.${G.rippleVisible} {
    opacity: 0.3;
    transform: scale(1);
  }

  /*
   * Order matters: 'child', 'childLeaving' and 'childPulsate' apply to the same
   * element with equal specificity, so the later rule wins. 'child' must come
   * before 'childLeaving' so the leaving 'opacity: 0' takes precedence. A focus
   * (pulsate) ripple keeps 'pulsateKeyframe' (no opacity animation) on exit, so
   * it relies on this static 'opacity: 0' to disappear on blur instead of
   * lingering until removal.
   */
  & .${G.child} {
    opacity: 1;
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: currentColor;
  }

  & .${G.childLeaving} {
    opacity: 0;
  }

  & .${G.childPulsate} {
    position: absolute;
    /* @noflip */
    left: 0px;
    top: 0;
  }

  ${({theme:e})=>ce(e)}
`,de=A.forwardRef(function(e,t){let n=d({props:e,name:`MuiTouchRipple`}),r=te(),i=h(r.motion.reducedMotion,!1),{center:a=!1,classes:o=q,className:s,...c}=n,[l,u]=A.useState({items:J,order:J}),f=l.items,p=A.useRef(0),m=A.useRef(null),g=A.useRef(!1);ee(()=>(g.current=!0,()=>{g.current=!1})),A.useEffect(()=>{m.current&&=(m.current(),null)},[f]);let _=A.useRef(!1),v=S(),y=A.useRef(null),b=A.useRef(null),x=w(e=>{g.current&&u(t=>{let n=t.items.filter(t=>t.key!==e);return{items:n,order:X(t.order.filter(t=>t!==e),n.filter(e=>!e.exiting).map(e=>e.key))}})}),T=w(e=>{let{pulsate:t,rippleX:n,rippleY:r,rippleSize:i,cb:a}=e,o=p.current;p.current+=1,u(e=>{let a=[...e.items,{key:o,pulsate:t,rippleX:n,rippleY:r,rippleSize:i,exiting:!1}];return{items:a,order:X(e.order,a.filter(e=>!e.exiting).map(e=>e.key))}}),m.current=a}),E=w((e=q,t=q,n=Y)=>{let{pulsate:r=!1,center:i=a||t.pulsate,fakeElement:o=!1}=t;if(e?.type===`mousedown`&&_.current){_.current=!1;return}e?.type===`touchstart`&&(_.current=!0);let{rippleX:s,rippleY:c,rippleSize:l}=ae({event:e,element:o?null:b.current,center:i});e?.touches?y.current===null&&(y.current=()=>{T({pulsate:r,rippleX:s,rippleY:c,rippleSize:l,cb:n})},v.start(80,()=>{y.current&&=(y.current(),null)})):T({pulsate:r,rippleX:s,rippleY:c,rippleSize:l,cb:n})}),D=w(()=>{E(q,{pulsate:!0})}),O=w((e,t)=>{if(v.clear(),e?.type===`touchend`&&y.current){y.current(),y.current=null,v.start(0,()=>{O(e,t)});return}y.current=null,u(e=>{let t=e.items.findIndex(e=>!e.exiting);if(t===-1)return e;let n=e.items.slice();return n[t]={...n[t],exiting:!0},{items:n,order:X(e.order,n.filter(e=>!e.exiting).map(e=>e.key))}}),m.current=t});A.useImperativeHandle(t,()=>({pulsate:D,start:E,stop:O}),[D,E,O]);let k=new Map(f.map(e=>[e.key,e])),j=l.order.map(e=>k.get(e)).filter(Boolean);return(0,F.jsx)(le,{className:C(G.root,o.root,s),ref:b,...c,children:j.map(e=>(0,F.jsx)(ue,{classes:{ripple:C(o.ripple,G.ripple),rippleVisible:C(o.rippleVisible,G.rippleVisible),ripplePulsate:C(o.ripplePulsate,G.ripplePulsate),child:C(o.child,G.child),childLeaving:C(o.childLeaving,G.childLeaving),childPulsate:C(o.childPulsate,G.childPulsate)},timeout:i.shouldReduceMotion?0:K,pulsate:e.pulsate,rippleX:e.rippleX,rippleY:e.rippleY,rippleSize:e.rippleSize,in:!e.exiting,onExited:()=>x(e.key)},e.key))})});function fe(e){return g(`MuiButtonBase`,e)}var pe=p(`MuiButtonBase`,[`root`,`disabled`,`focusVisible`]),me=e=>{let{disabled:t,focusVisible:n,focusVisibleClassName:r,suppressFocusVisible:i,classes:a}=e,o=m({root:[`root`,t&&`disabled`,n&&!i&&`focusVisible`]},fe,a);return n&&!i&&r&&(o.root+=` ${r}`),o},he=a(`button`,{name:`MuiButtonBase`,slot:`Root`})({display:`inline-flex`,alignItems:`center`,justifyContent:`center`,position:`relative`,boxSizing:`border-box`,WebkitTapHighlightColor:`transparent`,backgroundColor:`transparent`,outline:0,border:0,margin:0,borderRadius:0,padding:0,cursor:`pointer`,userSelect:`none`,verticalAlign:`middle`,MozAppearance:`none`,WebkitAppearance:`none`,textDecoration:`none`,color:`inherit`,"&::-moz-focus-inner":{borderStyle:`none`},[`&.${pe.disabled}`]:{pointerEvents:`none`,cursor:`default`},"@media print":{colorAdjust:`exact`}}),ge=A.forwardRef(function(e,t){let n=d({props:e,name:`MuiButtonBase`}),{action:r,centerRipple:i=!1,children:a,className:o,component:c=`button`,disabled:l=!1,disableRipple:u=!1,disableTouchRipple:f=!1,focusRipple:p=!1,focusVisibleClassName:m,focusableWhenDisabled:h,suppressFocusVisible:g=!1,internalNativeButton:v,LinkComponent:y=`a`,nativeButton:b,onBlur:x,onClick:ee,onContextMenu:S,onDragLeave:te,onFocus:T,onFocusVisible:E,onKeyDown:D,onKeyUp:O,onMouseDown:k,onMouseLeave:j,onMouseUp:ne,onTouchEnd:M,onTouchMove:N,onTouchStart:P,tabIndex:I=0,TouchRippleProps:L,touchRippleRef:R,type:z,...B}=n,V=!!(B.href||B.to),H=!!B.formAction,U=c;U===`button`&&V&&(U=y);let W=typeof U==`string`?U===`button`:v??!1,G=b??W,K=ie(),q=s(K.ref,R),[J,Y]=A.useState(!1);(l||g)&&J&&Y(!1);let X=w(e=>{p&&!e.repeat&&J&&e.key===` `&&K.stop(e,()=>{K.start(e)})}),ae=w(e=>{p&&e.key===` `&&J&&!e.defaultPrevented&&K.stop(e,()=>{K.pulsate(e)})}),{getButtonProps:oe,rootRef:Z}=re({nativeButton:G,nativeButtonProp:b,internalNativeButton:W,allowInferredHostMismatch:V||typeof U==`string`,disabled:l,type:z,hasFormAction:H,tabIndex:I,onBeforeKeyDown:X,onBeforeKeyUp:ae}),{onClick:se,onKeyDown:ce,onKeyUp:le,...ue}=oe({onClick:ee,onKeyDown:D,onKeyUp:O});A.useImperativeHandle(r,()=>({focusVisible:()=>{Y(!0),Z.current.focus()}}),[Z]);let fe=K.shouldMount&&!u&&!l;A.useEffect(()=>{J&&p&&!u&&K.pulsate()},[u,p,J,K]);let pe=Q(K,`start`,k,f),ge=Q(K,`stop`,S,f),_e=Q(K,`stop`,te,f),ve=Q(K,`stop`,ne,f),ye=Q(K,`stop`,e=>{J&&e.preventDefault(),j&&j(e)},f),be=Q(K,`start`,P,f),xe=Q(K,`stop`,M,f),Se=Q(K,`stop`,N,f),Ce=Q(K,`stop`,e=>{_(e.target)||Y(!1),x&&x(e)},!1),we=w(e=>{Z.current||=e.currentTarget,!g&&_(e.target)&&(Y(!0),E&&E(e)),T&&T(e)}),$={};V&&($.tabIndex=l?-1:I,l&&($[`aria-disabled`]=l),$.type=z);let Te=s(t,Z),Ee={...n,centerRipple:i,component:c,disabled:l,disableRipple:u,disableTouchRipple:f,focusRipple:p,suppressFocusVisible:g,tabIndex:I,focusVisible:J},De=me(Ee);return(0,F.jsxs)(he,{as:U,className:C(De.root,o),ownerState:Ee,onBlur:Ce,onClick:se,onContextMenu:ge,onFocus:we,onKeyDown:ce,onKeyUp:le,onMouseDown:pe,onMouseLeave:ye,onMouseUp:ve,onDragLeave:_e,onTouchEnd:xe,onTouchMove:Se,onTouchStart:be,ref:Te,...V?$:ue,...B,children:[a,fe?(0,F.jsx)(de,{ref:q,center:i,...L}):null]})});function Q(e,t,n,r=!1){return w(i=>(n&&n(i),r||e[t](i),!0))}export{N as a,M as i,z as n,ne as r,ge as t};