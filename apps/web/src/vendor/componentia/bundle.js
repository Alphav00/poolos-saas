/* @ds-bundle: {"format":4,"namespace":"Componentia","components":[{"name":"Button"},{"name":"Segmented"},{"name":"TextField"},{"name":"Select"},{"name":"Card"},{"name":"Badge"},{"name":"StatusPill"},{"name":"Alert"},{"name":"Progress"},{"name":"LoadingScreen"},{"name":"Sheet"},{"name":"TabBar"},{"name":"List"},{"name":"PlanCard"},{"name":"Hero"},{"name":"AvatarStage"},{"name":"Identity"},{"name":"Header"},{"name":"Wordmark"},{"name":"Tile"},{"name":"MetricGrid"},{"name":"DataRow"},{"name":"TreeNav"},{"name":"ThemeSwitch"},{"name":"AssistantBubble"},{"name":"TypeSpecimen"},{"name":"LevelMeter"},{"name":"Quote"},{"name":"Toast"},{"name":"ToastStack"},{"name":"TallyMarks"},{"name":"TapTempo"},{"name":"SignatureStroke"},{"name":"InkBleedReveal"},{"name":"MarkingMenu"},{"name":"RotaryDial"},{"name":"PatternLock"},{"name":"Hourglass"},{"name":"ScratchReveal"},{"name":"BalanceBeam"},{"name":"TearOffDate"},{"name":"PourMeasure"},{"name":"CompassHeading"},{"name":"DaylightArc"},{"name":"PullCord"},{"name":"CommandPalette"},{"name":"LogStream"},{"name":"KeyHints"},{"name":"SpiritLevel"},{"name":"CapsuleDraw"},{"name":"SwipeDeck"},{"name":"ComboLock"},{"name":"EtchSketch"},{"name":"BumpTip"},{"name":"HazardBand"},{"name":"CorridorView"},{"name":"Volvelle"},{"name":"TriBlend"},{"name":"StripChart"},{"name":"Abacus"},{"name":"RadioTuner"}]} */

(function(){
var R=window.React,h=R.createElement,S=R.useState;
function cx(){return Array.prototype.slice.call(arguments).filter(Boolean).join(' ')}
function initials(n){return String(n||'').split(/\s+/).filter(Boolean).slice(0,2).map(function(w){return w[0]}).join('').toUpperCase()}

function Button(p){var v=p.variant||'primary',s=p.size||'md';
  return h('button',{type:p.type||'button',className:cx('cz-btn','cz-btn-'+v,'cz-s-'+s),disabled:p.disabled||p.loading,onClick:p.onClick,'aria-busy':p.loading?'true':undefined},
    p.loading?h('span',{className:'cz-spin','aria-hidden':'true'}):null,h('span',null,p.children))}

function Segmented(p){var st=S(p.defaultValue||(p.options[0]&&p.options[0].id)),val=p.value!=null?p.value:st[0];
  function pick(id){if(p.onChange)p.onChange(id);st[1](id)}
  return h('div',{className:'cz-seg',role:'radiogroup','aria-label':p.label},p.options.map(function(o){
    return h('button',{key:o.id,type:'button',role:'radio','aria-checked':val===o.id?'true':'false',onClick:function(){pick(o.id)}},o.label)}))}

function TextField(p){var id=p.id||('cz-tf-'+String(p.label).toLowerCase().replace(/\W+/g,'-'));
  return h('div',{className:'cz-field'},h('label',{htmlFor:id},p.label),
    h('input',{id:id,className:cx('cz-input',p.variant==='offset'&&'cz-input-off'),type:p.type||'text',placeholder:p.placeholder,defaultValue:p.defaultValue,disabled:p.disabled,'aria-invalid':p.error?'true':undefined,'aria-describedby':(p.error||p.hint)?id+'-d':undefined}),
    p.error?h('div',{id:id+'-d',className:'cz-err'},h('span',null,p.error)):(p.hint?h('div',{id:id+'-d',className:'cz-hint'},p.hint):null))}

function Select(p){var id=p.id||('cz-sel-'+String(p.label).toLowerCase().replace(/\W+/g,'-'));
  return h('div',{className:'cz-field'},h('label',{htmlFor:id},p.label),
    h('div',{className:'cz-select'},h('select',{id:id,defaultValue:p.defaultValue,disabled:p.disabled},p.options.map(function(o){return h('option',{key:o.id,value:o.id},o.label)}))),
    p.hint?h('div',{className:'cz-hint'},p.hint):null)}

function Card(p){return h('article',{className:'cz-card'},
  (p.eyebrow||p.title)?h('header',{className:'cz-card-h'},p.eyebrow?h('span',{className:'cz-eyebrow'},p.eyebrow):null,p.title?h('h3',{className:'cz-card-t'},p.title):null):null,
  h('div',{className:'cz-card-b'},p.children),p.footer?h('footer',{className:'cz-card-f'},p.footer):null)}

function Badge(p){return h('span',{className:cx('cz-badge',p.tone&&'cz-badge-'+p.tone)},p.children)}

function StatusPill(p){var st=p.status||'idle';return h('span',{className:'cz-pill cz-pill-'+st,role:'status'},h('i',{'aria-hidden':'true'}),p.children)}

function Alert(p){var t=p.tone||'info',g={info:'i',ok:'✓',warn:'!',crit:'×'}[t];
  return h('div',{className:'cz-alert cz-alert-'+t,role:t==='crit'||t==='warn'?'alert':'status'},h('span',{className:'cz-alert-ic','aria-hidden':'true'},g),
    h('div',null,h('p',{className:'cz-alert-t'},p.title),p.children?h('p',{className:'cz-alert-b'},p.children):null))}

function Progress(p){var pct=Math.max(0,Math.min(100,p.value)),ms=p.milestones,meta=p.meta;
  if(typeof meta==='string')meta={start:meta};
  return h('div',{className:'cz-prog'},h('div',{className:'cz-prog-h'},h('span',null,p.label),h('span',null,Math.round(pct)+'%')),
    h('div',{className:'cz-prog-track',role:'progressbar','aria-label':p.label,'aria-valuenow':Math.round(pct),'aria-valuemin':0,'aria-valuemax':100},
      h('div',{className:cx('cz-prog-fill',p.shimmer&&pct>0&&pct<100&&'cz-prog-shim'),style:{width:pct+'%'}})),
    ms&&ms.length?h('ol',{className:'cz-prog-ms','aria-label':'Milestones'},ms.map(function(m){var v=Math.max(0,Math.min(100,m)),on=pct>=v;
      return h('li',{key:m,className:cx('cz-prog-m',on&&'cz-prog-m-on',v<=0&&'cz-prog-m-s',v>=100&&'cz-prog-m-e'),style:{left:v+'%'}},
        h('i',{'aria-hidden':'true'}),h('span',null,v+'%',h('span',{className:'cz-vh'},on?' reached':' not reached')))})):null,
    meta&&(meta.start||meta.target)?h('div',{className:'cz-prog-meta'},h('span',null,meta.start),h('span',null,meta.target)):null)}

function LoadingScreen(p){var ind=p.indicator||'ring',el;
  if(ind==='track')el=h('svg',{className:'cz-lt cz-lt-trk',viewBox:'0 0 120 60','aria-hidden':'true',focusable:'false'},
    h('rect',{className:'cz-lt-track',x:6,y:6,width:108,height:34,rx:12}),
    h('rect',{className:'cz-lt-dash',x:6,y:6,width:108,height:34,rx:12,pathLength:100}),
    h('line',{className:'cz-lt-base',x1:6,y1:52,x2:114,y2:52}));
  else if(ind==='truck'){var wheel=function(cx0){return h('g',{className:'cz-lt-wh',key:cx0},h('circle',{cx:cx0,cy:70,r:10}),h('line',{x1:cx0-6,y1:70,x2:cx0+6,y2:70}),h('line',{x1:cx0,y1:64,x2:cx0,y2:76}))};
    el=h('svg',{className:'cz-lt cz-lt-trk-v',viewBox:'0 0 200 100','aria-hidden':'true',focusable:'false'},
      h('line',{className:'cz-lt-road',x1:0,y1:86,x2:200,y2:86}),
      h('g',{className:'cz-lt-body'},
        h('rect',{className:'cz-lt-box',x:14,y:18,width:104,height:50,rx:4}),
        h('rect',{className:'cz-lt-stripe',x:14,y:50,width:104,height:6}),
        h('path',{className:'cz-lt-cab',d:'M118 30H150L170 48V68H118Z'}),
        h('path',{className:'cz-lt-win',d:'M126 36H146L158 48H126Z'}),
        h('rect',{className:'cz-lt-light',x:166,y:55,width:6,height:8}),
        h('line',{className:'cz-lt-beam',x1:176,y1:59,x2:192,y2:59}),
        wheel(42),wheel(138)))}
  else el=h('div',{className:'cz-load-ring','aria-hidden':'true'});
  return h('div',{className:'cz-load',role:'status','aria-live':'polite'},el,
  h('p',{className:'cz-load-t'},p.title||'Loading'),p.message?h('p',{className:'cz-load-m'},p.message):null)}

function Sheet(p){return h('div',{className:'cz-stage'},h('div',{className:'cz-stage-bg'},p.behind||'Page behind the sheet'),h('div',{className:'cz-scrim'}),
  h('section',{className:'cz-sheet',role:'dialog','aria-modal':'true','aria-label':p.title},h('div',{className:'cz-grab','aria-hidden':'true'}),h('h3',{className:'cz-sheet-t'},p.title),p.children))}

function TabBar(p){var st=S(p.defaultValue||p.items[0].id),val=p.value!=null?p.value:st[0];
  return h('div',{className:'cz-tabs',role:'tablist','aria-label':p.label},p.items.map(function(it){
    return h('button',{key:it.id,type:'button',role:'tab',className:'cz-tab','aria-selected':val===it.id?'true':'false',onClick:function(){if(p.onChange)p.onChange(it.id);st[1](it.id)}},h('i',{'aria-hidden':'true'}),h('span',null,it.label))}))}

function List(p){return h('ul',{className:'cz-list'},p.items.map(function(it,i){return h('li',{key:i,className:'cz-li'},
  h('div',null,h('p',{className:'cz-li-t'},it.title),it.meta?h('p',{className:'cz-li-m'},it.meta):null),it.trailing?h('div',null,it.trailing):null)}))}

function PlanCard(p){return h('section',{className:cx('cz-plan',p.featured&&'cz-plan-feat')},
  p.featured?h('span',{className:'cz-eyebrow'},'Most booked'):null,h('h3',{className:'cz-plan-n'},p.name),
  h('p',{className:'cz-plan-p'},p.price,p.period?h('small',null,' '+p.period):null),
  h('ul',null,p.features.map(function(f,i){return h('li',{key:i},f)})),p.cta||null)}

function Hero(p){return h('section',{className:'cz-hero'},p.eyebrow?h('span',{className:'cz-eyebrow'},p.eyebrow):null,h('h2',{className:'cz-hero-t'},p.title),p.lede?h('p',{className:'cz-hero-l'},p.lede):null,p.action||null)}

function AvatarStage(p){return h('figure',{className:'cz-stage-av',style:{margin:0}},h('div',{className:'cz-av-ring'},h('div',{className:'cz-av','aria-hidden':'true'},initials(p.name))),
  h('figcaption',null,h('p',{className:'cz-stage-n'},p.name),p.role?h('p',{className:'cz-stage-r'},p.role):null))}

function Identity(p){return h('div',{className:'cz-id'},h('div',{className:'cz-av','aria-hidden':'true',style:{'--s':'40px'}},initials(p.name)),
  h('div',null,h('p',{className:'cz-id-n'},p.name),p.role?h('p',{className:'cz-id-r'},p.role):null),p.status||null)}

function Header(p){return h('header',{className:'cz-head'},p.brand,h('nav',{'aria-label':'Primary'},p.links.map(function(l){return h('a',{key:l.label,href:l.href||'#',onClick:function(e){e.preventDefault()},'aria-current':l.current?'page':undefined},l.label)})),p.action||null)}

function Wordmark(p){return h('p',{className:'cz-wm',style:{'--wm':(p.size||22)+'px'}},p.children)}

function Tile(p){return h('button',{type:'button',className:'cz-tile',onClick:p.onClick},h('span',{className:'cz-tile-ic','aria-hidden':'true'},p.glyph||initials(p.title)),
  h('span',null,h('span',{className:'cz-tile-t'},p.title),p.sub?h('span',{className:'cz-tile-s'},p.sub):null))}

function MetricGrid(p){return h('dl',{className:'cz-metrics'},p.items.map(function(m){return h('div',{key:m.label,className:'cz-metric'},h('dt',null,m.label),
  h('dd',null,m.value,m.unit?h('small',null,m.unit):null),m.delta?h('span',{className:'cz-metric-d'},m.delta):null)}))}

function DataRow(p){return h('div',{className:'cz-drow'},h('span',{className:'cz-drow-l'},p.label),h('span',{className:'cz-drow-d','aria-hidden':'true'}),h('span',{className:'cz-drow-v'},p.value,p.unit?h('small',null,p.unit):null))}

function TreeNav(p){
  var secs=p.sections||[],first=secs[0]&&secs[0].items[0]&&secs[0].items[0].id;
  var sv=S(p.defaultValue!=null?p.defaultValue:first),val=p.value!=null?p.value:sv[0];
  var so=S(function(){var o={};secs.forEach(function(s,i){o[s.id]=p.defaultOpen?p.defaultOpen.indexOf(s.id)>-1:i===0});return o}),open=so[0];
  function pick(id){if(p.onChange)p.onChange(id);sv[1](id)}
  function tog(id){so[1](function(o){var n={};for(var k in o)n[k]=o[k];n[id]=!o[id];return n})}
  return h('nav',{className:'cz-tree','aria-label':p.label},secs.map(function(s){var bid='cz-tn-'+s.id,isOpen=!!open[s.id];
    return h('div',{key:s.id,className:cx('cz-tn-sec',isOpen&&'cz-open')},
      h('button',{type:'button',className:'cz-tn-head','aria-expanded':isOpen?'true':'false','aria-controls':bid,onClick:function(){tog(s.id)}},
        h('span',{className:'cz-tn-chev','aria-hidden':'true'}),h('span',null,s.label)),
      h('div',{className:'cz-tn-fold',id:bid},h('div',{className:'cz-tn-clip'},
        h('ul',{className:'cz-tn-list'},s.items.map(function(it,i){var cur=val===it.id,selIdx=-1;
          s.items.forEach(function(x,j){if(x.id===val)selIdx=j});
          return h('li',{key:it.id,className:cx(i<selIdx&&'cz-tn-before',cur&&'cz-tn-sel',i===s.items.length-1&&'cz-tn-last')},
            h('button',{type:'button',className:'cz-tn-item','aria-current':cur?'true':undefined,onClick:function(){pick(it.id)}},it.label))})))))}))}

function ThemeSwitch(p){
  var st=S(!!p.defaultChecked),on=p.checked!=null?p.checked:st[0];
  function flip(){var n=!on;if(p.onChange)p.onChange(n);st[1](n)}
  return h('button',{type:'button',role:'switch','aria-checked':on?'true':'false',className:cx('cz-ts',on&&'cz-ts-on'),onClick:flip,'aria-label':p.label||'Dark theme'},
    h('span',{className:'cz-ts-track','aria-hidden':'true'},
      h('span',{className:'cz-ts-cloud cz-ts-c1'}),h('span',{className:'cz-ts-cloud cz-ts-c2'}),
      h('span',{className:'cz-ts-star cz-ts-s1'}),h('span',{className:'cz-ts-star cz-ts-s2'}),h('span',{className:'cz-ts-star cz-ts-s3'}),
      h('span',{className:'cz-ts-knob'},h('span',{className:'cz-ts-crater cz-ts-k1'}),h('span',{className:'cz-ts-crater cz-ts-k2'}))),
    h('span',{className:'cz-ts-word'},on?'Night':'Day'))}

function AssistantBubble(p){var id=p.id||('cz-ab-'+String(p.title).toLowerCase().replace(/\W+/g,'-')),opts=p.options||[];
  return h('div',{className:'cz-ab-wrap'},
    h('section',{className:'cz-ab',role:'dialog','aria-label':p.title,'aria-describedby':id+'-m'},
      h('header',{className:'cz-ab-bar'},h('span',{className:'cz-ab-dot','aria-hidden':'true'}),h('h3',{className:'cz-ab-t'},p.title),
        h('button',{type:'button',className:'cz-ab-x','aria-label':p.closeLabel||'Close',onClick:p.onClose},h('span',{'aria-hidden':'true'},'×'))),
      h('div',{className:'cz-ab-b'},h('p',{id:id+'-m',className:'cz-ab-m'},p.children),p.prompt?h('p',{className:'cz-ab-p'},p.prompt):null,
        opts.length?h('ul',{className:'cz-ab-o'},opts.map(function(o){return h('li',{key:o.id},h('button',{type:'button',className:'cz-ab-opt',onClick:function(){if(p.onSelect)p.onSelect(o.id)}},o.label))})):null)),
    p.anchor?h(R.Fragment,null,h('span',{className:'cz-ab-tail','aria-hidden':'true'}),h('div',{className:'cz-ab-anchor'},p.anchor)):null)}

var TS_FAM={marcellus:'"Marcellus SC","Trajan Pro",Georgia,serif',archivo:'Archivo,system-ui,sans-serif',redhat:'"Red Hat Mono",ui-monospace,monospace',rye:'Rye,Rockwell,Georgia,serif',poppins:'Poppins,"Helvetica Neue",Arial,sans-serif',courier:'"Courier Prime","Courier New",monospace',cinzel:'Cinzel,"Trajan Pro",Georgia,serif',hanken:'"Hanken Grotesk",system-ui,sans-serif',plex:'"IBM Plex Mono",ui-monospace,monospace'};
var TS_COPY={display:'Pool day',title:'Tuesday route',heading:'Chlorine is low',body:'Two stops moved to Thursday. The crew tests the water on arrival.',small:'Updated 8:40 am by Dana',eyebrow:'Next visit',mono:'pH 7.4 · 3.1 ppm'};
function tsSrc(role,name,fam,px,lh,w,ls,copy,up){return {role:role,name:name,fam:fam,px:px,lh:lh,w:w,ls:ls,copy:copy,up:up,src:true}}
var TS_SRC={
 bluedevil:[tsSrc('display-xl','bd-display-xl','rye',72,'1.02',400,0,'display'),tsSrc('display','bd-display','rye',44,'1.06',400,0,'display'),tsSrc('title','bd-title','rye',28,'1.15',400,0,'title'),tsSrc('wordmark','bd-wordmark','rye',22,'1',400,0,'display'),tsSrc('lede','bd-lede','poppins',20,'1.4',500,0,'body'),tsSrc('state-name','bd-state-name','poppins',22,'1.25',700,0,'heading'),tsSrc('cta','bd-cta','poppins',17,'1.1',700,0,'heading'),tsSrc('body','bd-body','poppins',16,'1.5',400,0,'body'),tsSrc('value','bd-value','poppins',24,'1.1',800,0,'mono'),tsSrc('small','bd-small','poppins',14,'1.4',600,0,'small'),tsSrc('eyebrow','bd-eyebrow','courier',13,'1.3',700,'1.5px','eyebrow',1),tsSrc('label','bd-label','courier',12,'1.3',700,'2px','eyebrow',1),tsSrc('fine','bd-fine','courier',11,'1.45',400,'0.6px','small')],
 metis:[tsSrc('display-xl','metis-display-xl','cinzel',40,'48px',800,'0.04em','display'),tsSrc('display-l','metis-display-l','cinzel',30,'36px',800,'0.04em','display'),tsSrc('title','metis-title','cinzel',22,'28px',700,'0.04em','title'),tsSrc('heading','metis-heading','hanken',20,'28px',600,0,'heading'),tsSrc('body','metis-body','hanken',16,'24px',400,0,'body'),tsSrc('body-sm','metis-body-sm','hanken',14,'20px',400,0,'small'),tsSrc('quote','metis-quote','hanken',18,'28px',400,0,'body'),tsSrc('label','metis-label','plex',11,'16px',500,'0.08em','eyebrow',1),tsSrc('code','metis-code','plex',13,'20px',400,0,'mono')],
 smpools:[tsSrc('display-xl','sm-display-xl','poppins',56,'60px',800,'-0.5px','display'),tsSrc('display','sm-display','poppins',36,'42px',800,0,'title'),tsSrc('eyebrow','sm-eyebrow','poppins',14,'20px',700,'4px','eyebrow',1),tsSrc('heading','sm-heading','poppins',20,'28px',700,0,'heading'),tsSrc('body-lg','sm-body-lg','poppins',18,'28px',400,0,'body'),tsSrc('body','sm-body','poppins',16,'24px',400,0,'body'),tsSrc('caption','sm-caption','poppins',13,'18px',400,0,'small'),tsSrc('plan-lede','sm-plan-lede','courier',16,'24px',700,0,'mono'),tsSrc('plan-detail','sm-plan-detail','courier',15,'22px',400,0,'mono')]
};
function tsComp(theme){var ch=theme==='cheese';return [
 {role:'display',name:'.cz-hero-t',css:'var(--cz-fd)',px:30,lh:'1.05',w:'var(--cz-dw)',ls:'var(--cz-dtrack)',copy:'display'},
 {role:'title',name:'.cz-card-t',css:'var(--cz-fd)',px:20,lh:'1.15',w:'var(--cz-dw)',ls:'var(--cz-dtrack)',copy:'title'},
 {role:'heading',name:'.cz-tile-t',css:'var(--cz-fs)',px:15,lh:'1.45',w:700,copy:'heading'},
 {role:'body',name:'.cz-ground',css:'var(--cz-fs)',px:15,lh:'1.45',w:400,copy:'body'},
 {role:'small',name:'.cz-hint',css:'var(--cz-fs)',px:13,lh:'1.45',w:400,copy:'small'},
 {role:'eyebrow',name:'.cz-eyebrow',css:'var(--cz-fm)',px:ch?9:11,lh:ch?'1.6':'1.45',w:400,ls:ch?'.04em':'.12em',copy:'eyebrow',up:1},
 {role:'mono',name:'.cz-drow-v',css:'var(--cz-fm)',px:ch?10:15,lh:'1.45',w:700,copy:'mono'}]}
var TS_PARA='The crew arrives between nine and eleven, tests the water and logs pH and chlorine. If a reading is off, you get a message.';
var TS_CFG={
 olympus:{brand:'Olympus',hp:60,glyph:'Aa',v:'center',use:'Marcellus SC sets hero titles and card headings; Archivo carries everything you read.',w:[400,500,600,700,800],m:{head:'display',lede:'body',label:'eyebrow',big:'display',small:'small',cta:'heading'},num:'mono',para:'The pass opens at first light. Carry water, rest at the third cairn and sign the log at the summit before the afternoon wind builds.'},
 bluedevil:{brand:'Blue Devil Pools',hp:72,glyph:'Aa',v:'left',use:'Rye sets hero numerals, splash headings and the wordmark; Poppins carries the interface.',w:[400,500,600,700,800],m:{head:'title',lede:'lede',label:'label',big:'value',small:'small',cta:'cta'},num:'value'},
 metis:{brand:'Mētis Rehak',hp:56,glyph:'Aa',v:'center',use:'Cinzel carries titles and display lines; Hanken Grotesk sets reading text.',w:[400,500,600],m:{head:'title',lede:'quote',label:'label',big:'display-l',small:'body-sm',cta:'body-sm'},num:'code'},
 poolos:{brand:'PoolOS',hp:76,glyph:'Aa',v:'sticker',use:'Nunito carries every role, weight 800 for display and 400 for reading.',w:[400,600,700,800],m:{head:'display',lede:'body',label:'eyebrow',big:'display',small:'small',cta:'heading'},num:'mono'},
 smpools:{brand:'S&M Pools',hp:72,glyph:'&',v:'left',use:'Poppins 800 sets display lines, Courier Prime sets plan details, and Great Vibes names the service tiers.',w:[400,500,600,700,800],m:{head:'display',lede:'body-lg',label:'eyebrow',big:'display-xl',small:'caption',cta:'heading'},num:'plan-lede',tier:'Premium'},
 cheese:{brand:'Cheese Studio',hp:64,glyph:'Aa',v:'sticker',use:'Sedgwick Ave Display sets titles; Baloo 2 reads; Press Start 2P marks values and labels.',w:[400,500,600,700],m:{head:'display',lede:'body',label:'eyebrow',big:'display',small:'small',cta:'heading'},num:'mono'},
 saltmischief:{brand:'Salt & Mischief',hp:56,glyph:'&',v:'left',use:'Rye sets display lines and titles; Poppins reads; Courier Prime marks values.',w:[400,500,600,700,800],m:{head:'display',lede:'body',label:'eyebrow',big:'display',small:'small',cta:'heading'},num:'mono'}
};
function tsStyle(r){var s={margin:0,fontSize:r.px+'px',lineHeight:r.lh,textTransform:r.up?'uppercase':'none',fontFamily:r.src?TS_FAM[r.fam]:r.css,fontWeight:r.w};if(r.ls)s.letterSpacing=r.ls;return s}
function tsFind(rows,k){for(var i=0;i<rows.length;i++)if(rows[i].role===k)return rows[i];return rows[0]}
function TsCap(p){return h('p',{className:'cz-tsp-cap'},p.children)}
function TsFace(p){var ref=R.useRef(null),st=S(''),setN=st[1];
  R.useEffect(function(){var e=ref.current;if(e)setN(getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g,'').trim())},[]);
  return h('div',{className:'cz-tsp-face'},h('p',{ref:ref,style:p.style},p.children),h('p',{className:'cz-tsp-meta'},h('b',null,st[0]||'…'),h('span',null,p.note)))}
function TsRow(p){var r=p.r,ref=R.useRef(null),st=S(null),setS=st[1],g=st[0];
  R.useEffect(function(){function m(){var e=ref.current;if(!e)return;var c=getComputedStyle(e),lh=parseFloat(c.lineHeight);
    setS({w:c.fontWeight,lines:lh>0?Math.round(e.getBoundingClientRect().height/lh):1})}
    m();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(m);window.addEventListener('resize',m);return function(){window.removeEventListener('resize',m)}},[]);
  var w=r.src?r.w:(g?g.w:'…'),multi=g&&g.lines>1;
  return h('div',{className:'cz-tsp-row'},h('p',{ref:ref,style:tsStyle(r)},p.text),
    h('p',{className:'cz-tsp-meta'},h('i',{className:'cz-tsp-rule',style:{width:Math.min(r.px,72)+'px'},'aria-hidden':'true'}),h('b',null,r.role),h('span',null,r.px+'px / '+r.lh+' / '+w),
      h('em',null,r.src?'source':'component'),multi?h('em',null,'wraps to '+g.lines+' lines'):null))}
function TsPara(p){var ref=R.useRef(null),st=S(null),setS=st[1];
  R.useEffect(function(){function m(){var e=ref.current;if(!e)return;var lh=parseFloat(getComputedStyle(e).lineHeight),n=lh>0?Math.round(e.getBoundingClientRect().height/lh):0,a=e.closest('.cz-tsp'),pw=a?Math.round(a.getBoundingClientRect().width):0;if(n)setS({n:n,cpl:Math.round(p.text.length/n),w:pw})}
    m();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(m);window.addEventListener('resize',m);return function(){window.removeEventListener('resize',m)}},[]);
  return h('div',null,h('p',{ref:ref,style:p.style},p.text),h('p',{className:'cz-tsp-meta'},h('span',null,st[0]?('about '+st[0].cpl+' characters a line, '+st[0].n+' lines at '+st[0].w+' px wide'):'measuring')))}
function TypeSpecimen(p){var t=p.theme,cfg=TS_CFG[t],rows=TS_SRC[t]||tsComp(t),src=!!TS_SRC[t],name=p.name||cfg.brand,
  sty=function(k){return tsStyle(tsFind(rows,cfg.m[k]))},bodyR=tsFind(rows,'body'),numR=tsFind(rows,cfg.num);
  var lines=cfg.brand.split(' ');
  return h('article',{className:cx('cz-tsp','cz-tsp-v-'+cfg.v),'data-theme':t,'aria-label':name+' type specimen'},
    h('div',{className:'cz-tsp-bar','aria-hidden':'true'},h('span',null,'9:41'),h('span',null,'5G 100%')),
    h('header',{className:'cz-tsp-hero'},h('div',{className:'cz-tsp-glyph','aria-hidden':'true'},cfg.glyph),
      h('h3',{className:'cz-tsp-word',style:{fontSize:cfg.hp+'px'}},cfg.brand),
      h(TsFace,{style:{margin:0,fontFamily:'var(--cz-fd)',fontWeight:'var(--cz-dw)',fontSize:'18px',letterSpacing:'var(--cz-dtrack)'},note:'display face'},'The quick pool crew'),
      h('p',{className:'cz-tsp-use'},cfg.use),h('p',{className:'cz-tsp-meta'},h('span',null,'Hero set at '+cfg.hp+' px, larger than any role below.'))),
    h('section',{className:'cz-tsp-sec'},h(TsCap,null,'Pairing'),
      h(TsFace,{style:{margin:0,fontFamily:'var(--cz-fd)',fontWeight:'var(--cz-dw)',fontSize:'34px',lineHeight:1.1,letterSpacing:'var(--cz-dtrack)'},note:'display'},'Pool day'),
      h(TsFace,{style:{margin:0,fontFamily:'var(--cz-fs)',fontWeight:400,fontSize:'18px',lineHeight:1.4},note:'body'},'The crew tests the water on arrival.'),
      h(TsFace,{style:{margin:0,fontFamily:'var(--cz-fm)',fontWeight:700,fontSize:t==='cheese'?'12px':'17px',lineHeight:1.4},note:'mono'},'pH 7.4 · 3.1 ppm'),
      cfg.tier?h('div',{className:'cz-tsp-face'},h('p',{style:{margin:0,fontFamily:'"Great Vibes",cursive',fontSize:'34px',lineHeight:1.2}},cfg.tier+' tier'),h('p',{className:'cz-tsp-meta'},h('b',null,'Great Vibes'),h('span',null,'tier names; shipped in fonts/, no family key in tokens.json'))):null),
    h('section',{className:'cz-tsp-sec'},h(TsCap,null,'Scale on a phone'),
      rows.map(function(r,i){return h(TsRow,{key:t+i,r:r,text:r.copy==='display'?cfg.brand:TS_COPY[r.copy]})})),
    h('section',{className:'cz-tsp-sec'},h(TsCap,null,'Weights of the body face'),
      cfg.w.map(function(w){return h('div',{key:w,className:'cz-tsp-wt'},h('p',{style:{margin:0,fontFamily:'var(--cz-fs)',fontWeight:w,fontSize:'24px',lineHeight:1.2}},'Chlorine 7.4'),h('p',{className:'cz-tsp-meta'},h('b',null,w)))})),
    h('section',{className:'cz-tsp-sec'},h(TsCap,null,'Glyphs'),
      h('p',{className:'cz-tsp-gl',style:{fontFamily:'var(--cz-fd)',fontWeight:'var(--cz-dw)',letterSpacing:'var(--cz-dtrack)'}},'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 & ? ! @ # % ( ) $ . , ; : —'),
      h('p',{className:'cz-tsp-num',style:Object.assign(tsStyle(numR),{fontVariantNumeric:'tabular-nums',letterSpacing:'.08em',textTransform:'none'})},'0123456789'),
      h('p',{className:'cz-tsp-num',style:Object.assign(tsStyle(numR),{fontVariantNumeric:'tabular-nums',textTransform:'none'})},'7.4 · 3.1 · 12.8 · 0.0')),
    h('section',{className:'cz-tsp-sec'},h(TsCap,null,'In use'),
      h('div',{className:'cz-tsp-mo'},
        cfg.tier?h('p',{style:{margin:0,fontFamily:'"Great Vibes",cursive',fontSize:'30px',lineHeight:1.1}},cfg.tier+' tier'):null,
        h('p',{style:sty('head')},'Tuesday route'),
        h('p',{style:sty('lede')},'Two stops moved to Thursday. The crew tests the water on arrival.'),
        h('div',{className:'cz-tsp-read'},h('span',{className:'cz-tsp-chip',style:sty('label')},'pH'),h('p',{style:sty('big')},'7.4'),h('p',{style:sty('small')},'Pool 2, in range. Tested at 8:40.')),
        h('button',{type:'button',className:'cz-btn cz-btn-primary',style:sty('cta')},'Confirm route'))),
    h('section',{className:'cz-tsp-sec'},h(TsCap,null,'Reading measure'),
      h(TsPara,{style:tsStyle(bodyR),text:cfg.para||TS_PARA})))}

function Matrix(p){return h('div',{className:'cz-matrix'},p.themes.map(function(t){var c=p.cells[t.id]||{};
  var tag=c.kind==='NATIVE'?'native · '+c.source:(c.kind==='DERIVED'?'derived':c.kind||'');
  return h('figure',{key:t.id,className:'cz-lane'},h('figcaption',{className:'cz-lane-cap'},h('span',null,t.name),h('span',{className:'cz-tag'},tag)),
    h('div',{className:cx('cz-ground',p.ground==='page'&&'cz-ground-page'),'data-theme':t.id},p.render(t.id)))}))}

window.Componentia={Button:Button,Segmented:Segmented,TextField:TextField,Select:Select,Card:Card,Badge:Badge,StatusPill:StatusPill,Alert:Alert,Progress:Progress,LoadingScreen:LoadingScreen,Sheet:Sheet,TabBar:TabBar,List:List,PlanCard:PlanCard,Hero:Hero,AvatarStage:AvatarStage,Identity:Identity,Header:Header,Wordmark:Wordmark,Tile:Tile,MetricGrid:MetricGrid,DataRow:DataRow,TreeNav:TreeNav,ThemeSwitch:ThemeSwitch,AssistantBubble:AssistantBubble,TypeSpecimen:TypeSpecimen,_Matrix:Matrix};
})();

/* Componentia LevelMeter — forge_20261019T1259Z. Credit: Role from Bassline VerdictMeter (Chi); Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
var LIT={high:4,mid:2,none:0},WORD={high:'Viable',mid:'Weak',none:'Dead'};
function LevelMeter(p){var lv=LIT.hasOwnProperty(p.level)?p.level:'none',lit=LIT[lv],word=p.word||WORD[lv],scope=p.scope||'';
  var segs=[];for(var i=0;i<5;i++)segs.push(h('span',{key:i,className:'cz-lm-seg'+(i<lit?' cz-lm-on':''),'aria-hidden':'true'}));
  return h('div',{className:'cz-lm cz-lm-'+lv,role:'meter','aria-label':scope||undefined,'aria-valuemin':0,'aria-valuemax':5,'aria-valuenow':lit,'aria-valuetext':(scope?scope+': ':'')+word+', '+lit+' of 5'},
    scope?h('span',{className:'cz-lm-scope','aria-hidden':'true'},scope):null,
    h('span',{className:'cz-lm-house','aria-hidden':'true'},segs),
    h('span',{className:'cz-lm-word','aria-hidden':'true'},word))}
window.Componentia.LevelMeter=LevelMeter;})();

/* Componentia Quote — forge_20261019T1259Z. Credit: Role from Bassline HerWords (Chi); Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
function Quote(p){var d=p.date?String(p.date):'',iso=/^\d{4}-\d{2}(-\d{2})?/.test(d)?d.slice(0,10):undefined,cap=[];
  if(p.by)cap.push(h('span',{key:'b',className:'cz-qt-by'},p.by));
  if(p.by&&d)cap.push(h('span',{key:'s','aria-hidden':'true'},' · '));
  if(d)cap.push(h('time',{key:'t',dateTime:iso},d));
  if(p.cite)cap.push(h('a',{key:'c',className:'cz-qt-src',href:p.cite},'Source'));
  return h('figure',{className:'cz-qt'},
    h('blockquote',{className:'cz-qt-q',cite:p.cite||undefined},h('p',null,h('span',{className:'cz-qt-mark','aria-hidden':'true'},'“'),p.children)),
    cap.length?h('figcaption',{className:'cz-qt-cap'},cap):null)}
window.Componentia.Quote=Quote;})();

/* Componentia Toast — forge_20261019T1259Z. Credit: Role and anatomy from Olympus Toast (Chi); Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
function Toast(p){var err=p.kind==='error';
  return h('div',{className:'cz-tst cz-tst-'+(err?'error':'ok')},
    h('span',{className:'cz-tst-glyph','aria-hidden':'true'},err?'×':'✓'),
    h('span',{className:'cz-tst-text'},err?h('span',{className:'cz-vh'},'Error: '):null,p.text),
    typeof p.undo==='function'?h('button',{type:'button',className:'cz-btn cz-btn-ghost cz-tst-undo',onClick:p.undo},'Undo'):null)}
function ToastStack(p){var list=p.toasts||[];
  return h('div',{className:'cz-tst-stack'+(p.inline?' cz-tst-inline':''),role:'status','aria-live':'polite'},
    list.map(function(t){return h(Toast,{key:t.id,kind:t.kind,text:t.text,undo:t.undo})}))}
window.Componentia.Toast=Toast;window.Componentia.ToastStack=ToastStack;})();

/* Componentia TallyMarks — forge_20261019T1259Z. Credit: idea from the five-bar-gate tally, a public-domain counting convention (https://unicode.org/L2/L2016/16065-tally-marks.pdf); Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
var WORDS=['no','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
function word(n){return n<WORDS.length?WORDS[n]:String(n)}
function tallyText(n){var g=Math.floor(n/5),r=n%5;if(n<=0)return '0: no marks';
  var parts=[];if(g)parts.push(word(g)+(g===1?' gate':' gates'));if(r)parts.push(word(r));
  return n+': '+parts.join(' and ')}
/* deterministic jitter in [-1,1], seeded by stroke index */
function jit(i,k){var x=Math.sin((i+1)*12.9898+k*78.233)*43758.5453;return (x-Math.floor(x))*2-1}
function strokePath(i){var p=i%5,d;
  if(p<4){var x=7+p*8;d='M'+(x+jit(i,1)*1.2).toFixed(2)+' '+(5+jit(i,2)*1.5).toFixed(2)+' L'+(x+jit(i,3)*1.6).toFixed(2)+' '+(35+jit(i,4)*1.2).toFixed(2)}
  else d='M'+(2+jit(i,1)).toFixed(2)+' '+(29+jit(i,2)*1.5).toFixed(2)+' L'+(38+jit(i,3)).toFixed(2)+' '+(10+jit(i,4)*1.5).toFixed(2);
  return d}
function TallyMarks(p){var min=p.min!=null?p.min:0,max=p.max!=null?p.max:25;
  function clamp(v){return Math.max(min,Math.min(max,Math.round(v)))}
  var st=S(clamp(p.defaultValue!=null?p.defaultValue:min)),val=p.value!=null?clamp(p.value):st[0];
  var an=S(-1),anim=an[0];
  function set(v){v=clamp(v);if(v===val)return;an[1](v>val?v-1:-1);st[1](v);if(p.onChange)p.onChange(v)}
  function key(e){var k=e.key,d=null;
    if(k==='ArrowUp'||k==='ArrowRight')d=val+1;else if(k==='ArrowDown'||k==='ArrowLeft')d=val-1;
    else if(k==='Home')d=min;else if(k==='End')d=max;else if(k==='PageUp')d=val+5;else if(k==='PageDown')d=val-5;
    if(d!==null){e.preventDefault();set(d)}}
  var gates=[],n=val;for(var g=0;g*5<n;g++){var s=[];
    for(var j=g*5;j<Math.min(n,g*5+5);j++)s.push(h('path',{key:j+(j===anim?'-n':''),d:strokePath(j),pathLength:1,className:j===anim?'cz-tly-new':null}));
    gates.push(h('svg',{key:g,className:'cz-tly-gate',viewBox:'0 0 40 40',width:40,height:40,'aria-hidden':'true',focusable:'false'},s))}
  return h('div',{className:'cz-tly'},
    h('div',{className:'cz-tly-h'},h('span',{className:'cz-tly-lb'},p.label),h('span',{className:'cz-tly-num','aria-hidden':'true'},val)),
    h('div',{className:'cz-tly-marks',role:'spinbutton',tabIndex:0,'aria-label':p.label,'aria-valuenow':val,'aria-valuemin':min,'aria-valuemax':max,'aria-valuetext':tallyText(val),onKeyDown:key},
      n>0?gates:h('span',{className:'cz-tly-empty','aria-hidden':'true'},'No marks yet')),
    h('div',{className:'cz-tly-ctl'},
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-tly-b','aria-label':'Remove one',disabled:val<=min,onClick:function(){set(val-1)}},'−'),
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-tly-b','aria-label':'Add one',disabled:val>=max,onClick:function(){set(val+1)}},'+')))}
window.Componentia.TallyMarks=TallyMarks;})();

/* Componentia TapTempo — forge_20261019T1259Z. Credit: idea after tap-tempo controls such as yannxou/TapTempoButton (https://swiftpackageregistry.com/yannxou/TapTempoButton); no code used. Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
function TapTempo(p){var unit=p.unit||'bpm',min=p.min!=null?p.min:30,max=p.max!=null?p.max:300,id=R.useId();
  function clamp(v){return Math.max(min,Math.min(max,Math.round(v)))}
  var init=p.defaultValue!=null?clamp(p.defaultValue):null;
  var vs=S(init),val=vs[0];
  var ts=S([]),taps=ts[0];
  var ds=S(init!=null?String(init):''),draft=ds[0];
  var ls=S(''),pulse=S(0);
  function commit(v,announce){vs[1](v);ds[1](v!=null?String(v):'');if(announce&&v!=null)ls[1](v+' '+unit);if(p.onChange)p.onChange(v)}
  function tap(){var now=performance.now(),t=taps.slice();
    if(t.length&&now-t[t.length-1]>2000)t=[];
    t.push(now);if(t.length>7)t=t.slice(-7);ts[1](t);pulse[1](function(x){return x+1});
    if(t.length>=3){var sum=0;for(var i=1;i<t.length;i++)sum+=t[i]-t[i-1];
      var v=clamp(60000/(sum/(t.length-1)));if(v!==val)commit(v,true)}}
  function onKey(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)tap()}}
  function onType(e){var s=e.target.value;ds[1](s);var n=Number(s);
    if(s.trim()!==''&&isFinite(n)&&n>=min&&n<=max){n=Math.round(n);vs[1](n);if(p.onChange)p.onChange(n)}}
  function reset(){ts[1]([]);ls[1]('');commit(null,false)}
  var ivs=[];for(var i=1;i<taps.length;i++)ivs.push(taps[i]-taps[i-1]);
  var tot=0;ivs.forEach(function(x){tot+=x});
  var ticks=[],x=4;if(taps.length){ticks.push(x);ivs.forEach(function(d){x+=tot?d/tot*192:0;ticks.push(x)})}
  var hint=taps.length>0&&taps.length<3?'Tap '+(3-taps.length)+' more time'+(3-taps.length===1?'':'s'):(val==null?'Tap at least 3 times':null);
  return h('div',{className:'cz-tt',role:'group','aria-labelledby':id+'l'},
    h('div',{className:'cz-tt-h'},h('span',{id:id+'l',className:'cz-tt-lb'},p.label),
      h('span',{className:'cz-tt-read'},h('b',{className:'cz-tt-num'},val!=null?val:'—'),h('span',{className:'cz-tt-unit'},unit))),
    h('button',{type:'button',className:'cz-tt-pad'+(pulse[0]?(pulse[0]%2?' cz-tt-p1':' cz-tt-p2'):''),'aria-describedby':id+'h',onPointerDown:function(e){if(e.button===0||e.pointerType!=='mouse')tap()},onKeyDown:onKey},'Tap'),
    h('svg',{className:'cz-tt-strip',viewBox:'0 0 200 20',preserveAspectRatio:'none','aria-hidden':'true',focusable:'false'},
      h('line',{x1:0,y1:19,x2:200,y2:19,className:'cz-tt-base'}),
      ticks.map(function(t,i){return h('line',{key:i,x1:t,y1:3,x2:t,y2:19,className:'cz-tt-tick'})})),
    h('p',{id:id+'h',className:'cz-tt-hint'},hint||'Tap the pad in time, or type a rate'),
    h('div',{className:'cz-vh','aria-live':'polite'},ls[0]),
    h('div',{className:'cz-tt-row'},
      h('div',{className:'cz-field cz-tt-f'},h('label',{htmlFor:id+'i'},p.label+', typed'),
        h('input',{id:id+'i',className:'cz-input',type:'number',inputMode:'numeric',min:min,max:max,step:1,value:draft,onChange:onType,onBlur:function(){ds[1](val!=null?String(val):'')}})),
      h('button',{type:'button',className:'cz-btn cz-btn-ghost cz-tt-reset',onClick:reset},'Reset')))}
window.Componentia.TapTempo=TapTempo;})();

/* Componentia SignatureStroke — forge_20261019T1259Z. Credit: idea after signature pads such as react-signature-canvas (BSD, canvas-based; not used). Componentia original SVG code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
var seq=0;
function parse(str){if(!str)return [];return String(str).trim().split(/\s+/).map(function(pr){var a=pr.split(',');return [+a[0],+a[1]]}).filter(function(q){return isFinite(q[0])&&isFinite(q[1])})}
function len(strokes){var L=0;strokes.forEach(function(s){for(var i=1;i<s.length;i++){L+=Math.hypot(s[i][0]-s[i-1][0],s[i][1]-s[i-1][1])}});return L}
function ptsStr(s){return s.map(function(q){return Math.round(q[0]*10)/10+','+Math.round(q[1]*10)/10}).join(' ')}
var TYPED=/^\p{L}{1,4}$/u;
function SignatureStroke(p){
  var idr=R.useRef(null);if(idr.current==null){seq+=1;idr.current='cz-sig-'+seq}var id=idr.current;
  var st=S(function(){var d=parse(p.defaultPath);return d.length?[d]:[]}),strokes=st[0],setStrokes=st[1];
  var ty=S(''),typed=ty[0],setTyped=ty[1];
  var cf=S(!!p.defaultConfirmed),confirmed=cf[0],setConfirmed=cf[1];
  var drawing=R.useRef(false),padRef=R.useRef(null);
  var L=len(strokes),drawnOk=L>=40,typedOk=TYPED.test(typed.trim()),ready=drawnOk||typedOk;
  function local(e){var r=padRef.current.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]}
  function down(e){if(confirmed||(e.button!=null&&e.button>0))return;e.preventDefault();
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    drawing.current=true;var q=local(e);setStrokes(function(a){return a.concat([[q]])})}
  function move(e){if(!drawing.current)return;var q=local(e);
    setStrokes(function(a){var last=a[a.length-1],pr=last[last.length-1];if(Math.hypot(q[0]-pr[0],q[1]-pr[1])<1.5)return a;
      var n=a.slice(0,-1);n.push(last.concat([q]));return n})}
  function up(){drawing.current=false}
  function clear(){if(confirmed)return;setStrokes([]);setTyped('')}
  function key(e){if(e.key==='Escape'){e.preventDefault();clear()}}
  function confirm(){if(!ready||confirmed)return;setConfirmed(true);
    if(p.onConfirm){if(drawnOk)p.onConfirm('drawn',strokes.map(ptsStr));else p.onConfirm('typed',typed.trim())}}
  var hasInk=strokes.some(function(s){return s.length>1});
  var padLabel='Signature pad, '+(hasInk?'initials drawn':'empty')+(confirmed?', confirmed':'')+'. Draw with a pointer; press Escape to clear.';
  return h('div',{className:'cz-sig',role:'group','aria-labelledby':id+'-l'},
    h('div',{id:id+'-l',className:'cz-sig-label'},p.label),
    h('svg',{ref:padRef,className:'cz-sig-pad',role:'img','aria-label':padLabel,tabIndex:confirmed?-1:0,
      onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up,onLostPointerCapture:up,onKeyDown:key,'data-confirmed':confirmed?'true':undefined},
      h('line',{className:'cz-sig-base',x1:'6%',x2:'94%',y1:92,y2:92}),
      h('text',{className:'cz-sig-x',x:'6%',y:86,'aria-hidden':'true'},'×'),
      strokes.map(function(s,i){return s.length>1?h('polyline',{key:i,className:'cz-sig-ink',points:ptsStr(s)}):
        h('circle',{key:i,className:'cz-sig-dot',cx:s[0][0],cy:s[0][1],r:1.6})})),
    confirmed?null:h('div',{className:'cz-field cz-sig-typed'},
      h('label',{htmlFor:id+'-t'},'Or type your initials'),
      h('input',{id:id+'-t',className:'cz-input',type:'text',autoComplete:'off',maxLength:4,value:typed,
        'aria-describedby':id+'-h',onChange:function(e){setTyped(e.target.value)}}),
      h('div',{id:id+'-h',className:'cz-hint'},'1 to 4 letters.')),
    confirmed?h('p',{className:'cz-sig-done',role:'status'},h('span',{className:'cz-sig-tick','aria-hidden':'true'},'✓'),h('span',null,'Confirmed')):
      h('div',{className:'cz-row cz-sig-actions'},
        h('button',{type:'button',className:'cz-btn cz-btn-primary',disabled:!ready,onClick:confirm},p.confirmLabel||'Confirm'),
        h('button',{type:'button',className:'cz-btn cz-btn-ghost',onClick:clear},'Clear')))}
window.Componentia.SignatureStroke=SignatureStroke;})();

/* Componentia InkBleedReveal — forge_20261019T1259Z. Credit: idea after SVG text-distortion techniques described by Henry (henry.codes, "How to distort text with SVG"; no licence stated, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
var seq=0,MAX=7,DUR=220;
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function InkBleedReveal(p){
  var idr=R.useRef(null);if(idr.current==null){seq+=1;idr.current='cz-ink-f'+seq}var fid=idr.current;
  var mode=p.mode==='toggle'?'toggle':'hold',label=p.label||'Hidden text';
  var st=S(!!p.defaultRevealed),open=st[0],setOpen=st[1];
  var disp=R.useRef(null),raf=R.useRef(0),cur=R.useRef(open?0:MAX),init=R.useRef(cur.current);
  R.useEffect(function(){var el=disp.current;if(!el)return;var to=open?0:MAX;cancelAnimationFrame(raf.current);
    if(reduced()){cur.current=to;el.setAttribute('scale',to);return}
    var from=cur.current,t0=performance.now();
    function step(t){var k=Math.min(1,(t-t0)/DUR),v=from+(to-from)*k;cur.current=v;el.setAttribute('scale',v.toFixed(2));if(k<1)raf.current=requestAnimationFrame(step)}
    raf.current=requestAnimationFrame(step);return function(){cancelAnimationFrame(raf.current)}},[open]);
  function kd(e){if(e.key==='Enter'){e.preventDefault();setOpen(function(o){return !o})}
    else if(e.key===' '&&mode==='hold'){e.preventDefault();if(!e.repeat)setOpen(true)}}
  function ku(e){if(e.key===' '&&mode==='hold'){e.preventDefault();setOpen(false)}}
  function pd(e){if(mode!=='hold'||(e.button!=null&&e.button>0))return;try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}setOpen(true)}
  function pu(){if(mode==='hold')setOpen(false)}
  function click(){if(mode==='toggle')setOpen(function(o){return !o})}
  var verb=mode==='hold'?'hold to reveal':'press to reveal';
  return h('button',{type:'button',className:'cz-ink','data-open':open?'true':'false','aria-pressed':open?'true':'false',
      'aria-label':open?undefined:label+', '+verb,
      onKeyDown:kd,onKeyUp:ku,onPointerDown:pd,onPointerUp:pu,onPointerCancel:pu,onBlur:function(){if(mode==='hold')setOpen(false)},onClick:click,
      onContextMenu:function(e){if(mode==='hold')e.preventDefault()}},
    open?h('span',{className:'cz-ink-sr'},label+': '):null,
    h('span',{className:'cz-ink-txt','aria-hidden':open?undefined:'true'},p.children),
    h('span',{className:'cz-ink-bar','aria-hidden':'true',style:{filter:'url(#'+fid+')'}}),
    h('svg',{className:'cz-ink-defs','aria-hidden':'true',focusable:'false',width:0,height:0},
      h('filter',{id:fid,x:'-20%',y:'-40%',width:'140%',height:'180%'},
        h('feTurbulence',{type:'fractalNoise',baseFrequency:'0.09 0.35',numOctaves:2,seed:(+fid.slice(8))%9+1,result:'n'}),
        h('feDisplacementMap',{ref:disp,in:'SourceGraphic',in2:'n',scale:init.current,xChannelSelector:'R',yChannelSelector:'G'}))))}
window.Componentia.InkBleedReveal=InkBleedReveal;})();

/* Componentia MarkingMenu — forge_20261019T1259Z. Credit: idea from marking menus (Kurtenbach & Buxton); interaction after QuentinRoy/Marking-Menu (https://github.com/QuentinRoy/Marking-Menu, MIT per repo page; LICENSE file not read; no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
var seq=0,D=212,C=106,RO=104,RI=34,RM=70,HOLD=300,FLICK=40;
var DIRS=['N','E','S','W','NE','SE','SW','NW'],ANG={N:-90,NE:-45,E:0,SE:45,S:90,SW:135,W:180,NW:-135};
var KEYDIR={ArrowUp:'N',ArrowRight:'E',ArrowDown:'S',ArrowLeft:'W'};
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function norm(a){a=a%360;if(a<0)a+=360;return a}
function delta(a,b){var d=norm(b-a);return d>180?d-360:d}
function pt(a,r){var t=a*Math.PI/180;return [C+r*Math.cos(t),C+r*Math.sin(t)]}
function sector(a,w){var g=1.2,a0=a-w+g,a1=a+w-g,p0=pt(a0,RO),p1=pt(a1,RO),q1=pt(a1,RI),q0=pt(a0,RI),big=(2*w-2*g)>180?1:0;
  function f(v){return v[0].toFixed(2)+' '+v[1].toFixed(2)}
  return 'M'+f(p0)+'A'+RO+' '+RO+' 0 '+big+' 1 '+f(p1)+'L'+f(q1)+'A'+RI+' '+RI+' 0 '+big+' 0 '+f(q0)+'Z'}
function MarkingMenu(p){
  var idr=R.useRef(null);if(idr.current==null){seq+=1;idr.current='cz-mm-'+seq}var id=idr.current;
  var raw=(p.items||[]).slice(0,8),half=raw.length>4?22.5:45;
  var items=raw.map(function(it,i){var d=DIRS[i];return {id:it.id,label:it.label,dir:d,ang:ANG[d]}})
    .sort(function(a,b){return norm(a.ang+90)-norm(b.ang+90)});
  var o=S(!!p.defaultOpen),open=o[0],setOpen=o[1];
  var a=S(-1),active=a[0],setActive=a[1];
  var c=S(''),chosen=c[0],setChosen=c[1];
  var tr=S(null),trail=tr[0],setTrail=tr[1];
  var g=R.useRef(null),suppress=R.useRef(false),focusReq=R.useRef(false),trig=R.useRef(null),root=R.useRef(null),refs=R.useRef([]);
  R.useEffect(function(){if(open&&focusReq.current){focusReq.current=false;var i=active<0?0:active;setActive(i);var el=refs.current[i];if(el)el.focus()}},[open]);
  R.useEffect(function(){if(!open)return;function out(e){if(root.current&&!root.current.contains(e.target))setOpen(false)}
    document.addEventListener('pointerdown',out);return function(){document.removeEventListener('pointerdown',out)}},[open]);
  R.useEffect(function(){if(!trail)return;var t=setTimeout(function(){setTrail(null)},450);return function(){clearTimeout(t)}},[trail]);
  function select(i,refocus){var it=items[i];if(!it)return;setChosen(it.label);setOpen(false);setActive(-1);if(p.onSelect)p.onSelect(it.id);
    if(refocus&&trig.current)trig.current.focus()}
  function nearest(angle){var best=-1,bd=999;items.forEach(function(it,i){var d=Math.abs(delta(angle,it.ang));if(d<bd){bd=d;best=i}});return bd<=half?best:-1}
  function hit(x,y){var el=document.elementFromPoint(x,y),t=el&&el.closest&&el.closest('[data-mm-i]');
    return t&&root.current.contains(t)?+t.getAttribute('data-mm-i'):-1}
  function pd(e){if(e.button!=null&&e.button>0)return;suppress.current=false;try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    var s={x:e.clientX,y:e.clientY,m:'pending'};g.current=s;
    s.t=setTimeout(function(){if(g.current===s&&s.m==='pending'){s.m='held';suppress.current=true;setOpen(true)}},HOLD)}
  function pm(e){var s=g.current;if(!s)return;var dx=e.clientX-s.x,dy=e.clientY-s.y;
    if(s.m==='pending'&&Math.hypot(dx,dy)>FLICK){clearTimeout(s.t);s.m='flick';suppress.current=true;
      var i=nearest(Math.atan2(dy,dx)*180/Math.PI);
      if(!reduced()&&root.current){var r=root.current.getBoundingClientRect();setTrail([s.x-r.left,s.y-r.top,e.clientX-r.left,e.clientY-r.top])}
      if(i>=0)select(i,false)}
    else if(s.m==='held'){setActive(hit(e.clientX,e.clientY))}}
  function pu(e){var s=g.current;if(!s)return;clearTimeout(s.t);g.current=null;
    if(s.m==='held'){var i=hit(e.clientX,e.clientY);if(i>=0)select(i,true)}}
  function click(){if(suppress.current){suppress.current=false;return}
    if(open){setOpen(false);setActive(-1)}else{focusReq.current=true;setOpen(true)}}
  function tkd(e){if(e.key==='ArrowDown'&&!open){e.preventDefault();focusReq.current=true;setOpen(true)}
    else if(e.key==='Escape'&&open){e.preventDefault();setOpen(false)}}
  function move(i){setActive(i);var el=refs.current[i];if(el)el.focus()}
  function ikd(e,i){var k=e.key,cur=items[i];
    if(KEYDIR[k]){e.preventDefault();var T=ANG[KEYDIR[k]],d=delta(cur.ang,T);if(Math.abs(d)<1)return;
      var direct=-1;items.forEach(function(it,j){if(Math.abs(delta(it.ang,T))<1)direct=j});
      if(Math.abs(d)>=179&&direct>=0)return move(direct);
      var n=items.length;move(d>0?(i+1)%n:(i-1+n)%n)}
    else if(k==='Home'){e.preventDefault();move(0)}else if(k==='End'){e.preventDefault();move(items.length-1)}
    else if(k==='Enter'||k===' '){e.preventDefault();select(i,true)}
    else if(k==='Escape'){e.preventDefault();setOpen(false);setActive(-1);if(trig.current)trig.current.focus()}
    else if(k==='Tab'){setOpen(false);setActive(-1)}}
  return h('div',{className:'cz-mm',ref:root},
    h('button',{ref:trig,type:'button',className:'cz-btn cz-btn-secondary cz-mm-trig','aria-haspopup':'menu','aria-expanded':open?'true':'false','aria-controls':open?id+'-m':undefined,
      onPointerDown:pd,onPointerMove:pm,onPointerUp:pu,onPointerCancel:pu,onClick:click,onKeyDown:tkd,onContextMenu:function(e){e.preventDefault()}},
      h('span',null,p.label),h('span',{className:'cz-mm-caret','aria-hidden':'true'},open?'▴':'▾')),
    open?h('div',{className:'cz-mm-ring',id:id+'-m',role:'menu','aria-label':p.label,style:{width:D,height:D}},
      h('svg',{className:'cz-mm-svg',width:D,height:D,viewBox:'0 0 '+D+' '+D,'aria-hidden':'true',focusable:'false'},
        items.map(function(it,i){return h('path',{key:it.id,d:sector(it.ang,half),'data-mm-i':i,className:'cz-mm-sec'+(i===active?' cz-mm-on':''),
          onPointerEnter:function(){if(!g.current)setActive(i)},onClick:function(){select(i,true)}})}),
        h('circle',{className:'cz-mm-hub',cx:C,cy:C,r:RI-6})),
      items.map(function(it,i){var q=pt(it.ang,RM);
        return h('div',{key:it.id,ref:function(el){refs.current[i]=el},role:'menuitem',tabIndex:i===(active<0?0:active)?0:-1,'data-mm-i':i,
          className:'cz-mm-item'+(i===active?' cz-mm-on':''),style:{left:q[0],top:q[1]},
          onKeyDown:function(e){ikd(e,i)},onFocus:function(){setActive(i)},onClick:function(){select(i,true)},onPointerEnter:function(){if(!g.current)setActive(i)}},it.label)})):null,
    trail?h('svg',{className:'cz-mm-trail','aria-hidden':'true',focusable:'false'},h('line',{x1:trail[0],y1:trail[1],x2:trail[2],y2:trail[3]})):null,
    h('p',{className:'cz-mm-out','aria-live':'polite'},chosen?'Chose: '+chosen:'Hold, flick or press to choose.'))}
window.Componentia.MarkingMenu=MarkingMenu;})();

/* Componentia RotaryDial — forge_20261022T1300Z. Credit: Idea after Thomas Park's Rotary, a retro web input for phone numbers (https://thomaspark.co/2016/04/rotary-a-retro-web-input-for-phone-numbers/); the page states no licence, so no code was used. Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
var seq=0,CX=120,CY=120,RD=112,RH=78,HR=17,STOP=120,DIGITS='1234567890';
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
/* angles are degrees clockwise from 12 o'clock; hole i (digit DIGITS[i]) sits at 60-30i and travels 60+30i to the stop */
function holeAng(i){return 60-i*30}
function travel(i){return 60+i*30}
function pt(a,r){var t=a*Math.PI/180;return [CX+r*Math.sin(t),CY-r*Math.cos(t)]}
function norm(d){while(d>180)d-=360;while(d<-180)d+=360;return d}
function clean(s){return String(s==null?'':s).replace(/\D/g,'')}
function phone(d){var g=[d.slice(0,3),d.slice(3,6),d.slice(6,10),d.slice(10)];return g.filter(function(x){return x}).join(' ')}
function circ(x,y,r){return 'M'+(x-r)+' '+y+'a'+r+' '+r+' 0 1 0 '+(2*r)+' 0a'+r+' '+r+' 0 1 0 '+(-2*r)+' 0Z'}
var DISC=(function(){var d=circ(CX,CY,RD);for(var i=0;i<10;i++){var q=pt(holeAng(i),RH);d+=circ(+q[0].toFixed(2),+q[1].toFixed(2),HR)}return d})();
var STOPD=(function(){var a=STOP+13,p1=pt(a,RH-6),p2=pt(a,RD+6);return 'M'+p1[0].toFixed(2)+' '+p1[1].toFixed(2)+'L'+p2[0].toFixed(2)+' '+p2[1].toFixed(2)})();
function RotaryDial(p){
  var idr=R.useRef(null);if(idr.current==null){seq+=1;idr.current='cz-rot-'+seq}var id=idr.current;
  var max=p.maxLength!=null?Math.max(1,p.maxLength|0):10;
  var st=S(function(){return clean(p.defaultValue).slice(0,max)}),val=p.value!=null?clean(p.value).slice(0,max):st[0];
  var rs=S({rot:0,dur:0,hole:-1,cap:false}),rv=rs[0],setR=rs[1];
  var drag=R.useRef(null),timers=R.useRef([]),svgRef=R.useRef(null),boxRef=R.useRef(null),valRef=R.useRef(val);valRef.current=val;
  R.useEffect(function(){return function(){timers.current.forEach(clearTimeout);timers.current=[]}},[]);
  function later(fn,ms){timers.current.push(setTimeout(fn,ms))}
  function stopTimers(){timers.current.forEach(clearTimeout);timers.current=[]}
  function commit(next){if(p.value==null)st[1](next);if(p.onChange)p.onChange(next);if(next.length===max&&p.onComplete)p.onComplete(next)}
  function add(d){var cur=valRef.current;if(cur.length>=max)return false;var n=cur+d;valRef.current=n;commit(n);return true}
  function del(){var cur=valRef.current;if(!cur)return;var n=cur.slice(0,-1);valRef.current=n;commit(n)}
  function clear(){if(!valRef.current)return;valRef.current='';commit('')}
  function spin(i){stopTimers();if(reduced()){setR({rot:0,dur:0,hole:-1,cap:false});return}
    var t=travel(i),out=Math.round(90+t/330*210),back=Math.round(150+t/330*300);
    setR({rot:t,dur:out,hole:i,cap:true});
    later(function(){setR({rot:0,dur:back,hole:i,cap:false})},out);
    later(function(){setR({rot:0,dur:0,hole:-1,cap:false})},out+back)}
  function key(e){var k=e.key;
    if(/^[0-9]$/.test(k)){e.preventDefault();if(add(k))spin(DIGITS.indexOf(k))}
    else if(k==='Backspace'||k==='Delete'){e.preventDefault();del()}
    else if(k==='Escape'){e.preventDefault();clear()}}
  function local(e){var r=svgRef.current.getBoundingClientRect(),s=240/r.width;return [(e.clientX-r.left)*s,(e.clientY-r.top)*s]}
  function angOf(q){return Math.atan2(q[0]-CX,-(q[1]-CY))*180/Math.PI}
  function down(e){if(e.button!=null&&e.button>0)return;if(valRef.current.length>=max)return;
    var q=local(e),hit=-1;
    for(var i=0;i<10;i++){var c=pt(holeAng(i),RH);if(Math.hypot(q[0]-c[0],q[1]-c[1])<=HR+5){hit=i;break}}
    if(hit<0)return;e.preventDefault();stopTimers();
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    try{boxRef.current.focus({preventScroll:true})}catch(_){}
    drag.current={i:hit,last:angOf(q),raw:0};setR({rot:0,dur:0,hole:hit,cap:false})}
  function move(e){var d=drag.current;if(!d)return;var a=angOf(local(e));d.raw+=norm(a-d.last);d.last=a;
    var t=travel(d.i),rot=Math.max(0,Math.min(t,d.raw));setR({rot:rot,dur:0,hole:d.i,cap:rot>=t-6})}
  function up(){var d=drag.current;if(!d)return;drag.current=null;
    var t=travel(d.i),rot=Math.max(0,Math.min(t,d.raw));if(rot>=t-6)add(DIGITS[d.i]);
    if(reduced()||rot<1){setR({rot:0,dur:0,hole:-1,cap:false});return}
    var back=Math.round(150+rot/330*300);setR({rot:0,dur:back,hole:d.i,cap:false});
    later(function(){setR({rot:0,dur:0,hole:-1,cap:false})},back)}
  var shown=val?(p.format==='phone'?phone(val):(typeof p.format==='function'?String(p.format(val)):val)):'';
  var full=val.length>=max;
  var hint=full?'All '+max+' digits entered. Delete or clear to change.':'Type a digit, or drag a hole round to the stop. Backspace deletes, Escape clears.';
  var hc=rv.hole>=0?pt(holeAng(rv.hole),RH):null;
  return h('div',{className:'cz-rot'},
    h('div',{className:'cz-rot-lb','aria-hidden':'true'},p.label),
    h('div',{className:'cz-rot-read'},
      h('output',{className:'cz-rot-num'+(val?'':' cz-rot-empty'),'aria-live':'polite','aria-label':p.label+', entered digits'},val?shown:'No digits yet'),
      h('span',{className:'cz-rot-count','aria-hidden':'true'},val.length+'/'+max)),
    h('div',{ref:boxRef,className:'cz-rot-box',role:'group',tabIndex:0,'aria-label':p.label,'aria-describedby':id+'-h',onKeyDown:key,'data-full':full?'true':undefined},
      h('svg',{ref:svgRef,className:'cz-rot-svg',viewBox:'0 0 240 240','aria-hidden':'true',focusable:'false',
        onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up,onLostPointerCapture:up},
        h('circle',{className:'cz-rot-plate',cx:CX,cy:CY,r:RD}),
        DIGITS.split('').map(function(d,i){var q=pt(holeAng(i),RH);return h('text',{key:d,className:'cz-rot-dg',x:q[0].toFixed(2),y:q[1].toFixed(2),dy:'0.35em'},d)}),
        h('g',{className:'cz-rot-disc',style:{transform:'rotate('+rv.rot+'deg)',transitionDuration:rv.dur+'ms'}},
          h('path',{className:'cz-rot-face',d:DISC,fillRule:'evenodd'}),
          hc?h('circle',{className:'cz-rot-act'+(rv.cap?' cz-rot-cap':''),cx:hc[0].toFixed(2),cy:hc[1].toFixed(2),r:HR}):null,
          h('circle',{className:'cz-rot-hub',cx:CX,cy:CY,r:30})),
        h('path',{className:'cz-rot-stop',d:STOPD}))),
    h('p',{id:id+'-h',className:'cz-rot-hint'},hint),
    h('div',{className:'cz-rot-ctl'},
      h('button',{type:'button',className:'cz-btn cz-btn-secondary','aria-label':'Delete last digit',disabled:!val,onClick:del},'Delete'),
      h('button',{type:'button',className:'cz-btn cz-btn-secondary',disabled:!val,onClick:clear},'Clear')))}
window.Componentia.RotaryDial=RotaryDial;})();

/* Componentia PatternLock — forge_20261022T1300Z. Credit: Idea: the dot-grid unlock pattern popularised by Android; near-duplicates seen include vanilla-pattern-lock (github.com/maxwroc/vanilla-pattern-lock) and pattern-lock-js (npm), licences not read; no code used. Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
var U=100,HIT=34;
function gcd(a,b){return b?gcd(b,a%b):a}
function clean(arr,n){var out=[],seen={};(arr||[]).forEach(function(d){d=Math.round(+d);if(d>=1&&d<=n*n&&!seen[d]){seen[d]=1;out.push(d)}});return out}
function same(a,b){if(a.length!==b.length)return false;for(var i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true}
/* dots strictly between a and b on a straight grid line, in order */
function between(a,b,n){var r1=Math.floor((a-1)/n),c1=(a-1)%n,r2=Math.floor((b-1)/n),c2=(b-1)%n;
  var dr=r2-r1,dc=c2-c1,g=gcd(Math.abs(dr),Math.abs(dc)),out=[];
  for(var k=1;k<g;k++)out.push((r1+dr/g*k)*n+(c1+dc/g*k)+1);return out}
function extend(seq,d,n){if(seq.indexOf(d)>=0)return seq;var s=seq.slice();
  if(s.length)between(s[s.length-1],d,n).forEach(function(m){if(s.indexOf(m)<0)s.push(m)});
  s.push(d);return s}
function readout(seq){if(!seq.length)return 'No dots yet';
  return seq.length+(seq.length===1?' dot: ':' dots: ')+seq.join(' → ')}
function PatternLock(p){
  var n=Math.max(2,Math.min(6,p.size||3)),minDots=p.minDots!=null?p.minDots:4,id=R.useId();
  var initial=clean(p.value!=null?p.value:p.defaultValue,n);
  var sq=S(initial),seq=sq[0],setSeq=sq[1];
  var cs=S(initial.length?initial[initial.length-1]:Math.ceil(n*n/2)),cur=cs[0],setCur=cs[1];
  var es=S(false),err=es[0],setErr=es[1];
  var ds=S(false),dirty=ds[0],setDirty=ds[1];
  var fs=S(false),kb=fs[0],setKb=fs[1];
  var ps=S(null),ptr=ps[0],setPtr=ps[1];
  var ns=S(''),note=ns[0],setNote=ns[1];
  var fin=R.useRef(initial.length>0),seqRef=R.useRef(initial),drag=R.useRef(false),svgRef=R.useRef(null),lastKey=R.useRef(null),pdn=R.useRef(false);
  var vkey=p.value!=null?clean(p.value,n).join(','):null;
  R.useEffect(function(){if(vkey==null)return;var v=vkey?vkey.split(',').map(Number):[];
    if(!same(v,seqRef.current)){seqRef.current=v;setSeq(v);fin.current=v.length>0;setErr(false);setDirty(false)}},[vkey]);
  function put(s){seqRef.current=s;setSeq(s)}
  function begin(){if(fin.current){fin.current=false;put([])}setErr(false);setDirty(true)}
  function add(d){var s=seqRef.current;if(s.indexOf(d)>=0)return false;
    var ns2=extend(s,d,n);put(ns2);lastKey.current=d;return true}
  function finish(){var s=seqRef.current;fin.current=true;setPtr(null);
    if(!s.length){setErr(false);setDirty(false);return}
    if(s.length<minDots){setErr(true);setDirty(true);return}
    setErr(false);setDirty(false);if(p.onComplete)p.onComplete(s.slice())}
  function clear(){fin.current=false;put([]);setErr(false);setDirty(true);setPtr(null)}
  function local(e){var r=svgRef.current.getBoundingClientRect(),k=n*U/r.width;return [(e.clientX-r.left)*k,(e.clientY-r.top)*k]}
  function hit(q){var c=Math.floor(q[0]/U),r=Math.floor(q[1]/U);if(c<0||r<0||c>=n||r>=n)return 0;
    var cx=c*U+U/2,cy=r*U+U/2;return Math.hypot(q[0]-cx,q[1]-cy)<=HIT?r*n+c+1:0}
  function down(e){if(e.button!=null&&e.button>0)return;var q=local(e),d=hit(q);setKb(false);if(!d)return;
    e.preventDefault();try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    drag.current=true;begin();add(d);setCur(d);setPtr(q)}
  function move(e){if(!drag.current)return;var q=local(e),d=hit(q);if(d&&add(d))setCur(d);setPtr(q)}
  function up(){if(!drag.current)return;drag.current=false;finish()}
  function onKey(e){var k=e.key,r=Math.floor((cur-1)/n),c=(cur-1)%n,m=null;
    if(k==='ArrowUp')m=[r-1,c];else if(k==='ArrowDown')m=[r+1,c];else if(k==='ArrowLeft')m=[r,c-1];else if(k==='ArrowRight')m=[r,c+1];
    if(m){e.preventDefault();setKb(true);if(m[0]<0||m[1]<0||m[0]>=n||m[1]>=n)return;var d=m[0]*n+m[1]+1;setCur(d);
      setNote('Dot '+d+(seqRef.current.indexOf(d)>=0?', chosen':''));return}
    if(k===' '||k==='Spacebar'){e.preventDefault();setKb(true);if(e.repeat)return;
      if(fin.current)begin();
      if(seqRef.current.indexOf(cur)>=0){setNote('Dot '+cur+' already used');return}
      setDirty(true);setErr(false);add(cur);setNote('');return}
    if(k==='Backspace'){e.preventDefault();setKb(true);var s=seqRef.current;if(!s.length)return;
      fin.current=false;setErr(false);setDirty(true);put(s.slice(0,-1));setNote('Removed dot '+s[s.length-1]);return}
    if(k==='Escape'){if(!seqRef.current.length&&!err)return;e.preventDefault();clear();setNote('Cleared');return}
    if(k==='Enter'){e.preventDefault();setKb(true);finish()}}
  var W=n*U,cxy=function(d){return [((d-1)%n)*U+U/2,Math.floor((d-1)/n)*U+U/2]};
  var pts=seq.map(function(d){var q=cxy(d);return q[0]+','+q[1]}).join(' ');
  var band=null;if(ptr&&drag.current&&seq.length){var lq=cxy(seq[seq.length-1]);
    band=h('line',{className:'cz-pat-band',x1:lq[0],y1:lq[1],x2:Math.round(ptr[0]),y2:Math.round(ptr[1])})}
  var dots=[];for(var d=1;d<=n*n;d++){var q=cxy(d),on=seq.indexOf(d)>=0;
    dots.push(h('g',{key:d,className:'cz-pat-dot'+(on?' cz-pat-on':'')+(on&&d===lastKey.current&&dirty?' cz-pat-new':'')},
      h('circle',{cx:q[0],cy:q[1],r:22}),
      h('text',{x:q[0],y:q[1],dy:'0.35em'},d)))}
  var cq=cxy(cur);
  var status=null;
  if(err)status=h('p',{className:'cz-pat-st cz-pat-st-crit',role:'status'},h('i',{'aria-hidden':'true'}),h('span',null,'Use at least '+minDots+' dots'));
  else if(!dirty&&seq.length&&p.status&&p.status!=='idle'&&p.statusText){var sk=p.status==='error'?'crit':'ok';
    status=h('p',{className:'cz-pat-st cz-pat-st-'+sk,role:'status'},h('i',{'aria-hidden':'true'},sk==='ok'?'✓':null),h('span',null,p.statusText))}
  return h('div',{className:'cz-pat'},
    h('span',{id:id+'l',className:'cz-pat-lb'},p.label),
    h('div',{className:'cz-pat-grid',tabIndex:0,role:'group','aria-labelledby':id+'l','aria-describedby':id+'h '+id+'k',style:{maxWidth:n*68+'px'},
      onKeyDown:onKey,onFocus:function(){if(!pdn.current)setKb(true)},onBlur:function(){setKb(false)},
      onPointerDownCapture:function(){pdn.current=true;setTimeout(function(){pdn.current=false},0)}},
      h('svg',{ref:svgRef,className:'cz-pat-svg',viewBox:'0 0 '+W+' '+W,'aria-hidden':'true',focusable:'false',
        onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up,onLostPointerCapture:up},
        seq.length>1?h('polyline',{className:'cz-pat-path',points:pts}):null,band,dots,
        kb?h('circle',{className:'cz-pat-cur',cx:cq[0],cy:cq[1],r:33}):null,
        kb?h('circle',{className:'cz-pat-cur2',cx:cq[0],cy:cq[1],r:29}):null)),
    h('p',{className:'cz-pat-read','aria-live':'polite'},readout(seq)),
    status,
    h('p',{id:id+'h',className:'cz-pat-hint'},'Drag through the dots, or use the arrow keys and Space.'),
    h('span',{id:id+'k',className:'cz-vh'},'Dots are numbered 1 to '+(n*n)+', row by row. Space adds the dot under the cursor, Backspace removes the last, Escape clears, Enter finishes.'),
    h('div',{className:'cz-vh','aria-live':'polite'},note))}
window.Componentia.PatternLock=PatternLock;})();

/* Componentia Hourglass — forge_20261022T1300Z. Credit: Idea after the hourglass loaders by SouravBandyopadhyay and Shoh2008 on Uiverse (galaxy repo, MIT: "MIT License Copyright (c) 2023 Uiverse.io"); no code used — the sand simulation is new. Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
/* coarse glass grid: GW x GH cells, neck between rows MID-1 and MID */
var GW=36,GH=56,MID=28,CX=18,NECK=1,MAXHW=16.5,FLIP_MS=420;
function hwAt(yf){var d=Math.abs(yf-MID)/MID,t=Math.min(1,d*1.18);return NECK+(MAXHW-NECK)*Math.pow(Math.sin(t*Math.PI/2),1.35)}
var MASK=new Uint8Array(GW*GH),TOP=[],BOT=[];
(function(){var rows=[];
  for(var y=0;y<GH;y++){var hw=hwAt(y+.5),row=[];
    for(var x=0;x<GW;x++)if(Math.abs(x+.5-CX)<=hw+.45){MASK[y*GW+x]=1;row.push(x)}
    row.sort(function(a,b){return (Math.abs(a+.5-CX)-Math.abs(b+.5-CX))||(a-b)});rows.push(row)}
  /* top bulb fills from the neck upward, edges first (a shallow crater); bottom fills from the floor up, centre first (a mound) */
  for(var y1=MID-1;y1>=0;y1--){var r1=rows[y1].slice().reverse();for(var i=0;i<r1.length;i++)TOP.push(y1*GW+r1[i])}
  for(var y2=GH-1;y2>=MID;y2--){var r2=rows[y2];for(var j=0;j<r2.length;j++)BOT.push(y2*GW+r2[j])}})();
var N=Math.round(TOP.length*.78);
function rng(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function layout(g,t){g.fill(0);for(var i=0;i<t;i++)g[TOP[i]]=1;for(var j=0;j<N-t;j++)g[BOT[j]]=1}
function countTop(g){var c=0,e=MID*GW;for(var i=0;i<e;i++)c+=g[i];return c}
/* one automaton step; grains cross the neck only while the top bulb holds more than its target */
function step(g,allow,rnd,rev){var passed=0;
  for(var y=GH-2;y>=0;y--){var gate=y===MID-1;
    for(var k=0;k<GW;k++){var x=rev?GW-1-k:k,i=y*GW+x;if(!g[i])continue;if(gate&&passed>=allow)continue;
      var j=i+GW,to=-1;
      if(MASK[j]&&!g[j])to=j;
      else{var d=rnd()<.5?-1:1;for(var s=0;s<2&&to<0;s++){var xx=x+(s?-d:d);if(xx<0||xx>=GW)continue;var jj=(y+1)*GW+xx;if(MASK[jj]&&!g[jj])to=jj}}
      if(to>=0){g[i]=0;g[to]=1;if(gate)passed++}}}
  return passed}
function firstFree(g,o){for(var i=0;i<o.length;i++)if(!g[o[i]])return o[i];return -1}
function lastFull(g,o){for(var i=o.length-1;i>=0;i--)if(g[o[i]])return o[i];return -1}
/* pull the simulation back to the true ratio so it never drifts */
function correct(g,t,slack){var top=countTop(g),a,b;
  while(top>t+slack){a=lastFull(g,TOP);b=firstFree(g,BOT);if(a<0||b<0)break;g[a]=0;g[b]=1;top--}
  while(top<t){a=lastFull(g,BOT);b=firstFree(g,TOP);if(a<0||b<0)break;g[a]=0;g[b]=1;top++}}
function rot180(g){var n=g.length,c=new Uint8Array(n);for(var i=0;i<n;i++)c[i]=g[n-1-i];g.set(c)}
function ease(k){return k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2}
function draw(cv,g,ang,w,hp,dpr){var ctx=cv.getContext('2d');if(!ctx)return;var cs=getComputedStyle(cv);
  function C(n){return cs.getPropertyValue('--'+n).trim()}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,hp);ctx.fillStyle=C('inset');ctx.fillRect(0,0,w,hp);
  var cell=Math.min((w-24)/GW,(hp-32)/GH),gw=cell*GW,gh=cell*GH,ox=(w-gw)/2,oy=(hp-gh)/2,y,yf,steps=56;
  ctx.save();ctx.translate(w/2,hp/2);
  if(ang){ctx.rotate(ang);var sc=1-.42*Math.sin(ang);ctx.scale(sc,sc)}
  ctx.translate(-w/2,-hp/2);
  ctx.beginPath();
  for(y=0;y<=steps;y++){yf=y/steps*GH;var lx=ox+(CX-hwAt(yf)-.35)*cell,py=oy+yf*cell;if(y)ctx.lineTo(lx,py);else ctx.moveTo(lx,py)}
  for(y=steps;y>=0;y--){yf=y/steps*GH;ctx.lineTo(ox+(CX+hwAt(yf)+.35)*cell,oy+yf*cell)}
  ctx.closePath();
  ctx.save();ctx.clip();ctx.fillStyle=C('accent-ink');
  for(y=0;y<GH;y++)for(var x=0;x<GW;x++)if(g[y*GW+x])ctx.fillRect(ox+x*cell,oy+y*cell,cell+.5,cell+.5);
  ctx.restore();
  ctx.strokeStyle=C('ink-muted');ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
  ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();
  ctx.moveTo(ox+cell,oy-3);ctx.lineTo(ox+gw-cell,oy-3);ctx.moveTo(ox+cell,oy+gh+3);ctx.lineTo(ox+gw-cell,oy+gh+3);ctx.stroke();
  ctx.restore()}
function pl(n,u){return n+' '+u+(n===1?'':'s')}
function spoken(s){var m=Math.floor(s/60),r=s%60,a=[];if(m)a.push(pl(m,'minute'));if(r||!m)a.push(pl(r,'second'));return a.join(' ')}
function clock(s){var m=Math.floor(s/60),r=s%60;return m+':'+(r<10?'0':'')+r}
var RMQ='(prefers-reduced-motion: reduce)';
function Hourglass(p){var dur=Math.max(1,Math.round(+p.duration||180)),id=R.useId();
  var rs=S(p.defaultRunning!==false),ctl=p.running!=null,running=ctl?!!p.running:rs[0];
  var ds=S(false),done=ds[0],ss=S(dur),sec=ss[0];
  var rmS=S(function(){return !!(window.matchMedia&&window.matchMedia(RMQ).matches)}),rm=rmS[0];
  var sz=S(0),thm=S(0);
  var rootRef=R.useRef(null),cvRef=R.useRef(null),dragRef=R.useRef(null),mr=R.useRef(null);
  if(!mr.current){mr.current={g:new Uint8Array(GW*GH),el:0,st:null,rnd:rng(20261022),ang:0,anim:null,w:0,h:0,dpr:1,vis:true,raf:0,par:0,fired:false,kick:null};layout(mr.current.g,N)}
  var m=mr.current,live=running&&!done;
  m.durMs=dur*1000;m.live=live;m.rm=rm;m.onDone=p.onDone;
  function rem(){return Math.max(0,m.durMs-(m.el+(m.st!=null?performance.now()-m.st:0)))}
  function target(){return Math.round(N*rem()/m.durMs)}
  function paint(){var cv=cvRef.current;if(cv&&m.w)draw(cv,m.g,m.ang,m.w,m.h,m.dpr)}
  m.check=function(){var r=rem();ss[1](Math.ceil(r/1000));
    if(r<=0&&!m.fired){m.fired=true;if(m.st!=null){m.el+=performance.now()-m.st;m.st=null}ds[1](true);if(m.onDone)m.onDone()}};
  m.finishFlip=function(){rot180(m.g);m.ang=0;m.anim=null;m.el=0;if(m.st!=null)m.st=performance.now();m.fired=false;
    correct(m.g,N,0);ds[1](false);ss[1](Math.ceil(m.durMs/1000));paint()};
  /* clock bookkeeping */
  R.useEffect(function(){var now=performance.now();if(live){if(m.st==null)m.st=now}else if(m.st!=null){m.el+=now-m.st;m.st=null}},[live]);
  R.useEffect(function(){if(!live)return;var t=setInterval(function(){m.check()},250);return function(){clearInterval(t)}},[live]);
  /* reduced-motion preference */
  R.useEffect(function(){if(!window.matchMedia)return;var q=window.matchMedia(RMQ),f=function(){rmS[1](q.matches)};
    if(q.addEventListener)q.addEventListener('change',f);else q.addListener(f);
    return function(){if(q.removeEventListener)q.removeEventListener('change',f);else q.removeListener(f)}},[]);
  /* size to lane width, max 180 px glass, devicePixelRatio aware */
  R.useEffect(function(){var el=rootRef.current;if(!el)return;
    function fit(){var cv=cvRef.current;if(!cv)return;var w=Math.max(96,Math.min(180,Math.floor(el.clientWidth)-8)),hp=Math.round(w*1.6),d=window.devicePixelRatio||1;
      if(w===m.w&&d===m.dpr)return;m.w=w;m.h=hp;m.dpr=d;cv.width=Math.round(w*d);cv.height=Math.round(hp*d);cv.style.width=w+'px';cv.style.height=hp+'px';
      sz[1](function(n){return n+1});paint()}
    fit();var ro=window.ResizeObserver?new ResizeObserver(fit):null;if(ro)ro.observe(el);else window.addEventListener('resize',fit);
    return function(){if(ro)ro.disconnect();else window.removeEventListener('resize',fit)}},[]);
  /* redraw on theme change (colours are read at draw time) */
  R.useEffect(function(){var el=rootRef.current;if(!el||!window.MutationObserver)return;var mo=new MutationObserver(function(){thm[1](function(n){return n+1})}),host=el.closest('[data-theme]');
    var o={attributes:true,attributeFilter:['data-theme','class','style']};if(host)mo.observe(host,o);mo.observe(document.documentElement,o);
    return function(){mo.disconnect()}},[]);
  /* pause the loop while offscreen */
  R.useEffect(function(){var el=rootRef.current;if(!el||!window.IntersectionObserver)return;
    var io=new IntersectionObserver(function(es){m.vis=es[es.length-1].isIntersecting;if(m.vis&&m.kick)m.kick()});io.observe(el);
    return function(){io.disconnect()}},[]);
  /* animation loop: only while running (or flipping), visible and motion allowed */
  R.useEffect(function(){if(rm){m.kick=null;return}
    var last=performance.now();
    function frame(now){m.raf=0;var dt=Math.min(64,now-last);last=now;
      if(m.anim){var k=(now-m.anim.t0)/FLIP_MS;if(k>=1)m.finishFlip();else m.ang=Math.PI*ease(k)}
      else if(m.live){var t=target(),top=countTop(m.g),n=dt>24?3:2;
        for(var i=0;i<n;i++){m.par^=1;top-=step(m.g,Math.max(0,top-t),m.rnd,m.par)}correct(m.g,t,3)}
      paint();
      if((m.live||m.anim)&&m.vis)m.raf=requestAnimationFrame(frame)}
    m.kick=function(){if(!m.raf&&(m.live||m.anim)){last=performance.now();m.raf=requestAnimationFrame(frame)}};
    m.kick();
    return function(){if(m.raf)cancelAnimationFrame(m.raf);m.raf=0;m.kick=null}},[live,rm]);
  /* static paint: reduced motion (levels straight from the ratio, once a second), paused, done, resize, theme */
  R.useEffect(function(){if(rm){layout(m.g,target());paint()}else if(!live&&!m.anim)paint()},[sec,rm,live,sz[0],thm[0]]);
  function setRun(v){if(!ctl)rs[1](v);if(p.onRunningChange&&v!==running)p.onRunningChange(v)}
  function flip(){if(m.anim)return;
    if(rm)m.finishFlip();else{m.anim={t0:performance.now()};if(m.kick)m.kick()}
    setRun(true);if(p.onFlip)p.onFlip()}
  function down(e){if(e.button!=null&&e.button>0)return;try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}dragRef.current={y:e.clientY,id:e.pointerId,used:false}}
  function move(e){var d=dragRef.current;if(!d||d.id!==e.pointerId||d.used)return;if(Math.abs(e.clientY-d.y)>=40){d.used=true;flip()}}
  function up(){dragRef.current=null}
  function key(e){if((e.key===' '||e.key==='Enter')){e.preventDefault();if(!e.repeat)flip()}}
  var name='Hourglass, '+(done?"time's up":spoken(sec)+' left'+(live?'':', paused'));
  return h('div',{ref:rootRef,className:'cz-hg'+(done?' cz-hg-done':''),role:'group','aria-labelledby':id+'l'},
    h('div',{className:'cz-hg-h'},h('span',{id:id+'l',className:'cz-hg-lb'},p.label),
      h('span',{className:'cz-hg-read',role:'timer','aria-live':'off'},
        done?[h('i',{key:'m',className:'cz-hg-mark','aria-hidden':'true'}),h('span',{key:'t'},"Time's up")]:
          [h('span',{key:'t'},clock(sec)+' left'),live?null:h('span',{key:'p',className:'cz-hg-st'},'paused')])),
    h('div',{className:'cz-hg-glass',role:'button',tabIndex:0,'aria-label':name,'aria-describedby':id+'h',
      onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up,onLostPointerCapture:up,onKeyDown:key},
      h('canvas',{ref:cvRef,className:'cz-hg-cv','aria-hidden':'true'})),
    h('p',{id:id+'h',className:'cz-hg-hint'},'Drag the glass up or down, or press Space on it, to flip and restart.'),
    h('div',{className:'cz-vh','aria-live':'polite'},done?p.label+": time's up":''),
    h('div',{className:'cz-hg-ctl'},
      h('button',{type:'button',className:'cz-btn cz-btn-secondary',onClick:flip},'Flip'),
      h('button',{type:'button',className:'cz-btn cz-btn-secondary',disabled:done,onClick:function(){setRun(!running)}},running&&!done?'Pause':'Resume')))}
window.Componentia.Hourglass=Hourglass;})();

/* Componentia ScratchReveal — forge_20261022T1300Z. Credit: Idea: the scratch-off card; near-duplicates seen include scratchcard (npm, connesc), scratchcard-js (tofandel) and Touch2Reveal (cssscript.com), licences not read; no code used. Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
var seq=0;
function hash(s){var x=2166136261;s=String(s);for(var i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return x>>>0}
/* seeded PRNG (mulberry32 style), deterministic per label */
function rng(seed){var a=seed>>>0;return function(){a=(a+1831565813)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
function tok(el,n){return getComputedStyle(el).getPropertyValue('--'+n).trim()}
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function wrap(ctx,text,maxW){var words=String(text).split(/\s+/),lines=[],cur='';
  words.forEach(function(w){var t=cur?cur+' '+w:w;if(cur&&ctx.measureText(t).width>maxW){lines.push(cur);cur=w}else cur=t});
  if(cur)lines.push(cur);return lines}
function ScratchReveal(p){
  var idr=R.useRef(null);if(idr.current==null){seq+=1;idr.current='cz-scx-'+seq}
  var brush=p.brush>0?p.brush:22,threshold=p.threshold!=null?Math.max(0.05,Math.min(1,p.threshold)):0.5;
  var ctl=p.revealed!=null;
  var os=S(!!p.defaultRevealed),open=ctl?!!p.revealed:os[0];
  var fs=S(false),fading=fs[0];
  var ls=S(''),live=ls[0];
  var boxRef=R.useRef(null),cvRef=R.useRef(null),contRef=R.useRef(null);
  var st=R.useRef({w:0,h:0,dpr:0,drawing:false,last:null,lastSample:0,done:false,wantFocus:false});

  function draw(force){var cv=cvRef.current,box=boxRef.current;if(!cv||!box)return;
    var r=box.getBoundingClientRect(),w=Math.max(1,Math.round(r.width)),hh=Math.max(1,Math.round(r.height)),dpr=window.devicePixelRatio||1,s=st.current,
      sig=tok(cv,'inset')+'|'+tok(cv,'ink')+'|'+tok(cv,'ink-muted')+'|'+tok(cv,'cz-fs');
    if(!force&&s.w===w&&s.h===hh&&s.dpr===dpr&&s.sig===sig)return;
    s.sig=sig;s.w=w;s.h=hh;s.dpr=dpr;cv.width=Math.round(w*dpr);cv.height=Math.round(hh*dpr);
    var ctx=cv.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.globalCompositeOperation='source-over';
    ctx.fillStyle=tok(cv,'inset');ctx.fillRect(0,0,w,hh);
    var fam=tok(cv,'cz-fs')||'sans-serif',size=w<260?15:17;
    ctx.font='700 '+size+'px '+fam;
    var lines=wrap(ctx,p.label,w-40),lh=Math.round(size*1.3),th=lines.length*lh,ty=(hh-th)/2;
    var tw=0;lines.forEach(function(l){tw=Math.max(tw,ctx.measureText(l).width)});
    /* keep a clear band around the label so the marks never cross the text */
    var bx0=(w-tw)/2-10,bx1=(w+tw)/2+10,by0=ty-8,by1=ty+th+8;
    var rand=rng(hash(p.label)),n=Math.round(w*hh/170);
    ctx.strokeStyle=tok(cv,'ink-muted');ctx.lineWidth=1.5;ctx.lineCap='round';ctx.beginPath();
    for(var i=0;i<n;i++){var x=rand()*w,y=rand()*hh,a=rand()*Math.PI,l=2+rand()*4;
      if(x>bx0-4&&x<bx1+4&&y>by0-4&&y<by1+4)continue;
      ctx.moveTo(x-Math.cos(a)*l/2,y-Math.sin(a)*l/2);ctx.lineTo(x+Math.cos(a)*l/2,y+Math.sin(a)*l/2)}
    ctx.stroke();
    ctx.fillStyle=tok(cv,'ink');ctx.textAlign='center';ctx.textBaseline='middle';
    lines.forEach(function(l,k){ctx.fillText(l,w/2,ty+lh*k+lh/2)})}

  function sample(){var cv=cvRef.current,s=st.current;if(!cv||s.done)return;
    var ctx=cv.getContext('2d'),W=cv.width,H=cv.height;if(!W||!H)return;
    var d;try{d=ctx.getImageData(0,0,W,H).data}catch(_){return}
    var step=Math.max(4,Math.round(8*s.dpr)),tot=0,clr=0;
    for(var y=Math.floor(step/2);y<H;y+=step)for(var x=Math.floor(step/2);x<W;x+=step){tot++;if(d[(y*W+x)*4+3]<128)clr++}
    if(tot&&clr/tot>=threshold)reveal(true)}

  function reveal(scratched){var s=st.current;if(s.done||open)return;s.done=true;s.drawing=false;s.wantFocus=true;
    if(p.onReveal)p.onReveal();
    if(scratched&&!reduced()){fs[1](true);return}
    finish()}
  function finish(){fs[1](false);
    if(ctl){if(!p.revealed){st.current.done=false;st.current.wantFocus=false;draw(true)}return}
    os[1](true)}

  function pt(e){var r=cvRef.current.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]}
  function erase(a,b){var ctx=cvRef.current.getContext('2d');if(!ctx)return;
    ctx.globalCompositeOperation='destination-out';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=brush;
    ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0]+0.01,b[1]);ctx.stroke();ctx.globalCompositeOperation='source-over'}
  function down(e){var s=st.current;if(s.done||(e.button!=null&&e.button>0))return;e.preventDefault();
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    s.drawing=true;var q=pt(e);s.last=q;erase(q,q)}
  function move(e){var s=st.current;if(!s.drawing)return;var q=pt(e);erase(s.last,q);s.last=q;
    var now=performance.now();if(now-s.lastSample>120){s.lastSample=now;sample()}}
  function up(){var s=st.current;if(!s.drawing)return;s.drawing=false;sample()}

  /* inert and focus are set imperatively (React 18 has no inert prop) */
  R.useLayoutEffect(function(){var c=contRef.current;if(!c)return;
    if(open){c.removeAttribute('inert');c.inert=false;
      if(st.current.wantFocus){st.current.wantFocus=false;try{c.focus()}catch(_){}ls[1]('Revealed')}}
    else{c.setAttribute('inert','');c.inert=true;st.current.done=false;ls[1]('')}},[open]);

  R.useLayoutEffect(function(){if(open)return;var box=boxRef.current;st.current.w=0;draw(true);
    var ro=null,mo=null,mq=null,onMq=function(){draw(false)};
    if(window.ResizeObserver){ro=new ResizeObserver(function(){draw(false)});ro.observe(box)}
    if(window.MutationObserver){mo=new MutationObserver(function(){draw(false)});
      mo.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['data-theme','class','style']})}
    try{mq=window.matchMedia('(prefers-color-scheme: dark)');mq.addEventListener('change',onMq)}catch(_){mq=null}
    return function(){if(ro)ro.disconnect();if(mo)mo.disconnect();if(mq)try{mq.removeEventListener('change',onMq)}catch(_){}}},[open,p.label]);

  R.useEffect(function(){if(!fading)return;var t=setTimeout(finish,450);return function(){clearTimeout(t)}},[fading]);

  return h('div',{className:'cz-scx',role:'region','aria-label':p.label},
    h('div',{ref:boxRef,className:'cz-scx-box'},
      h('div',{ref:contRef,className:'cz-scx-c',tabIndex:-1,'aria-hidden':open?undefined:'true'},p.children),
      open?null:h('canvas',{ref:cvRef,className:'cz-scx-cv'+(fading?' cz-scx-fade':''),'aria-hidden':'true',
        onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up,onLostPointerCapture:up,
        onTransitionEnd:function(e){if(fading&&e.propertyName==='opacity')finish()}})),
    open?null:h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-scx-btn',disabled:fading,onClick:function(){reveal(false)}},'Reveal'),
    h('div',{className:'cz-vh','aria-live':'polite'},live))}
window.Componentia.ScratchReveal=ScratchReveal;})();

/* Componentia BalanceBeam — forge_20261022T1300Z. Credit: Idea: the pan balance, a public-domain teaching instrument (e.g. the Balance Applet, mste.illinois.edu/wofford/balance/); no code used. Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
var K_TILT=30,MAX_TILT=14,PX=150,PY=30,ARM=100,MAXB=12,COLS=4,BW=19,BH=14,BG=3;
var SPRING=60,DAMP=7;
function rnd(n){return Math.round(n*1e6)/1e6}
function target(l,r){var t=K_TILT*(r-l)/Math.max(l,r,1);return Math.max(-MAX_TILT,Math.min(MAX_TILT,t))}
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function readout(L,Rt,unit){var u=unit?' '+unit:'';
  if(rnd(L.value)===rnd(Rt.value))return 'Balanced at '+rnd(L.value)+u;
  var hv=L.value>Rt.value?L:Rt;
  return 'Left: '+L.label+' '+rnd(L.value)+u+' · Right: '+Rt.label+' '+rnd(Rt.value)+u+' — '+hv.label+' heavier by '+rnd(Math.abs(L.value-Rt.value))+u}
/* block positions inside a pan, local coords: origin = hang point, tray from y=40 to y=98 */
function blockXY(i){var row=Math.floor(i/COLS),col=i%COLS,w=COLS*BW+(COLS-1)*BG;
  return [-w/2+col*(BW+BG),94-(row+1)*BH-row*BG]}
function BalanceBeam(p){
  var unit=p.unit!=null?p.unit:'kg',step=p.step>0?p.step:1,inter=p.interactive!==false;
  var lv=S(+p.left.value||0),rv=S(+p.right.value||0),L=lv[0],Rv=rv[0];
  R.useEffect(function(){lv[1](+p.left.value||0)},[p.left.value]);
  R.useEffect(function(){rv[1](+p.right.value||0)},[p.right.value]);
  var tgt=target(L,Rv);
  var as=S(tgt),ang=as[0],setAng=as[1];
  var th=R.useRef(tgt),om=R.useRef(0),raf=R.useRef(0);
  R.useEffect(function(){
    if(raf.current){cancelAnimationFrame(raf.current);raf.current=0}
    if(reduced()){th.current=tgt;om.current=0;setAng(tgt);return}
    if(Math.abs(th.current-tgt)<0.03&&Math.abs(om.current)<0.05)return;
    var last=0;
    function tick(t){var dt=last?Math.min((t-last)/1000,1/30):1/60;last=t;
      om.current+=(-SPRING*(th.current-tgt)-DAMP*om.current)*dt;th.current+=om.current*dt;
      if(Math.abs(th.current-tgt)<0.03&&Math.abs(om.current)<0.05){th.current=tgt;om.current=0;raf.current=0;setAng(tgt);return}
      setAng(th.current);raf.current=requestAnimationFrame(tick)}
    raf.current=requestAnimationFrame(tick);
    return function(){if(raf.current){cancelAnimationFrame(raf.current);raf.current=0}}},[tgt]);
  var sides={left:{label:p.left.label,value:L},right:{label:p.right.label,value:Rv}};
  function move(from){var src=from==='left'?L:Rv;if(src<step-1e-9)return;
    var nl=rnd(from==='left'?L-step:L+step),nr=rnd(from==='left'?Rv+step:Rv-step);
    lv[1](nl);rv[1](nr);if(p.onChange)p.onChange({left:nl,right:nr})}
  var svgRef=R.useRef(null),dr=S(null),drag=dr[0],setDrag=dr[1];
  function pt(e){var s=svgRef.current,m=s.getScreenCTM();if(!m)return [0,0];var q=s.createSVGPoint();q.x=e.clientX;q.y=e.clientY;q=q.matrixTransform(m.inverse());return [q.x,q.y]}
  var rad=ang*Math.PI/180,ends={left:[PX-ARM*Math.cos(rad),PY-ARM*Math.sin(rad)],right:[PX+ARM*Math.cos(rad),PY+ARM*Math.sin(rad)]};
  function down(e){if(!inter||(e.button!=null&&e.button>0))return;var side=e.target.getAttribute&&e.target.getAttribute('data-side');
    if(!side)return;e.preventDefault();try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    var q=pt(e);setDrag({side:side,x:q[0],y:q[1]})}
  function mv(e){if(!drag)return;var q=pt(e);setDrag({side:drag.side,x:q[0],y:q[1]})}
  function up(e){if(!drag)return;var q=pt(e),other=drag.side==='left'?'right':'left',c=ends[other][0];
    if(Math.abs(q[0]-c)<=72)move(drag.side);setDrag(null)}
  function cancel(){setDrag(null)}
  function key(e){if(!inter)return;if(e.key==='ArrowRight'){e.preventDefault();move('left')}else if(e.key==='ArrowLeft'){e.preventDefault();move('right')}}
  function pan(side){var v=sides[side].value,n=Math.floor(rnd(v/step)),shown=Math.min(n,MAXB),more=n-shown,e=ends[side];
    if(drag&&drag.side===side&&shown>0)shown-=1;
    var bl=[];for(var i=0;i<shown;i++){var xy=blockXY(i);
      bl.push(h('rect',{key:i,className:'cz-bal-blk','data-side':inter?side:null,x:xy[0],y:xy[1],width:BW,height:BH,rx:2}))}
    return h('g',{key:side,className:'cz-bal-pan',transform:'translate('+e[0].toFixed(2)+' '+e[1].toFixed(2)+')'},
      h('path',{className:'cz-bal-str',d:'M0 0 L-44 40 M0 0 L44 40'}),
      h('rect',{className:'cz-bal-tray',x:-48,y:40,width:96,height:58,rx:4}),
      bl,
      more>0?h('text',{className:'cz-bal-more',x:46,y:34,textAnchor:'end'},'+'+more):null)}
  var txt=readout(sides.left,sides.right,unit),bal=rnd(L)===rnd(Rv),heavy=bal?null:(L>Rv?'left':'right');
  var hintId=R.useId();
  var svgProps={ref:svgRef,className:'cz-bal-svg'+(inter?' cz-bal-live':''),viewBox:'0 0 300 160',focusable:inter?'true':'false'};
  if(inter){svgProps.tabIndex=0;svgProps.role='group';svgProps['aria-roledescription']='balance';
    svgProps['aria-label']=sides.left.label+' and '+sides.right.label+' balance';svgProps['aria-describedby']=hintId;
    svgProps.onKeyDown=key;svgProps.onPointerDown=down;svgProps.onPointerMove=mv;svgProps.onPointerUp=up;svgProps.onPointerCancel=cancel;svgProps.onLostPointerCapture=cancel}
  else{svgProps.role='img';svgProps['aria-label']=txt}
  function col(side){var s=sides[side],other=side==='left'?sides.right:sides.left,src=s.value;
    return h('div',{className:'cz-bal-col cz-bal-'+side},
      h('span',{className:'cz-bal-lb'+(heavy===side?' cz-bal-heavy':'')},s.label),
      h('span',{className:'cz-bal-val'},rnd(s.value)+(unit?' '+unit:'')),
      inter?h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-bal-b','aria-label':'Move one from '+s.label+' to '+other.label,
        disabled:src<step-1e-9,onClick:function(){move(side)}},side==='left'?'→':'←'):null)}
  return h('div',{className:'cz-bal'},
    h('svg',svgProps,
      h('path',{className:'cz-bal-ful',d:'M'+PX+' '+(PY+2)+' L'+(PX-16)+' 150 L'+(PX+16)+' 150 Z'}),
      h('line',{className:'cz-bal-base',x1:PX-40,x2:PX+40,y1:152,y2:152}),
      pan('left'),pan('right'),
      h('line',{className:'cz-bal-beam',x1:ends.left[0].toFixed(2),y1:ends.left[1].toFixed(2),x2:ends.right[0].toFixed(2),y2:ends.right[1].toFixed(2)}),
      h('circle',{className:'cz-bal-piv',cx:PX,cy:PY,r:4}),
      drag?h('rect',{className:'cz-bal-blk cz-bal-ghost',x:drag.x-BW/2,y:drag.y-BH/2,width:BW,height:BH,rx:2,'aria-hidden':'true'}):null),
    h('p',{className:'cz-bal-out','aria-live':'polite'},txt),
    h('div',{className:'cz-bal-row'},col('left'),col('right')),
    inter?h('p',{id:hintId,className:'cz-bal-hint'},'Drag a block to the other pan, or focus the balance and press Left or Right arrow.'):null)}
window.Componentia.BalanceBeam=BalanceBeam;})();

/* Componentia TearOffDate — forge_20261026T1300Z. Credit: Idea: the paper tear-off day calendar; near-duplicate seen: Tearaway Date by n1m4mz on 21st.dev (licence not read, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
var THRESH=70,G=2600,SPRING_MS=180,uid=0;
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function parse(iso){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso||'');return m?[+m[1],+m[2],+m[3]]:null}
function pad2(n){return(n<10?'0':'')+n}
function toISO(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())}
function addDays(iso,n){var p=parse(iso);return toISO(new Date(p[0],p[1]-1,p[2]+n))}
function norm(iso){var p=parse(iso);return p?toISO(new Date(p[0],p[1]-1,p[2])):null}
var FW=new Intl.DateTimeFormat('en-GB',{weekday:'long'}),FM=new Intl.DateTimeFormat('en-GB',{month:'long'}),
    FS=new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
function parts(iso){var p=parse(iso),d=new Date(p[0],p[1]-1,p[2]);
  return {wd:FW.format(d),day:p[2],mon:FM.format(d),yr:p[0],short:FS.format(d),
    long:FW.format(d)+' '+p[2]+' '+FM.format(d)+' '+p[0]}}
function Sheet(iso,notes,extra){var f=parts(iso),n=notes&&notes[iso];
  return h('div',extra,
    h('span',{className:'cz-tod-wd'},f.wd),
    h('span',{className:'cz-tod-day'},f.day),
    h('span',{className:'cz-tod-my'},f.mon+' '+f.yr),
    h('span',{className:'cz-tod-note'+(n?'':' cz-tod-nonote')},n||'No note'))}
function TearOffDate(p){
  var label=p.label||'Date',notes=p.notes||{},min=norm(p.min),max=norm(p.max);
  function clamp(iso){if(min&&iso<min)return min;if(max&&iso>max)return max;return iso}
  var st=S(function(){return clamp(norm(p.value||p.start)||toISO(new Date()))}),inner=st[0],setInner=st[1];
  var ctrl=p.value!=null,cur=ctrl?clamp(norm(p.value)):inner;
  var canNext=!max||cur<max,canPrev=!min||cur>min,next=addDays(cur,1);
  var rid=R.useId?R.useId():'',idr=R.useRef(null);if(!idr.current)idr.current='cz-tod'+(++uid)+String(rid).replace(/[^\w-]/g,'');var id=idr.current;var on=R.useRef(false);
  var rootRef=R.useRef(null),sheetRef=R.useRef(null),fallRef=R.useRef(null),raf=R.useRef(0);
  var fs=S(null),fall=fs[0],setFall=fs[1];
  var ds=S(null),drag=ds[0],setDrag=ds[1];
  var rs=S(0),rise=rs[0],setRise=rs[1];
  var ann=S(''),said=ann[0],setSaid=ann[1];
  function commit(iso){if(!ctrl)setInner(iso);setSaid(parts(iso).long+(notes[iso]?'. '+notes[iso]:''));if(p.onChange)p.onChange(iso)}
  function stopFall(){if(raf.current){cancelAnimationFrame(raf.current);raf.current=0}setFall(null)}
  R.useEffect(function(){return function(){if(raf.current)cancelAnimationFrame(raf.current)}},[]);
  /* physics: start when a faller mounts */
  R.useEffect(function(){if(!fall)return;
    var el=fallRef.current,root=rootRef.current;if(!el||!root){setFall(null);return}
    var s={x:fall.x,y:fall.y,r:fall.r,vx:fall.vx,vy:fall.vy,vr:fall.vr},last=0,t0=0,lim=root.clientHeight+40;
    function tick(t){if(!t0)t0=t;var dt=last?Math.min((t-last)/1000,1/30):1/60;last=t;
      s.vy+=G*dt;s.vx*=0.995;s.x+=s.vx*dt;s.y+=s.vy*dt;s.r+=s.vr*dt;
      el.style.transform='translate('+s.x.toFixed(1)+'px,'+s.y.toFixed(1)+'px) rotate('+s.r.toFixed(2)+'deg)';
      if(s.y>lim||Math.abs(s.x)>root.clientWidth+60||t-t0>3000){raf.current=0;setFall(null);return}
      raf.current=requestAnimationFrame(tick)}
    raf.current=requestAnimationFrame(tick);
    return function(){if(raf.current){cancelAnimationFrame(raf.current);raf.current=0}}},[fall&&fall.k]);
  function tear(x,y,vx,vy){if(!canNext)return false;var old=cur;stopFall();setRise(0);
    if(!reduced()){var dir=x!==0?(x>0?1:-1):((parseInt(old.slice(8),10)%2)?1:-1);
      setFall({k:old+':'+Date.now(),iso:old,x:x,y:y,r:x*0.12,
        vx:vx||dir*90,vy:vy!=null?vy:-140,vr:dir*(70+Math.min(160,Math.abs(vx||0)*0.15))})}
    commit(next);return true}
  function goNext(){tear(0,0)}
  function goPrev(){if(!canPrev)return;stopFall();setDrag(null);if(!reduced())setRise(function(n){return n+1});commit(addDays(cur,-1))}
  function key(e){var k=e.key;
    if(k==='ArrowDown'||k==='PageDown'){e.preventDefault();goNext()}
    else if(k==='ArrowUp'||k==='PageUp'){e.preventDefault();goPrev()}}
  function down(e){if(e.button!=null&&e.button>0)return;if(!canNext)return;e.preventDefault();on.current=true;
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    setDrag({x0:e.clientX,y0:e.clientY,dx:0,dy:0,t:performance.now(),vx:0,vy:0,back:false})}
  function mv(e){if(!on.current||!drag||drag.back)return;var dx=e.clientX-drag.x0,dy=Math.max(-8,e.clientY-drag.y0),now=performance.now(),dt=Math.max(1,now-drag.t);
    setDrag({x0:drag.x0,y0:drag.y0,dx:dx,dy:dy,t:now,vx:(dx-drag.dx)/dt*1000,vy:(dy-drag.dy)/dt*1000,back:false})}
  function up(){if(!on.current||!drag||drag.back)return;on.current=false;var dx=drag.dx,dy=drag.dy,dist=Math.sqrt(dx*dx+Math.max(0,dy)*dy);
    if(dist>=THRESH&&canNext){setDrag(null);tear(dx*0.8,Math.max(0,dy),Math.max(-1500,Math.min(1500,drag.vx)),Math.max(0,Math.min(1500,drag.vy)))}
    else if(reduced()||(dx===0&&dy===0)){setDrag(null)}
    else{setDrag({x0:0,y0:0,dx:0,dy:0,t:0,vx:0,vy:0,back:true});setTimeout(function(){setDrag(function(d){return d&&d.back?null:d})},SPRING_MS+20)}}
  function cancel(){on.current=false;if(drag&&!drag.back)setDrag(null)}
  var tx=drag&&!drag.back?drag.dx*0.8:0,ty=drag&&!drag.back?Math.max(0,drag.dy):0,live=drag&&!drag.back;
  var sheetStyle=live?{transform:'translate('+tx.toFixed(1)+'px,'+ty.toFixed(1)+'px) rotate('+(tx*0.12).toFixed(2)+'deg)'}:null;
  var pulled=live&&Math.sqrt(drag.dx*drag.dx+Math.max(0,drag.dy)*drag.dy)>=THRESH;
  var lo=min?parts(min).short:null,hi=max?parts(max).short:null;
  var range=lo&&hi?'Dates from '+lo+' to '+hi+'. ':lo?'Earliest date '+lo+'. ':hi?'Latest date '+hi+'. ':'';
  var cf=parts(cur);
  return h('div',{className:'cz-tod',ref:rootRef},
    h('span',{className:'cz-tod-lb',id:id+'-lb'},label),
    h('div',{className:'cz-tod-pad',tabIndex:0,role:'group','aria-roledescription':'tear-off calendar',
      'aria-labelledby':id+'-lb '+id+'-cur','aria-describedby':id+'-hint',onKeyDown:key},
      h('span',{id:id+'-cur',className:'cz-tod-sr'},cf.long+(notes[cur]?', '+notes[cur]:'')),
      h('div',{className:'cz-tod-bind','aria-hidden':'true'},h('i'),h('i'),h('i')),
      h('div',{className:'cz-tod-stack','aria-hidden':'true'},
        h('div',{className:'cz-tod-edge cz-tod-e3'}),h('div',{className:'cz-tod-edge cz-tod-e2'}),h('div',{className:'cz-tod-edge cz-tod-e1'}),
        live&&canNext?Sheet(next,notes,{className:'cz-tod-sheet cz-tod-under'}):null,
        Sheet(cur,notes,{key:'top'+(rise?'-r'+rise:''),ref:sheetRef,
          className:'cz-tod-sheet cz-tod-top'+(canNext?' cz-tod-grab':'')+(live?' cz-tod-drag':'')+(drag&&drag.back?' cz-tod-back':'')+(pulled?' cz-tod-pulled':'')+(rise?' cz-tod-rise':''),
          style:sheetStyle,onPointerDown:down,onPointerMove:mv,onPointerUp:up,onPointerCancel:cancel,onLostPointerCapture:up}),
        fall?Sheet(fall.iso,notes,{key:fall.k,ref:fallRef,className:'cz-tod-sheet cz-tod-fall',
          style:{transform:'translate('+fall.x+'px,'+fall.y+'px) rotate('+fall.r+'deg)'}}):null)),
    h('div',{className:'cz-tod-row'},
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-tod-b',disabled:!canPrev,onClick:goPrev},'Previous day'),
      h('button',{type:'button',className:'cz-btn cz-btn-primary cz-tod-b',disabled:!canNext,onClick:goNext},'Next day')),
    h('p',{id:id+'-hint',className:'cz-tod-hint'},range+'Pull the top sheet down or sideways to tear it off. On the pad, Arrow Down shows the next day and Arrow Up the previous one.'),
    h('p',{className:'cz-tod-sr','aria-live':'polite'},said))}
window.Componentia.TearOffDate=TearOffDate;})();

/* Componentia PourMeasure — forge_20261026T1300Z. Credit: Idea: the measuring jug; near-duplicates seen: Kokonut UI Liquid Slider (21st.dev), liquid_bottle (pub.dev), LiquidButton by yoruriko (licences not read, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
/* glass interior x 163..247, liquid bottom y 247, full height FH; jug pivots round its spout tip (SX,SY) */
var GX0=160,GX1=250,GTOP=100,GBOT=250,IX0=163,IX1=247,IBOT=247,FH=128,SX=172,SY=92;
var POUR_AT=25,MAX_TILT=60,NW=7,WK=40,WC=120,WD=4.5;
var BODY='M-86 -4 L-22 -4 L0 -1 L-20 10 L-24 70 Q-24 76 -30 76 L-80 76 Q-86 76 -86 70 Z';
var seq=0;
function rnd(n){return Math.round(n*1e6)/1e6}
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function nice(x){var p=Math.pow(10,Math.floor(Math.log(x)/Math.LN10)),c=[1,2,2.5,5,10];for(var i=0;i<c.length;i++)if(c[i]*p>=x-1e-9)return c[i]*p;return 10*p}
function PourMeasure(p){
  var max=p.max>0?+p.max:500,step=p.step>0?+p.step:10,unit=p.unit!=null?p.unit:'ml',tg=p.target!=null?+p.target:null;
  function snap(n){n=Math.round(n/step)*step;return rnd(Math.max(0,Math.min(max,n)))}
  var init=snap(p.value!=null?+p.value:(p.defaultValue!=null?+p.defaultValue:0));
  var vs=S(init),val=vs[0],setVal=vs[1],fr=S(0),rerender=fr[1];
  var fv=R.useRef(init),tilt=R.useRef(0),drag=R.useRef(null),band=R.useRef(0),raf=R.useRef(0),last=R.useRef(0),clock=R.useRef(0);
  var wh=R.useRef([0,0,0,0,0,0,0]),wv=R.useRef([0,0,0,0,0,0,0]),svgRef=R.useRef(null);
  var ids=R.useRef(null);if(!ids.current){seq+=1;ids.current='cz-pour-'+seq}
  var uid=ids.current;
  R.useEffect(function(){if(p.value!=null&&!drag.current){var n=snap(+p.value);fv.current=n;setVal(n)}},[p.value]);
  R.useEffect(function(){return function(){if(raf.current)cancelAnimationFrame(raf.current);raf.current=0}},[]);
  function commit(n){n=snap(n);fv.current=n;setVal(n);if(n!==val&&p.onChange)p.onChange(n)}
  function waveSmall(){for(var i=0;i<NW;i++)if(Math.abs(wh.current[i])>0.05||Math.abs(wv.current[i])>0.05)return false;return true}
  function tick(t){var dt=last.current?Math.min((t-last.current)/1000,1/30):1/60;last.current=t;clock.current+=dt;
    var H=wh.current,V=wv.current,dr=drag.current,a=tilt.current;
    if(dr&&a>POUR_AT&&fv.current<max){var k=(a-POUR_AT)/(MAX_TILT-POUR_AT);
      fv.current=Math.min(max,fv.current+k*max*0.3*dt);
      V[1]+=k*90*dt*Math.sin(clock.current*23);V[2]+=k*50*dt*Math.cos(clock.current*17)}
    if(!dr&&a>0){tilt.current=Math.max(0,a-240*dt)}
    var acc=[];for(var i=0;i<NW;i++){var l=i>0?H[i-1]:H[i],r=i<NW-1?H[i+1]:H[i];acc.push(-WK*H[i]+WC*(l+r-2*H[i])-WD*V[i])}
    for(i=0;i<NW;i++){V[i]+=acc[i]*dt;H[i]=Math.max(-4,Math.min(4,H[i]+V[i]*dt))}
    if(!dr&&tilt.current===0&&waveSmall()){for(i=0;i<NW;i++){H[i]=0;V[i]=0}raf.current=0;last.current=0;rerender(function(x){return x+1});return}
    rerender(function(x){return x+1});raf.current=requestAnimationFrame(tick)}
  function run(){if(reduced()){tilt.current=drag.current?tilt.current:0;for(var i=0;i<NW;i++){wh.current[i]=0;wv.current[i]=0}return}
    if(!raf.current){last.current=0;raf.current=requestAnimationFrame(tick)}}
  function slosh(dir){if(reduced())return;var V=wv.current;for(var i=0;i<NW;i++)V[i]+=(i%2?1:-1)*5*dir+(i-3)*dir*1.5;run()}
  function setTo(n){var o=val;commit(n);if(snap(n)!==o)slosh(snap(n)>o?1:-1)}
  function pt(e){var s=svgRef.current,m=s&&s.getScreenCTM();if(!m)return [0,0];var q=s.createSVGPoint();q.x=e.clientX;q.y=e.clientY;q=q.matrixTransform(m.inverse());return [q.x,q.y]}
  function down(e){if(e.button!=null&&e.button>0)return;if(!(e.target.getAttribute&&e.target.getAttribute('data-jug')))return;
    e.preventDefault();try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    try{e.currentTarget.focus({preventScroll:true})}catch(_){}
    var q=pt(e);drag.current={x:q[0],y:q[1]};band.current=0;run();rerender(function(x){return x+1})}
  function move(e){var d=drag.current;if(!d)return;var q=pt(e),a=Math.max(0,Math.min(MAX_TILT,((q[0]-d.x)+(q[1]-d.y))*0.6));
    tilt.current=a;
    if(reduced()){var b=a>POUR_AT?Math.floor((a-POUR_AT)/5)+1:0;if(b>band.current){fv.current=Math.min(max,fv.current+step*(b-band.current))}band.current=Math.max(band.current,b)}
    rerender(function(x){return x+1})}
  function up(){if(!drag.current)return;drag.current=null;commit(fv.current);
    if(reduced())tilt.current=0;else run();rerender(function(x){return x+1})}
  function key(e){var n=null,k=e.key;
    if(k==='ArrowUp'||k==='ArrowRight')n=val+step;else if(k==='ArrowDown'||k==='ArrowLeft')n=val-step;
    else if(k==='PageUp')n=val+5*step;else if(k==='PageDown')n=val-5*step;else if(k==='Home')n=0;else if(k==='End')n=max;
    if(n==null)return;e.preventDefault();setTo(n)}
  var dragging=!!drag.current,a=tilt.current,live=dragging?snap(fv.current):val;
  var u=unit?' '+unit:'';
  function amt(n){return rnd(n)+u}
  var status=tg==null?null:(live<tg-1e-9?amt(tg-live)+' to target':(live>tg+1e-9?amt(live-tg)+' over target':'On target'));
  var vtext=amt(live)+' of '+amt(max)+(tg!=null?', target '+amt(tg):'');
  /* glass geometry */
  var lvl=IBOT-Math.max(0,Math.min(max,fv.current))/max*FH,H=wh.current,dx=(IX1-IX0)/(NW-1);
  var liq=null;if(lvl<IBOT-0.4){var d='M'+IX0+' '+(lvl+H[0]).toFixed(2);
    for(var i=1;i<NW;i++){var x0=IX0+(i-1)*dx,x1=IX0+i*dx,mx=(x0+x1)/2;d+=' C'+mx.toFixed(1)+' '+(lvl+H[i-1]).toFixed(2)+' '+mx.toFixed(1)+' '+(lvl+H[i]).toFixed(2)+' '+x1.toFixed(1)+' '+(lvl+H[i]).toFixed(2)}
    d+=' L'+IX1+' '+(IBOT+4)+' L'+IX0+' '+(IBOT+4)+' Z';liq=h('path',{className:'cz-pour-liq',d:d,clipPath:'url(#'+uid+'-g)'})}
  var maj=nice(max/5),minr=maj/2,ticks=[];
  for(var v=0;v<=max+1e-9;v=rnd(v+minr)){var y=IBOT-v/max*FH,isM=Math.abs(v/maj-Math.round(v/maj))<1e-6;
    ticks.push(h('line',{key:'t'+v,className:isM?'cz-pour-tk cz-pour-tkm':'cz-pour-tk',x1:IX1-(isM?12:6),x2:IX1,y1:y.toFixed(1),y2:y.toFixed(1)}));
    if(isM)ticks.push(h('text',{key:'l'+v,className:'cz-pour-num',x:GX1+5,y:(y+4).toFixed(1)},rnd(v)+(v+maj>max+1e-9?u:'')))}
  var tgt=null;if(tg!=null&&tg>=0&&tg<=max){var ty=(IBOT-tg/max*FH).toFixed(1);
    tgt=h('g',{className:'cz-pour-tg'},
      h('line',{className:'cz-pour-tgu',x1:IX0,x2:IX1,y1:ty,y2:ty}),
      h('line',{className:'cz-pour-tgl',x1:GX0-22,x2:IX1,y1:ty,y2:ty}),
      h('text',{className:'cz-pour-tgt',x:GX0-26,y:(+ty+4).toFixed(1),textAnchor:'end'},'Target'))}
  var jt='translate('+SX+' '+SY+') rotate('+a.toFixed(2)+')';
  var jl=SY+2+32*(1-Math.min(a,POUR_AT)/POUR_AT);
  var pouring=a>POUR_AT&&fv.current<max&&dragging;
  var streamW=pouring?(2+4*(a-POUR_AT)/(MAX_TILT-POUR_AT)).toFixed(2):0;
  var labId=uid+'-lb',hintId=uid+'-h';
  var glassD='M'+GX0+' '+GTOP+' L'+GX0+' '+(GBOT-6)+' Q'+GX0+' '+GBOT+' '+(GX0+6)+' '+GBOT+' L'+(GX1-6)+' '+GBOT+' Q'+GX1+' '+GBOT+' '+GX1+' '+(GBOT-6)+' L'+GX1+' '+GTOP;
  var inD='M'+IX0+' '+GTOP+' L'+IX1+' '+GTOP+' L'+IX1+' '+IBOT+' L'+IX0+' '+IBOT+' Z';
  return h('div',{className:'cz-pour'},
    h('div',{id:labId,className:'cz-pour-lb'},p.label),
    h('svg',{ref:svgRef,className:'cz-pour-svg'+(dragging?' cz-pour-dragging':''),viewBox:'0 8 300 254',tabIndex:0,role:'slider',
      'aria-labelledby':labId,'aria-describedby':hintId,'aria-valuemin':0,'aria-valuemax':max,'aria-valuenow':live,'aria-valuetext':vtext,
      'aria-orientation':'vertical',onKeyDown:key,onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up,onLostPointerCapture:up},
      h('defs',null,
        h('clipPath',{id:uid+'-g'},h('path',{d:inD})),
        h('clipPath',{id:uid+'-j'},h('path',{d:BODY,transform:jt}))),
      h('path',{className:'cz-pour-in',d:inD}),
      liq,
      pouring?h('line',{className:'cz-pour-stream',x1:SX,y1:SY,x2:SX,y2:(lvl+1).toFixed(1),style:{strokeWidth:streamW},'aria-hidden':'true'}):null,
      ticks,tgt,
      h('path',{className:'cz-pour-glass',d:glassD}),
      h('g',{className:'cz-pour-jug'},
        h('g',{transform:jt},
          h('path',{className:'cz-pour-handle',d:'M-86 8 C-112 8 -112 56 -86 56'}),
          h('path',{className:'cz-pour-body',d:BODY})),
        h('rect',{className:'cz-pour-jliq',x:40,y:jl.toFixed(1),width:180,height:200,clipPath:'url(#'+uid+'-j)'}),
        h('path',{className:'cz-pour-rim',d:BODY,transform:jt}),
        h('rect',{className:'cz-pour-hit','data-jug':'1',x:-116,y:-14,width:122,height:96,transform:jt}))),
    h('div',{className:'cz-pour-out','aria-live':'polite','aria-busy':dragging?'true':'false'},
      h('span',{className:'cz-pour-val'},amt(live)),
      status?h('span',{className:'cz-pour-st'+(status==='On target'?' cz-pour-on':'')},status):null),
    h('div',{className:'cz-pour-row'},
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-pour-b',disabled:val>=max,onClick:function(){setTo(val+step)}},'Pour '+amt(step)),
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-pour-b',disabled:val<=0,onClick:function(){setTo(val-step)}},'Remove '+amt(step)),
      h('button',{type:'button',className:'cz-btn cz-btn-ghost cz-pour-b',disabled:val<=0,onClick:function(){setTo(0)}},'Empty')),
    h('p',{id:hintId,className:'cz-pour-hint'},'Drag the jug down or right to pour; let go to stop. Or focus the glass and use the arrow keys, Page Up, Page Down, Home and End.'))}
window.Componentia.PourMeasure=PourMeasure;})();

/* Componentia CompassHeading — forge_20261026T1300Z. Credit: Idea: the mariner's compass rose (public domain); near-duplicates seen: Syncfusion compass gauge, Node-RED ui-compass, Ignition compass, Grafana compass panel, Uiverse compass loader by Nawsome (no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
var C=120,RING=110,SPRING=90,DAMP=9;
var WINDS=['north','north-north-east','north-east','east-north-east','east','east-south-east','south-east','south-south-east','south','south-south-west','south-west','west-south-west','west','west-north-west','north-west','north-north-west'];
var CARD=[['N',0],['E',90],['S',180],['W',270]],INTER=[['NE',45],['SE',135],['SW',225],['NW',315]];
var uid=0;
function norm(d){d=Math.round(d)%360;return d<0?d+360:d}
function wind(d){return WINDS[Math.round(norm(d)/22.5)%16]}
function snapTo(d,snap){if(snap===8||snap===16){var u=360/snap;return norm(Math.round(d/u)*u)}return norm(d)}
function delta(from,to){var d=((to-from)%360+540)%360-180;return d}
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function polar(r,deg){var a=deg*Math.PI/180;return [C+r*Math.sin(a),C-r*Math.cos(a)]}
function f(n){return n.toFixed(2)}
function rose(){var out=[],i,p,q;
  out.push(h('circle',{key:'ring',className:'cz-cmp-ring',cx:C,cy:C,r:RING}));
  for(i=10;i<360;i+=10){var len=i%90===0?22:(i%30===0?16:8);p=polar(RING-2,i);q=polar(RING-2-len,i);
    out.push(h('line',{key:'t'+i,className:'cz-cmp-tick'+(i%30===0?' cz-cmp-tick-major':''),x1:f(p[0]),y1:f(p[1]),x2:f(q[0]),y2:f(q[1])}))}
  out.push(h('path',{key:'nmark',className:'cz-cmp-nmark',d:'M'+C+' '+(C-RING+3)+' L'+(C+8)+' '+(C-RING+19)+' L'+(C-8)+' '+(C-RING+19)+' Z'}));
  CARD.forEach(function(c){p=polar(72,c[1]);
    out.push(h('text',{key:c[0],className:'cz-cmp-card'+(c[0]==='N'?' cz-cmp-north':''),x:f(p[0]),y:f(p[1]),textAnchor:'middle',dominantBaseline:'central'},c[0]))});
  INTER.forEach(function(c){p=polar(74,c[1]);
    out.push(h('text',{key:c[0],className:'cz-cmp-inter',x:f(p[0]),y:f(p[1]),textAnchor:'middle',dominantBaseline:'central'},c[0]))});
  return out}
var ROSE=null;
function CompassHeading(p){
  var ro=!!p.readOnly,step=p.step>0?p.step:1,snap=(p.snap===8||p.snap===16)?p.snap:false;
  var unitStep=snap?Math.max(step,360/snap):step;
  var btnStep=snap?unitStep:(step===1?15:step);
  var ctrl=p.value!=null;
  var st=S(snapTo(+(p.defaultValue||0),snap)),inner=st[0],setInner=st[1];
  var val=ctrl?snapTo(+p.value||0,snap):inner;
  function set(d){var n=snapTo(d,snap);if(n===val)return;if(!ctrl)setInner(n);if(p.onChange)p.onChange(n)}
  /* needle spring on an unwrapped angle so it always takes the short way across 0/360 */
  var ds=S(val),disp=ds[0],setDisp=ds[1];
  var th=R.useRef(val),om=R.useRef(0),raf=R.useRef(0),goal=R.useRef(val);
  R.useEffect(function(){
    goal.current=th.current+delta(th.current,val);
    if(raf.current){cancelAnimationFrame(raf.current);raf.current=0}
    if(reduced()){th.current=goal.current;om.current=0;setDisp(th.current);return}
    if(Math.abs(th.current-goal.current)<0.05&&Math.abs(om.current)<0.05)return;
    var last=0;
    function tick(t){var dt=last?Math.min((t-last)/1000,1/30):1/60;last=t;
      om.current+=(-SPRING*(th.current-goal.current)-DAMP*om.current)*dt;th.current+=om.current*dt;
      if(Math.abs(th.current-goal.current)<0.05&&Math.abs(om.current)<0.05){th.current=goal.current;om.current=0;raf.current=0;setDisp(th.current);return}
      setDisp(th.current);raf.current=requestAnimationFrame(tick)}
    raf.current=requestAnimationFrame(tick);
    return function(){if(raf.current){cancelAnimationFrame(raf.current);raf.current=0}}},[val]);
  var idRef=R.useRef(null);if(!idRef.current){idRef.current=(R.useId?null:'cz-cmp-'+(++uid))}
  var rid=R.useId?R.useId():idRef.current,labId=rid+'-l',hintId=rid+'-h';
  var svgRef=R.useRef(null),dragging=R.useRef(false);
  function angleAt(e){var b=svgRef.current.getBoundingClientRect(),cx=b.left+b.width/2,cy=b.top+b.height/2;
    return Math.atan2(e.clientX-cx,cy-e.clientY)*180/Math.PI}
  function roundStep(d){return snap?d:Math.round(d/step)*step}
  function down(e){if(e.button!=null&&e.button>0)return;e.preventDefault();dragging.current=true;
    try{svgRef.current.focus({preventScroll:true})}catch(_){}
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    set(roundStep(angleAt(e)))}
  function mv(e){if(!dragging.current)return;set(roundStep(angleAt(e)))}
  function up(){dragging.current=false}
  function key(e){var k=e.key,n=null;
    if(k==='ArrowRight'||k==='ArrowUp')n=val+unitStep;
    else if(k==='ArrowLeft'||k==='ArrowDown')n=val-unitStep;
    else if(k==='PageUp')n=val+45;else if(k==='PageDown')n=val-45;
    else if(k==='Home')n=0;
    if(n!==null){e.preventDefault();set(n)}}
  var words=wind(val),vt=val+' degrees, '+words;
  if(!ROSE)ROSE=rose();
  var svgProps={ref:svgRef,className:'cz-cmp-svg'+(ro?'':' cz-cmp-live'),viewBox:'0 0 240 240'};
  if(ro){svgProps.role='img';svgProps['aria-label']=p.label+': '+vt}
  else{svgProps.tabIndex=0;svgProps.role='slider';svgProps['aria-labelledby']=labId;svgProps['aria-describedby']=hintId;
    svgProps['aria-valuemin']=0;svgProps['aria-valuemax']=359;svgProps['aria-valuenow']=val;svgProps['aria-valuetext']=vt;
    svgProps['aria-orientation']='horizontal';
    svgProps.onKeyDown=key;svgProps.onPointerDown=down;svgProps.onPointerMove=mv;svgProps.onPointerUp=up;svgProps.onPointerCancel=up;svgProps.onLostPointerCapture=up}
  var tail=polar(26,disp+180),tipL=polar(7,disp-90),tipR=polar(7,disp+90),tip=polar(64,disp);
  return h('div',{className:'cz-cmp'+(ro?' cz-cmp-ro':'')},
    h('span',{id:labId,className:'cz-cmp-lb'},p.label),
    h('div',{className:'cz-cmp-wrap'},
      h('svg',svgProps,ROSE,
        h('g',{className:'cz-cmp-needle','aria-hidden':'true'},
          h('path',{className:'cz-cmp-tail',d:'M'+f(tipL[0])+' '+f(tipL[1])+' L'+f(tail[0])+' '+f(tail[1])+' L'+f(tipR[0])+' '+f(tipR[1])+' Z'}),
          h('path',{className:'cz-cmp-tip',d:'M'+f(tipL[0])+' '+f(tipL[1])+' L'+f(tip[0])+' '+f(tip[1])+' L'+f(tipR[0])+' '+f(tipR[1])+' Z'}),
          h('circle',{className:'cz-cmp-hub',cx:C,cy:C,r:5})))),
    h('p',{className:'cz-cmp-out','aria-live':ro?null:'polite','aria-hidden':ro?'true':null},
      h('span',{className:'cz-cmp-deg'},val+'°'),' · ',words),
    ro?null:h('div',{className:'cz-cmp-row'},
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-cmp-b',onClick:function(){set(val-btnStep)}},'Turn left '+btnStep+'°'),
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-cmp-b',onClick:function(){set(val+btnStep)}},'Turn right '+btnStep+'°')),
    ro?null:h('p',{id:hintId,className:'cz-cmp-hint'},'Drag around the rose, or focus it and use the arrow keys. Home points north.'))}
window.Componentia.CompassHeading=CompassHeading;})();

/* Componentia DaylightArc — forge_20261026T1300Z. Credit: Idea: the sun's arc as a time picker; near-duplicates seen: Arc Picker by starc007 and Radial Time Picker by mathewsaju210 on 21st.dev, circular_time_range_picker (pub.dev), circular-slider (npm) (licences not read, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
var CX=160,CY=158,RX=136,RY=124,SUN=9;
var uid=0;
function parse(s,fb){var m=/^(\d{1,2}):(\d{2})$/.exec(String(s==null?'':s).trim());if(!m)return fb;var v=(+m[1])*60+(+m[2]);return v>=0&&v<=1440?v:fb}
function pad(n){return (n<10?'0':'')+n}
function hhmm(v){return pad(Math.floor(v/60))+':'+pad(v%60)}
function fmt(v,h12){var H=Math.floor(v/60)%24,M=v%60;
  if(!h12)return pad(H)+':'+pad(M);
  var ap=H<12?'AM':'PM',hh=H%12===0?12:H%12;return hh+':'+pad(M)+' '+ap}
function hourLabel(H,h12){H=H%24;if(!h12)return pad(H);var ap=H<12?'AM':'PM';return (H%12===0?12:H%12)+' '+ap}
function dur(m){var hh=Math.floor(m/60),mm=m%60;
  if(hh&&mm)return hh+' h '+mm+' min';if(hh)return hh+' h';return mm+' min'}
function pt(f,dr,dy){var t=Math.PI*(1-f);return [CX+(RX+(dr||0))*Math.cos(t),CY-(RY+(dy==null?(dr||0):dy))*Math.sin(t)]}
function n2(a){return a.toFixed(2)}
function arcPath(f0,f1){var a=pt(f0),b=pt(f1);return 'M'+n2(a[0])+' '+n2(a[1])+' A'+RX+' '+RY+' 0 0 1 '+n2(b[0])+' '+n2(b[1])}
function DaylightArc(p){
  var st=parse(p.start,360),en=parse(p.end,1200);if(en<=st)en=st+60;
  var step=p.step>0?Math.round(p.step):15,h12=p.hour12!==false,span=en-st;
  function snap(v){var s=st+Math.round((v-st)/step)*step;if(s>en)s-=step;return Math.max(st,Math.min(en,s))}
  var ctrl=p.value!=null,is=S(function(){return snap(parse(p.defaultValue,st))}),inner=is[0],setInner=is[1];
  var val=ctrl?snap(parse(p.value,st)):inner;
  var idr=R.useRef(null);if(!idr.current){uid+=1;idr.current='cz-arc-'+uid}var id=idr.current;
  var svgRef=R.useRef(null),dg=S(false),drag=dg[0],setDrag=dg[1];
  function set(v){v=snap(v);if(v===val)return;if(!ctrl)setInner(v);if(p.onChange)p.onChange(hhmm(v))}
  function fromPointer(e){var s=svgRef.current,m=s&&s.getScreenCTM();if(!m)return null;var q=s.createSVGPoint();q.x=e.clientX;q.y=e.clientY;q=q.matrixTransform(m.inverse());
    var t=Math.atan2((CY-q.y)/RY,(q.x-CX)/RX);if(t<0)t=q.x<CX?Math.PI:0;
    return st+(1-t/Math.PI)*span}
  function down(e){if(e.button!=null&&e.button>0)return;var v=fromPointer(e);if(v==null)return;e.preventDefault();
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}try{e.currentTarget.focus({preventScroll:true})}catch(_){}
    setDrag(true);set(v)}
  function mv(e){if(!drag)return;var v=fromPointer(e);if(v!=null)set(v)}
  function stop(){setDrag(false)}
  function key(e){var k=e.key,d=null;
    if(k==='ArrowRight'||k==='ArrowUp')d=val+step;else if(k==='ArrowLeft'||k==='ArrowDown')d=val-step;
    else if(k==='PageUp')d=val+60;else if(k==='PageDown')d=val-60;else if(k==='Home')d=st;else if(k==='End')d=en;
    if(d==null)return;e.preventDefault();set(d)}
  var f=(val-st)/span,sun=pt(f);
  /* hour ticks and labels */
  var every=span<=13*60?2:3,ticks=[],labels=[];
  for(var H=Math.ceil(st/60);H*60<=en;H++){var fh=(H*60-st)/span,a=pt(fh,-6),b=pt(fh,6);
    ticks.push(h('line',{key:'t'+H,className:'cz-arc-tick',x1:n2(a[0]),y1:n2(a[1]),x2:n2(b[0]),y2:n2(b[1])}));
    if(H%every===0&&H*60-st>=90&&en-H*60>=90){var c=pt(fh,-30,-26);
      labels.push(h('text',{key:'l'+H,className:'cz-arc-hl',x:n2(c[0]),y:n2(c[1]+3.5),textAnchor:'middle'},hourLabel(H,h12)))}}
  var rays=[];for(var i=0;i<8;i++){var t=i*Math.PI/4,c1=Math.cos(t),s1=Math.sin(t);
    rays.push(h('line',{key:i,className:'cz-arc-ray',x1:n2(c1*(SUN+3)),y1:n2(s1*(SUN+3)),x2:n2(c1*(SUN+7)),y2:n2(s1*(SUN+7))}))}
  var vt=fmt(val,h12),left=en-val,lid=id+'-l',hid=id+'-h';
  return h('div',{className:'cz-arc'},
    h('div',{className:'cz-arc-lb',id:lid},p.label),
    h('svg',{ref:svgRef,className:'cz-arc-svg'+(drag?' cz-arc-drag':''),viewBox:'0 0 320 186',tabIndex:0,role:'slider',focusable:'true',
      'aria-labelledby':lid,'aria-describedby':hid,'aria-orientation':'horizontal','aria-valuemin':st,'aria-valuemax':en,'aria-valuenow':val,'aria-valuetext':vt,
      onKeyDown:key,onPointerDown:down,onPointerMove:mv,onPointerUp:stop,onPointerCancel:stop,onLostPointerCapture:stop},
      h('path',{className:'cz-arc-rest',d:arcPath(f,1)}),
      f>0?h('path',{className:'cz-arc-done',d:arcPath(0,f)}):null,
      ticks,labels,
      h('line',{className:'cz-arc-hz',x1:6,x2:314,y1:CY,y2:CY}),
      h('text',{className:'cz-arc-end',x:CX-RX,y:CY+20,textAnchor:'middle'},fmt(st,h12)),
      h('text',{className:'cz-arc-end',x:CX+RX,y:CY+20,textAnchor:'middle'},fmt(en,h12)),
      h('g',{className:'cz-arc-sun',style:{transform:'translate('+n2(sun[0])+'px,'+n2(sun[1])+'px)'}},
        rays,h('circle',{className:'cz-arc-disc',r:SUN}))),
    h('div',{className:'cz-arc-out','aria-live':'polite','aria-atomic':'true'},
      h('div',{className:'cz-arc-time'},vt),
      h('div',{className:'cz-arc-left'},left>0?dur(left)+' to end':'At the end time')),
    h('div',{className:'cz-arc-row'},
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-arc-b',disabled:val<=st,onClick:function(){set(val-step)}},'Earlier'),
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-arc-b',disabled:val>=en,onClick:function(){set(val+step)}},'Later')),
    h('p',{id:hid,className:'cz-arc-hint'},'Drag the sun along the arc, or focus it and use the arrow keys. Steps of '+step+' min.'))}
window.Componentia.DaylightArc=DaylightArc;})();

/* Componentia PullCord — forge_20261026T1300Z. Credit: Idea: the ceiling pull-cord switch; near-duplicates seen: Kokonut UI Pull Cord, Pull Lamp by aqualang89, Blind Pull Toggle by aicanvas (21st.dev), 19 Rope Toggle (Framer) (licences not read, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
/* rope geometry in viewBox units: anchor under the plate, N points, SEG apart */
var N=10,AX=56,AY=20,SEG=7,LEN=SEG*(N-1),REST=AY+LEN,MAXS=44,THR=26,BR=9,HIT=24,SWAY=36;
var G=0.25,DAMP=0.985,ITER=12,MAXT=3000,DIP=0.12;
var GX=150,GY=66,GR1=22,GR2=34,cnt=0;
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function now(){return (window.performance&&performance.now)?performance.now():Date.now()}
function restPts(){var a=[];for(var i=0;i<N;i++){var y=AY+i*SEG;a.push({x:AX,y:y,px:AX,py:y})}return a}
function f1(n){return Math.round(n*10)/10}
function arc(r1,r2){var a0=25*Math.PI/180,a1=155*Math.PI/180;
  function P(r,a){return f1(GX+r*Math.cos(a))+' '+f1(GY+r*Math.sin(a))}
  return 'M'+P(r2,a0)+' A'+r2+' '+r2+' 0 0 1 '+P(r2,a1)+' L'+P(r1,a1)+' A'+r1+' '+r1+' 0 0 0 '+P(r1,a0)+' Z'}
var GLOW=arc(GR1,GR2);
function PullCord(p){
  var ctl=p.checked!=null,st=S(!!p.defaultChecked),on=ctl?!!p.checked:st[0];
  var onL=p.onLabel||'On',offL=p.offLabel||'Off',word=on?onL:offL;
  var uid=R.useId?R.useId():'',idr=R.useRef(null);
  if(!idr.current)idr.current='cz-cord-'+(uid?uid.replace(/[^a-zA-Z0-9_-]/g,''):'n'+(++cnt));
  var lblId=idr.current+'-l',hintId=idr.current+'-h';
  var live=S(''),fr=S(0),onRef=R.useRef(on),svgRef=R.useRef(null),sim=R.useRef(null);
  onRef.current=on;
  if(!sim.current)sim.current={pts:restPts(),seg:SEG,mode:'free',tx:AX,ty:REST,t0:0,sc:0,raf:0,quiet:0,sup:false,past:false};
  R.useEffect(function(){return function(){var s=sim.current;if(s.raf){cancelAnimationFrame(s.raf);s.raf=0}}},[]);
  function draw(){fr[1](function(n){return n+1})}
  function setOn(v){if(!ctl)st[1](v);live[1](p.label+': '+(v?onL:offL));if(p.onChange)p.onChange(v)}
  function settle(s){if(s.raf){cancelAnimationFrame(s.raf);s.raf=0}s.pts=restPts();s.seg=SEG;s.mode='free';s.past=false;draw()}
  function pinned(s){return s.mode==='drag'||s.mode==='script'}
  function step(s){var pts=s.pts,i,k,a,b,pin=pinned(s);
    if(!pin)s.seg=SEG+(s.seg-SEG)*0.82;
    for(i=1;i<N;i++){a=pts[i];var vx=(a.x-a.px)*DAMP,vy=(a.y-a.py)*DAMP;a.px=a.x;a.py=a.y;a.x+=vx;a.y+=vy+G}
    var last=pts[N-1];if(pin){last.x=last.px=s.tx;last.y=last.py=s.ty}
    for(k=0;k<ITER;k++)for(i=0;i<N-1;i++){a=pts[i];b=pts[i+1];
      var dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||1e-6,diff=(d-s.seg)/d,wa=i===0?0:1,wb=(pin&&i+1===N-1)?0:1;
      if(!wa&&!wb)continue;var fa=diff*wa/(wa+wb),fb=diff*wb/(wa+wb);a.x+=dx*fa;a.y+=dy*fa;b.x-=dx*fb;b.y-=dy*fb}}
  function setTarget(s,q){var x=Math.max(AX-SWAY,Math.min(AX+SWAY,q[0])),y=Math.max(AY+LEN*0.5,Math.min(REST+MAXS,q[1]));
    var dx=x-AX,dy=y-AY,d=Math.sqrt(dx*dx+dy*dy),m=LEN+MAXS;if(d>m){x=AX+dx*m/d;y=AY+dy*m/d;d=m}
    s.tx=x;s.ty=y;s.seg=Math.max(SEG,d/(N-1));s.past=y-REST>=THR}
  function straight(s){var pts=s.pts;for(var i=0;i<N;i++){var f=i/(N-1),x=AX+(s.tx-AX)*f,y=AY+(s.ty-AY)*f;pts[i]={x:x,y:y,px:x,py:y}}}
  function loop(t){var s=sim.current;
    if(s.mode==='script'){var e=Math.max(0,(t-s.sc)/1000);
      if(e<DIP){s.tx=AX;s.ty=REST+(THR+6)*(e/DIP);s.seg=Math.max(SEG,(s.ty-AY)/(N-1))}
      else{s.mode='free';s.t0=t;s.quiet=0;var b=s.pts[N-1];b.py=b.y+5}}
    step(s);
    if(s.mode==='free'){var mv=0;for(var i=1;i<N;i++){var a=s.pts[i];mv=Math.max(mv,Math.abs(a.x-a.px),Math.abs(a.y-a.py))}
      if(mv<0.03&&Math.abs(s.seg-SEG)<0.02)s.quiet++;else s.quiet=0;
      if(s.quiet>8||t-s.t0>MAXT){s.raf=0;settle(s);return}}
    draw();s.raf=requestAnimationFrame(loop)}
  function kick(){var s=sim.current;s.t0=now();s.quiet=0;if(!s.raf)s.raf=requestAnimationFrame(loop)}
  function pt(e){var el=svgRef.current,m=el&&el.getScreenCTM();if(!m)return [AX,REST];var q=el.createSVGPoint();q.x=e.clientX;q.y=e.clientY;q=q.matrixTransform(m.inverse());return [q.x,q.y]}
  function down(e){if(e.button!=null&&e.button>0)return;e.preventDefault();e.stopPropagation();
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    var s=sim.current;s.sup=true;s.mode='drag';setTarget(s,pt(e));
    if(reduced()){straight(s);draw()}else kick()}
  function move(e){var s=sim.current;if(s.mode!=='drag')return;setTarget(s,pt(e));if(reduced()){straight(s);draw()}}
  function finish(e,ok){var s=sim.current;if(s.mode!=='drag')return;
    if(ok)setTarget(s,pt(e));var pass=ok&&s.past;s.mode='free';s.past=false;
    if(pass)setOn(!onRef.current);
    if(reduced())settle(s);else{if(pass){var b=s.pts[N-1];b.py=b.y+6}kick();draw()}
    setTimeout(function(){sim.current.sup=false},0)}
  function up(e){finish(e,true)}
  function cancel(e){finish(e,false)}
  function click(e){var s=sim.current;if(s.sup){s.sup=false;e.preventDefault();return}
    setOn(!onRef.current);
    if(reduced()){settle(s);return}
    s.mode='script';s.sc=now();kick()}
  var s=sim.current,pts=s.pts,bead=pts[N-1],d='M'+AX+' '+AY;
  for(var i=1;i<N;i++)d+=' L'+f1(pts[i].x)+' '+f1(pts[i].y);
  var past=s.mode==='drag'&&s.past;
  return h('div',{className:'cz-cord'},
    h('span',{id:lblId,className:'cz-cord-lb'},p.label),
    h('button',{type:'button',role:'switch','aria-checked':on?'true':'false','aria-labelledby':lblId,'aria-describedby':hintId,
      className:'cz-cord-btn'+(on?' cz-cord-on':''),onClick:click},
      h('svg',{ref:svgRef,className:'cz-cord-svg'+(past?' cz-cord-past':''),viewBox:'0 0 220 150','aria-hidden':'true',focusable:'false'},
        h('rect',{className:'cz-cord-plate',x:AX-22,y:10,width:44,height:10,rx:2}),
        h('line',{className:'cz-cord-mark',x1:AX+16,x2:AX+30,y1:REST+THR,y2:REST+THR}),
        h('rect',{className:'cz-cord-plate',x:GX-14,y:10,width:28,height:6,rx:2}),
        h('line',{className:'cz-cord-stem',x1:GX,x2:GX,y1:16,y2:40}),
        h('path',{className:'cz-cord-glow',d:GLOW}),
        h('circle',{className:'cz-cord-bulb',cx:GX,cy:GY+3,r:8}),
        h('path',{className:'cz-cord-shade',d:'M'+(GX-22)+' 64 L'+(GX-12)+' 40 L'+(GX+12)+' 40 L'+(GX+22)+' 64 Z'}),
        h('path',{className:'cz-cord-rope',d:d}),
        h('circle',{className:'cz-cord-bead',cx:f1(bead.x),cy:f1(bead.y),r:BR}),
        h('circle',{className:'cz-cord-hit',cx:f1(bead.x),cy:f1(bead.y),r:HIT,
          onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:cancel,onLostPointerCapture:cancel})),
      h('span',{className:'cz-cord-word','aria-hidden':'true'},word)),
    h('p',{id:hintId,className:'cz-cord-hint'},'Pull the bead down past the mark and let go, or press Space.'),
    h('span',{className:'cz-cord-sr','aria-live':'polite'},live[0]))}
window.Componentia.PullCord=PullCord;})();

/* Componentia CommandPalette — forge_20261105T1359Z. Credit: Role from GoldenTUI CommandPalette (Chi, golden-keys); Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState,cnt=0;
function lc(s){return String(s==null?'':s).toLowerCase()}
function sub(hay,q){var idx=[],j=0;for(var i=0;i<hay.length&&j<q.length;i++){if(hay.charAt(i)===q.charAt(j)){idx.push(i);j++}}return j===q.length?idx:null}
function span(a,n){var o=[];for(var i=0;i<n;i++)o.push(a+i);return o}
/* tiers: 0 substring in label, 1 substring in keywords, 2 scattered (subsequence) in label */
function rank(items,query){var q=lc(query).trim(),out=[];
  (items||[]).forEach(function(it,n){var L=lc(it.label),kws=it.keywords||[],K=lc(kws.join(' ')),p,s;
    if(!q){out.push({it:it,n:n,t:0,p:0,hl:[]});return}
    p=L.indexOf(q);if(p>=0){out.push({it:it,n:n,t:0,p:p,hl:span(p,q.length)});return}
    p=K.indexOf(q);if(p>=0){var kw=null;for(var k=0;k<kws.length;k++)if(lc(kws[k]).indexOf(q)>=0){kw=kws[k];break}
      out.push({it:it,n:n,t:1,p:p,hl:[],kw:kw});return}
    s=sub(L,q);if(s)out.push({it:it,n:n,t:2,p:s[s.length-1]-s[0],hl:s})});
  out.sort(function(a,b){return a.t-b.t||a.p-b.p||a.n-b.n});
  /* group in order of each group's best match, keep rank order inside a group */
  var order=[],by={};out.forEach(function(r){var g=r.it.group||'';if(!by[g]){by[g]=[];order.push(g)}by[g].push(r)});
  var groups=order.map(function(g){return {name:g,rows:by[g]}}),flat=[];
  groups.forEach(function(g){g.rows.forEach(function(r){r.i=flat.length;flat.push(r)})});
  return {groups:groups,flat:flat}}
function marked(text,hl,cls){if(!hl||!hl.length)return text;var set={},out=[],run='',on=false,k=0;hl.forEach(function(i){set[i]=1});
  function push(){if(!run)return;out.push(on?h('b',{key:k++,className:cls},run):run);run=''}
  for(var i=0;i<text.length;i++){var m=!!set[i];if(m!==on){push();on=m}run+=text.charAt(i)}push();return out}
function kwMark(kw,q){var L=lc(kw),p=L.indexOf(lc(q).trim());return p<0?kw:marked(kw,span(p,lc(q).trim().length),'cz-cp-m')}
function CommandPalette(p){
  var uid=R.useId?R.useId():'',idr=R.useRef(null);
  if(!idr.current)idr.current='cz-cp-'+(uid?uid.replace(/[^a-zA-Z0-9_-]/g,''):'n'+(++cnt));
  var base=idr.current,lbId=base+'-l',inId=base+'-i',lsId=base+'-x';
  var qs=S(p.defaultQuery||''),q=qs[0],as=S(0),live=S(''),inRef=R.useRef(null),listRef=R.useRef(null),first=R.useRef(true),flip=R.useRef(false),pre=R.useRef('');
  var res=R.useMemo(function(){return rank(p.items,q)},[p.items,q]),flat=res.flat,n=flat.length;
  var a=n?Math.max(0,Math.min(as[0],n-1)):-1,empty=p.emptyText||'No match';
  function say(t){flip.current=!flip.current;live[1](t+(flip.current?' ':''))}
  R.useEffect(function(){if(first.current){first.current=false;return}var t=pre.current;pre.current='';say(t+(n?n+(n===1?' result':' results'):empty))},[q,n]);
  R.useEffect(function(){var l=listRef.current;if(!l||a<0)return;var el=l.querySelector('[data-i="'+a+'"]');if(!el)return;
    var lt=l.getBoundingClientRect(),et=el.getBoundingClientRect();
    if(et.top<lt.top)l.scrollTop-=lt.top-et.top;else if(et.bottom>lt.bottom)l.scrollTop+=et.bottom-lt.bottom},[a,q]);
  function setQ(v){qs[1](v);as[1](0)}
  function run(i){var r=flat[i];if(!r)return;as[1](i);say('Ran: '+r.it.label);if(p.onSelect)p.onSelect(r.it.id)}
  function clear(){pre.current='Cleared. ';setQ('');if(inRef.current)inRef.current.focus()}
  function key(e){var k=e.key;
    if(k==='ArrowDown'||k==='Down'){e.preventDefault();if(n)as[1]((a+1)%n)}
    else if(k==='ArrowUp'||k==='Up'){e.preventDefault();if(n)as[1]((a-1+n)%n)}
    else if(k==='Enter'){e.preventDefault();run(a)}
    else if(k==='Escape'||k==='Esc'){if(q){e.preventDefault();clear()}}}
  function optId(i){return base+'-o'+i}
  return h('div',{className:'cz-cp'},
    h('label',{id:lbId,htmlFor:inId,className:'cz-cp-lb'},p.label),
    h('div',{className:'cz-cp-bar'},
      h('input',{ref:inRef,id:inId,className:'cz-cp-in',type:'text',role:'combobox',value:q,placeholder:p.placeholder||'Type to search',
        autoComplete:'off',autoCapitalize:'off',spellCheck:false,'aria-autocomplete':'list','aria-expanded':n?'true':'false',
        'aria-controls':lsId,'aria-activedescendant':a>=0?optId(a):undefined,
        onChange:function(e){setQ(e.target.value)},onKeyDown:key}),
      h('div',{className:'cz-cp-acts'},
        h('button',{type:'button',className:'cz-cp-btn cz-cp-run',disabled:a<0,onClick:function(){run(a)}},'Run'),
        h('button',{type:'button',className:'cz-cp-btn',disabled:!q,onClick:clear},'Clear'))),
    h('div',{ref:listRef,id:lsId,role:'listbox','aria-labelledby':lbId,className:'cz-cp-list'+(n?'':' cz-cp-none')},
      res.groups.map(function(g,gi){var gid=base+'-g'+gi;
        return h('div',{key:gid,role:'group','aria-labelledby':g.name?gid:undefined,className:'cz-cp-grp'},
          g.name?h('div',{id:gid,role:'presentation',className:'cz-cp-gh'},g.name):null,
          g.rows.map(function(r){var sel=r.i===a;
            return h('div',{key:r.it.id,id:optId(r.i),role:'option','aria-selected':sel?'true':'false','data-i':r.i,
              className:'cz-cp-opt'+(sel?' cz-cp-sel':''),
              onMouseDown:function(e){e.preventDefault()},onClick:function(){run(r.i);if(inRef.current)inRef.current.focus()}},
              h('span',{className:'cz-cp-ot'},h('span',{className:'cz-cp-ol'},marked(r.it.label,r.hl,'cz-cp-m')),
                r.kw?h('span',{className:'cz-cp-kw'},'matches ',kwMark(r.kw,q)):null),
              r.it.hint?h('kbd',{className:'cz-cp-hint'},r.it.hint):null)}))})),
    n?null:h('p',{className:'cz-cp-empty'},empty),
    h('span',{className:'cz-cp-sr','aria-live':'polite','aria-atomic':'true'},live[0]))}
window.Componentia.CommandPalette=CommandPalette;})();

/* Componentia LogStream v1.1 — forge_20261106-paste3. Credit: Role from GoldenTUI LogViewer (Chi, golden-keys); v1.1 level tags idea from a Log Stream tile (third-party library, licence not stated, no code used); Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState,cnt=0;
var useLE=R.useLayoutEffect||R.useEffect;
function lc(s){return String(s==null?'':s).toLowerCase()}
/* level: 'error' | 'warn' | 'debug' | '' (info); tag text padded to 7 so messages align in --cz-fm */
function lvOf(l){var v=l.level;return v==='error'||v==='warn'||v==='debug'?v:''}
function tagOf(lv){return ('['+(lv||'info').toUpperCase()+']       ').slice(0,7)}
function LogStream(p){
  var uid=R.useId?R.useId():'',idr=R.useRef(null);
  if(!idr.current)idr.current='cz-ls-'+(uid?uid.replace(/[^a-zA-Z0-9_-]/g,''):'n'+(++cnt));
  var base=idr.current,tId=base+'-t',fId=base+'-f',cId=base+'-c';
  var compact=!!p.compact,tags=!!p.tags,max=p.maxLines>0?p.maxLines:500;
  var all=(p.lines||[]).slice(-max).map(function(l,i){return {l:l,i:i}});
  var fs=S(p.follow!==false),fol=compact?true:fs[0],ft=S(p.defaultFilter||''),f=compact?'':ft[0];
  var hs=S(-1),hi=hs[0],live=S(''),flip=R.useRef(false),logRef=R.useRef(null),focusSeq=S(0),first=R.useRef(true);
  var q=lc(f).trim();
  var vis=compact?all.slice(-4):(q?all.filter(function(x){var lv=lvOf(x.l);return lc(x.l.t+' '+(x.l.level||'')+' '+x.l.text+(tags?'\n'+tagOf(lv):(lv?'\n['+lv+']':''))).indexOf(q)>=0}):all);
  var errs=vis.filter(function(x){return x.l.level==='error'});
  var count=vis.length+' of '+all.length+' lines';
  var last=all.length?all[all.length-1].l:null;
  function say(t){flip.current=!flip.current;live[1](t+(flip.current?' ':''))}
  /* follow: pin the view to the newest line; jumps, no smooth scroll */
  useLE(function(){var el=logRef.current;if(el&&fol)el.scrollTop=el.scrollHeight},[fol,vis.length,last,q]);
  R.useEffect(function(){if(first.current){first.current=false;return}if(!compact)say(count)},[q]);
  R.useEffect(function(){if(hi<0||!focusSeq[0])return;var el=logRef.current&&logRef.current.querySelector('[data-i="'+hi+'"]');if(el)el.focus()},[focusSeq[0]]);
  function setFollow(v){fs[1](v);if(v)hs[1](-1);say(v?'Following':'Paused')}
  function onScroll(){var el=logRef.current;if(!el||compact||!fol)return;
    if(el.scrollHeight-el.scrollTop-el.clientHeight>24)setFollow(false)}
  function prevErr(){if(!errs.length){say('No error lines');return}
    var k=errs.length-1;if(hi>=0){k=-1;for(var j=errs.length-1;j>=0;j--)if(errs[j].i<hi){k=j;break}if(k<0)k=errs.length-1}
    if(fol){fs[1](false)}hs[1](errs[k].i);focusSeq[1](focusSeq[0]+1);say('error '+(k+1)+' of '+errs.length)}
  function line(x){var l=x.l,lv=lvOf(l),on=x.i===hi;
    /* level said once: tags off = the word; tags on = a visual [TAG] (aria-hidden) plus one hidden word */
    var lvEl=tags?h('span',{className:'cz-ls-lv cz-ls-tg'},h('i',{className:'cz-ls-mk','aria-hidden':'true'}),
        h('span',{className:'cz-ls-tgt','aria-hidden':'true'},tagOf(lv)),h('span',{className:'cz-ls-sw'},(lv||'info')+' '))
      :(lv?h('span',{className:'cz-ls-lv'},h('i',{className:'cz-ls-mk','aria-hidden':'true'}),lv):null);
    return h('div',{key:x.i,'data-i':x.i,tabIndex:-1,className:'cz-ls-ln'+(lv?' cz-ls-'+lv:'')+(on?' cz-ls-hi':'')},
      on?h('span',{className:'cz-ls-at','aria-hidden':'true'},'▶'):null,
      h('span',{className:'cz-ls-t'},l.t),
      lvEl,
      h('span',{className:'cz-ls-tx'},l.text))}
  var state=fol?'following':'paused';
  return h('section',{className:'cz-ls'+(compact?' cz-ls-compact':''),'aria-labelledby':tId},
    h('div',{className:'cz-ls-head'},
      h('span',{id:tId,className:'cz-ls-title'},p.label),
      compact?null:h('span',{className:'cz-ls-badge cz-ls-'+state},h('i',{'aria-hidden':'true'}),state)),
    compact?null:h('div',{className:'cz-ls-ctl'},
      h('button',{type:'button',className:'cz-ls-btn','aria-pressed':fol?'true':'false',onClick:function(){setFollow(!fol)}},'Follow'),
      h('button',{type:'button',className:'cz-ls-btn',disabled:!errs.length,onClick:prevErr},'Previous error'),
      h('div',{className:'cz-ls-fld'},
        h('label',{htmlFor:fId,className:'cz-ls-fl'},'Filter lines'),
        h('input',{id:fId,className:'cz-ls-in',type:'search',value:ft[0],placeholder:'sync, error, 08:4',autoComplete:'off',spellCheck:false,
          'aria-describedby':cId,onChange:function(e){ft[1](e.target.value);hs[1](-1)}})),
      h('p',{id:cId,className:'cz-ls-count'},count)),
    h('div',{ref:logRef,role:'log','aria-labelledby':tId,'aria-live':fol?'polite':'off',tabIndex:0,className:'cz-ls-log',onScroll:onScroll},
      vis.length?vis.map(line):h('p',{className:'cz-ls-none'},all.length?'No lines match the filter.':'No lines yet.')),
    compact?null:h('span',{className:'cz-ls-sr','aria-live':'polite','aria-atomic':'true'},live[0]))}
window.Componentia.LogStream=LogStream;})();

/* Componentia KeyHints — forge_20261105T1359Z. Credit: Role from GoldenTUI KeyFooter (Chi, golden-keys); Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
function keys(ks){ks=[].concat(ks||[]);
  if(ks.length<2)return h('kbd',{className:'cz-kh-k'},ks[0]||'');
  var parts=[];ks.forEach(function(k,i){if(i)parts.push(h('span',{key:'p'+i,className:'cz-kh-plus'},'+'));parts.push(h('kbd',{key:'k'+i,className:'cz-kh-k'},k))});
  return h('kbd',{className:'cz-kh-combo'},parts)}
function KeyHints(p){
  var items=p.items||[],sep=p.separator!=null?p.separator:' · ',lab=p.label||'Keyboard shortcuts';
  var acts=items.some(function(it){return typeof it.onActivate==='function'});
  var live=S(''),flip=R.useRef(false);
  function fire(it){flip.current=!flip.current;live[1]('Last used: '+[].concat(it.keys).join('+')+' '+it.label+(flip.current?' ':''));it.onActivate(it)}
  return h('div',{className:'cz-kh'},
    h('ul',{role:'list','aria-label':lab,className:'cz-kh-list'},
      items.map(function(it,i){var k=keys(it.keys),v=h('span',{className:'cz-kh-v'},it.label);
        var body=typeof it.onActivate==='function'
          ?h('button',{type:'button',className:'cz-kh-chip',onClick:function(){fire(it)}},k,v)
          :h('span',{className:'cz-kh-pair'},k,v);
        var nx=items[i+1],plain=function(x){return typeof x.onActivate!=='function'},showSep=nx&&plain(it)&&plain(nx);
        return h('li',{key:i,className:'cz-kh-it'+(plain(it)?'':' cz-kh-ci')},body,showSep?h('span',{className:'cz-kh-sep','aria-hidden':'true'},sep):null)})),
    acts?h('p',{className:'cz-kh-live','aria-live':'polite','aria-atomic':'true'},live[0]):null)}
window.Componentia.KeyHints=KeyHints;})();

/* Componentia SpiritLevel — forge_20261105T1359Z. Credit: Idea: the carpenter's bubble level; near-duplicates seen: Tizen Spirit Level sample, Opera WAC spirit level widget, MIT App Inventor bubble level, Clean Bubble Level (App Store) (licences not read, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
/* vial geometry in viewBox units (0 0 200 200): centre C, ring radius VR, bubble radius BR, bubble travel TR */
var C=100,VR=86,BR=15,TR=64,K=190,DMP=11,KD=420,DMPD=30,MAXT=3000,cnt=0;
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function now(){return (window.performance&&performance.now)?performance.now():Date.now()}
function r1(n){var v=Math.round(n*10)/10;return v===0?0:v}
function clampTo(v,r){return Math.max(-r,Math.min(r,v))}
function deg(n){return Math.abs(r1(n)).toFixed(1)+'°'}
function describe(x,y,tol){
  if(Math.sqrt(x*x+y*y)<=tol+1e-9)return {ok:true,text:'Level'};
  var parts=[];if(Math.abs(r1(x))>0)parts.push(deg(x)+(x>0?' right':' left'));if(Math.abs(r1(y))>0)parts.push(deg(y)+(y>0?' down':' up'));
  return {ok:false,text:'Off level · '+parts.join(', ')}}
function SpiritLevel(p){
  var range=p.range>0?+p.range:10,tol=p.tolerance>=0&&p.tolerance!=null?+p.tolerance:1,ro=!!p.readOnly;
  var ctl=p.x!=null||p.y!=null;
  var st=S({x:r1(clampTo(+(p.defaultX||0),range)),y:r1(clampTo(+(p.defaultY||0),range))});
  var val=ctl?{x:r1(clampTo(+(p.x||0),range)),y:r1(clampTo(+(p.y||0),range))}:st[0];
  var uid=R.useId?R.useId():'',idr=R.useRef(null);
  if(!idr.current)idr.current='cz-sl-'+(uid?uid.replace(/[^a-zA-Z0-9_-]/g,''):'n'+(++cnt));
  var lblId=idr.current+'-l',hintId=idr.current+'-h';
  var live=S(''),fr=S(0),dev=S(false),svgRef=R.useRef(null),valRef=R.useRef(val);valRef.current=val;
  var sim=R.useRef(null);if(!sim.current)sim.current={px:val.x,py:val.y,vx:0,vy:0,raf:0,t0:0,last:0,drag:null,quiet:0};
  var devRef=R.useRef(null);
  function draw(){fr[1](function(n){return n+1})}
  function stopDev(){var d=devRef.current;if(!d)return;window.removeEventListener('deviceorientation',d.fn);if(d.to)clearTimeout(d.to);devRef.current=null}
  R.useEffect(function(){return function(){var s=sim.current;if(s.raf){cancelAnimationFrame(s.raf);s.raf=0}stopDev()}},[]);
  /* follow controlled or external value changes */
  R.useEffect(function(){kick()},[val.x,val.y]);
  function loop(t){var s=sim.current,v=valRef.current,dt=s.last?Math.min((t-s.last)/1000,1/30):1/60;s.last=t;
    var k=s.drag?KD:K,c=s.drag?DMPD:DMP,n=4,h2=dt/n;
    for(var i=0;i<n;i++){s.vx+=(-k*(s.px-v.x)-c*s.vx)*h2;s.vy+=(-k*(s.py-v.y)-c*s.vy)*h2;s.px+=s.vx*h2;s.py+=s.vy*h2}
    var still=Math.abs(s.px-v.x)<0.02&&Math.abs(s.py-v.y)<0.02&&Math.abs(s.vx)<0.05&&Math.abs(s.vy)<0.05;
    if(still)s.quiet++;else s.quiet=0;
    if((s.quiet>4&&!s.drag)||t-s.t0>MAXT){s.px=v.x;s.py=v.y;s.vx=s.vy=0;s.raf=0;s.last=0;draw();return}
    draw();s.raf=requestAnimationFrame(loop)}
  function kick(){var s=sim.current,v=valRef.current;
    if(reduced()){if(s.raf){cancelAnimationFrame(s.raf);s.raf=0}s.px=v.x;s.py=v.y;s.vx=s.vy=0;draw();return}
    if(s.px===v.x&&s.py===v.y&&!s.vx&&!s.vy)return;
    s.t0=now();s.quiet=0;if(!s.raf){s.last=0;s.raf=requestAnimationFrame(loop)}}
  function commit(x,y,say){x=r1(clampTo(x,range));y=r1(clampTo(y,range));var o=valRef.current;
    var nv={x:x,y:y};valRef.current=nv;
    if(!ctl)st[1](nv);
    if((x!==o.x||y!==o.y)&&p.onChange)p.onChange({x:x,y:y});
    if(say)live[1](p.label+': '+describe(x,y,tol).text);
    kick()}
  function pt(e){var el=svgRef.current,m=el&&el.getScreenCTM();if(!m)return [C,C];var q=el.createSVGPoint();q.x=e.clientX;q.y=e.clientY;q=q.matrixTransform(m.inverse());return [q.x,q.y]}
  function toDeg(q,off){var dx=q[0]-off[0]-C,dy=q[1]-off[1]-C,d=Math.sqrt(dx*dx+dy*dy);if(d>TR){dx*=TR/d;dy*=TR/d}return [dx/TR*range,dy/TR*range]}
  function bubbleAt(x,y){var bx=x/range*TR,by=y/range*TR,d=Math.sqrt(bx*bx+by*by);if(d>TR){bx*=TR/d;by*=TR/d}return [C+bx,C+by]}
  function down(e){if(ro||(e.button!=null&&e.button>0))return;e.preventDefault();
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    if(devRef.current){stopDev();dev[1](false)}
    var s=sim.current,q=pt(e),b=bubbleAt(s.px,s.py),dx=q[0]-b[0],dy=q[1]-b[1];
    var off=(dx*dx+dy*dy<=(BR+10)*(BR+10))?[dx,dy]:[0,0];s.drag={off:off};
    var d=toDeg(q,off);commit(d[0],d[1],false);draw()}
  function move(e){var s=sim.current;if(!s.drag)return;var d=toDeg(pt(e),s.drag.off);commit(d[0],d[1],false)}
  function up(){var s=sim.current;if(!s.drag)return;s.drag=null;var v=valRef.current;live[1](p.label+': '+describe(v.x,v.y,tol).text);kick();draw()}
  function keyFor(axis){return function(e){if(ro)return;var k=e.key,stp=e.shiftKey?2:0.5,v=valRef.current,cur=axis==='x'?v.x:-v.y,n=null;
    if(k==='ArrowRight'||k==='ArrowUp')n=cur+stp;else if(k==='ArrowLeft'||k==='ArrowDown')n=cur-stp;
    else if(k==='PageUp')n=cur+2;else if(k==='PageDown')n=cur-2;else if(k==='Home')n=-range;else if(k==='End')n=range;
    if(n==null)return;e.preventDefault();
    if(devRef.current){stopDev();dev[1](false)}
    if(axis==='x')commit(n,v.y,true);else commit(v.x,-n,true)}}
  function zero(){if(devRef.current){stopDev();dev[1](false)}commit(0,0,true)}
  function useDevice(){
    if(devRef.current){stopDev();dev[1](false);live[1]('Device tilt off');return}
    var DOE=window.DeviceOrientationEvent;
    if(typeof DOE==='undefined'){live[1]('Device tilt not available');return}
    function start(){var d={got:false,to:0,fn:function(ev){if(ev.beta==null||ev.gamma==null)return;d.got=true;
        commit(clampTo(ev.gamma,range),clampTo(ev.beta,range),false)}};
      devRef.current=d;window.addEventListener('deviceorientation',d.fn);dev[1](true);live[1]('Following device tilt');
      d.to=setTimeout(function(){d.to=0;if(devRef.current===d&&!d.got){stopDev();dev[1](false);live[1]('Device tilt not available')}},1500)}
    if(typeof DOE.requestPermission==='function'){
      try{DOE.requestPermission().then(function(r){if(r==='granted')start();else live[1]('Device tilt not available: permission refused')},function(){live[1]('Device tilt not available')})}
      catch(_){live[1]('Device tilt not available')}}
    else start()}
  var s=sim.current,b=bubbleAt(s.px,s.py),ds=describe(val.x,val.y,tol),tr=Math.min(VR-6,tol/range*TR+BR+3);
  var xt=val.x===0?'0.0°, centred':deg(val.x)+(val.x>0?' right':' left');
  var yt=val.y===0?'0.0°, centred':deg(val.y)+(val.y>0?' down':' up');
  function slider(axis,name,now,txt){return h('div',{className:'cz-sl-ax',role:'slider',tabIndex:0,'aria-label':p.label+' '+name,
      'aria-valuemin':-range,'aria-valuemax':range,'aria-valuenow':now,'aria-valuetext':txt,'aria-readonly':ro?'true':undefined,
      'aria-orientation':axis==='x'?'horizontal':'vertical','aria-describedby':hintId,onKeyDown:keyFor(axis)},
    h('span',{className:'cz-sl-axn'},name),h('span',{className:'cz-sl-axv'},txt))}
  return h('div',{className:'cz-sl'+(ro?' cz-sl-ro':''),role:'group','aria-labelledby':lblId},
    h('span',{id:lblId,className:'cz-sl-lb'},p.label),
    h('svg',{ref:svgRef,className:'cz-sl-svg'+(s.drag?' cz-sl-drag':''),viewBox:'0 0 200 200','aria-hidden':'true',focusable:'false',
        onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up,onLostPointerCapture:up},
      h('circle',{className:'cz-sl-vial',cx:C,cy:C,r:VR}),
      h('line',{className:'cz-sl-cross',x1:C-VR+8,x2:C+VR-8,y1:C,y2:C}),
      h('line',{className:'cz-sl-cross',x1:C,x2:C,y1:C-VR+8,y2:C+VR-8}),
      h('circle',{className:'cz-sl-tol',cx:C,cy:C,r:r1(tr)}),
      h('circle',{className:'cz-sl-bub',cx:r1(b[0]),cy:r1(b[1]),r:BR}),
      h('circle',{className:'cz-sl-ring',cx:C,cy:C,r:VR})),
    h('div',{className:'cz-sl-word'+(ds.ok?' cz-sl-ok':' cz-sl-off')},
      h('svg',{className:'cz-sl-mark',viewBox:'0 0 20 20','aria-hidden':'true',focusable:'false'},
        ds.ok?[h('circle',{key:'c',className:'cz-sl-okm',cx:10,cy:10,r:9}),h('path',{key:'p',className:'cz-sl-okt',d:'M5.5 10.5 L8.6 13.4 L14.5 6.8'})]
          :h('path',{className:'cz-sl-warnm',d:'M10 1.5 L18.5 10 L10 18.5 L1.5 10 Z'})),
      h('span',null,ds.text)),
    h('div',{className:'cz-sl-axes'},slider('x','Left–right',val.x,xt),slider('y','Up–down',r1(-val.y),yt)),
    (!ro||p.device)?h('div',{className:'cz-sl-row'},
      ro?null:h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-sl-b',onClick:zero},'Zero'),
      p.device?h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-sl-b','aria-pressed':dev[0]?'true':'false',onClick:useDevice},dev[0]?'Stop device tilt':'Use device tilt'):null):null,
    h('p',{id:hintId,className:'cz-sl-hint'},ro?'Read only. Shows the measured tilt.':'Drag the bubble, or focus a tilt and use the arrow keys (Shift for 2°).'),
    h('span',{className:'cz-sl-sr','aria-live':'polite'},live[0]))}
window.Componentia.SpiritLevel=SpiritLevel;})();

/* Componentia CapsuleDraw — forge_20261105T1359Z. Credit: Idea: the capsule-toy (gashapon) vending machine; near-duplicates seen: Gashapon Machine Animation (CodeCanyon), Capsule Machine (Hack Club Flavortown), fortuna gacha library (deno.land), Gacha Works (Minecraft mod) (licences not read, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
/* machine geometry in viewBox units (0 0 240 300): globe centre (GX,GY) radius GR; crank hub (HX,HY); chute tray at (TX,TY) */
var VW=240,VH=300,GX=120,GY=92,GR=78,CR=14,HX=158,HY=214,ARM=24,HIT=40,TX=80,TY=252,TOP=184;
var G=900,REST=0.35,FRIC=0.986,MAXT=3000,DROP=0.42,OPEN=0.26,FILLS=['accent','highlight','inset'],cnt=0;
var TAU=Math.PI*2;
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function now(){return (window.performance&&performance.now)?performance.now():Date.now()}
function f1(n){return Math.round(n*10)/10}
function pick(n){if(n<=1)return 0;var lim=Math.floor(4294967296/n)*n,a=new Uint32Array(1),c=window.crypto||window.msCrypto;
  if(c&&c.getRandomValues){for(var i=0;i<64;i++){c.getRandomValues(a);if(a[0]<lim)return a[0]%n}}
  return Math.floor(Math.random()*n)}
/* physics: one fixed step; capsules are circles inside the globe circle */
function step(caps,dt,stir){var i,j,a,b;
  for(i=0;i<caps.length;i++){a=caps[i];
    if(stir){var dx=a.x-GX,dy=a.y-GY,d=Math.sqrt(dx*dx+dy*dy)||1;a.vx+=(-dy/d)*stir*dt;a.vy+=(dx/d)*stir*dt-stir*0.35*dt}
    a.vy+=G*dt;a.vx*=FRIC;a.vy*=FRIC;a.x+=a.vx*dt;a.y+=a.vy*dt;a.rot+=a.vx*dt*0.04}
  for(var it=0;it<3;it++){
    for(i=0;i<caps.length;i++)for(j=i+1;j<caps.length;j++){a=caps[i];b=caps[j];
      var ex=b.x-a.x,ey=b.y-a.y,dd=Math.sqrt(ex*ex+ey*ey)||1e-4,ov=2*CR-dd;
      if(ov>0){var nx=ex/dd,ny=ey/dd;a.x-=nx*ov/2;a.y-=ny*ov/2;b.x+=nx*ov/2;b.y+=ny*ov/2;
        var rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rv<0){var imp=-(1+REST)*rv/2;a.vx-=imp*nx;a.vy-=imp*ny;b.vx+=imp*nx;b.vy+=imp*ny}}}
    for(i=0;i<caps.length;i++){a=caps[i];var wx=a.x-GX,wy=a.y-GY,wd=Math.sqrt(wx*wx+wy*wy)||1e-4,lim=GR-4-CR;
      if(wd>lim){var mx=wx/wd,my=wy/wd;a.x=GX+mx*lim;a.y=GY+my*lim;var vn=a.vx*mx+a.vy*my;if(vn>0){a.vx-=(1+REST)*vn*mx;a.vy-=(1+REST)*vn*my}}}}}
function makePile(n){var caps=[];for(var i=0;i<n;i++)caps.push({x:GX-40+(i%5)*20+(i>4?8:0),y:GY-40+Math.floor(i/5)*26,vx:0,vy:0,rot:(i*47)%180,fill:i%3});
  for(var k=0;k<360;k++)step(caps,1/60,0);
  for(i=0;i<caps.length;i++){caps[i].vx=caps[i].vy=0}return caps}
function capsule(key,x,y,rot,fill,open,cls){var a=FILLS[fill%3],b=FILLS[(fill+1)%3],g=open||0;
  return h('g',{key:key,className:'cz-cap-c'+(cls?' '+cls:''),transform:'translate('+f1(x)+' '+f1(y)+') rotate('+f1(rot)+')'},
    h('path',{className:'cz-cap-h cz-cap-'+a,d:'M'+(-CR)+' '+f1(-g)+' A'+CR+' '+CR+' 0 0 1 '+CR+' '+f1(-g)+' Z'}),
    h('path',{className:'cz-cap-h cz-cap-'+b,d:'M'+(-CR)+' '+f1(g)+' A'+CR+' '+CR+' 0 0 0 '+CR+' '+f1(g)+' Z'}))}
function CapsuleDraw(p){
  var opts=(p.options||[]).map(String),n=Math.min(14,Math.max(11,opts.length));
  var hasDef=p.defaultResult!=null&&p.defaultResult!=='';
  var res=S(hasDef?String(p.defaultResult):null),result=res[0];
  var uid=R.useId?R.useId():'',idr=R.useRef(null);
  if(!idr.current)idr.current='cz-cap-'+(uid?uid.replace(/[^a-zA-Z0-9_-]/g,''):'n'+(++cnt));
  var lblId=idr.current+'-l',hintId=idr.current+'-h';
  var live=S(''),fr=S(0),svgRef=R.useRef(null);
  var sim=R.useRef(null);
  if(!sim.current){var pile=makePile(n);if(hasDef)pile.pop();
    sim.current={caps:pile,ang:0,acc:0,last:null,raf:0,t0:0,lt:0,quiet:0,mode:'idle',sc:0,out:null,drag:null,sup:false,stir:0,busy:false,pending:null}}
  R.useEffect(function(){return function(){var s=sim.current;if(s.raf){cancelAnimationFrame(s.raf);s.raf=0}}},[]);
  function draw(){fr[1](function(x){return x+1})}
  function finishDraw(s){var o=s.out;s.out=o?{t0:o.t0,y:TY,open:6,done:true,fill:o.fill}:{y:TY,open:6,done:true,fill:0};
    s.busy=false;res[1](s.pending);live[1]('Drawn: '+s.pending);if(p.onDraw)p.onDraw(s.pending);draw()}
  function release(s){if(!opts.length||s.busy)return;s.busy=true;s.pending=opts[pick(opts.length)];
    var low=0;for(var i=1;i<s.caps.length;i++)if(s.caps[i].y>s.caps[low].y)low=i;
    var c=s.caps.splice(low,1)[0]||{fill:0};
    if(reduced()){s.out={y:TY,open:6,done:true,fill:c.fill};finishDraw(s);return}
    s.out={t0:now(),y:TOP,open:0,done:false,fill:c.fill};if(!s.raf)kick()}
  function loop(t){var s=sim.current,dt=s.lt?Math.min((t-s.lt)/1000,1/30):1/60;s.lt=t;
    if(s.mode==='script'){var e=(t-s.sc)/900;if(e>=1){s.ang=s.base+TAU;s.mode='idle';s.stir=0;release(s)}
      else{var na=s.base+TAU*(e<0.5?2*e*e:1-Math.pow(-2*e+2,2)/2);s.stir=Math.min(1300,Math.abs(na-s.ang)/dt*200);s.ang=na}}
    var px=s.caps.map(function(c){return [c.x,c.y]});
    var sub=2;for(var k=0;k<sub;k++)step(s.caps,dt/sub,s.stir);
    if(s.mode!=='script')s.stir*=0.8;
    if(s.out&&!s.out.done){var oe=(t-s.out.t0)/1000;
      if(oe<DROP){var q=oe/DROP;s.out.y=TOP+(TY-TOP)*q*q}else if(oe<DROP+OPEN){s.out.y=TY;s.out.open=6*(oe-DROP)/OPEN}else finishDraw(s)}
    var mv=0;for(var i=0;i<s.caps.length;i++)mv=Math.max(mv,Math.abs(s.caps[i].x-px[i][0]),Math.abs(s.caps[i].y-px[i][1]));
    if(mv<0.12&&!s.drag&&s.mode!=='script'&&!(s.out&&!s.out.done))s.quiet++;else s.quiet=0;
    if(s.quiet>12||t-s.t0>MAXT){if(s.quiet<=12)for(k=0;k<240;k++)step(s.caps,1/60,0);for(i=0;i<s.caps.length;i++){s.caps[i].vx=s.caps[i].vy=0}
      if(s.out&&!s.out.done)finishDraw(s);if(s.mode==='script'){s.mode='idle';s.ang=s.base+TAU;release(s)}
      s.stir=0;s.raf=0;s.lt=0;draw();return}
    draw();s.raf=requestAnimationFrame(loop)}
  function kick(){var s=sim.current;s.t0=now();s.quiet=0;if(!s.raf){s.lt=0;s.raf=requestAnimationFrame(loop)}}
  function turn(){var s=sim.current;if(result!=null||s.busy||s.mode==='script'||!opts.length)return;
    if(reduced()){release(s);return}
    s.mode='script';s.sc=now();s.base=s.ang;kick()}
  function pt(e){var el=svgRef.current,m=el&&el.getScreenCTM();if(!m)return [HX,HY];var q=el.createSVGPoint();q.x=e.clientX;q.y=e.clientY;q=q.matrixTransform(m.inverse());return [q.x,q.y]}
  function down(e){if(e.button!=null&&e.button>0)return;var s=sim.current;s.sup=true;
    if(result!=null||s.busy||s.mode==='script')return;e.preventDefault();
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    var q=pt(e);s.drag={a:Math.atan2(q[1]-HY,q[0]-HX),acc:0,start:s.ang}}
  function move(e){var s=sim.current,d=s.drag;if(!d)return;var q=pt(e),a=Math.atan2(q[1]-HY,q[0]-HX),da=a-d.a;
    if(da>Math.PI)da-=TAU;else if(da<-Math.PI)da+=TAU;d.a=a;
    var na=Math.max(0,d.acc+da);if(na===d.acc)return;var delta=na-d.acc;d.acc=na;s.ang=d.start+na;
    if(!reduced()){s.stir=Math.min(1300,s.stir+delta*900);kick()}
    if(d.acc>=TAU){s.drag=null;s.ang=d.start+TAU;release(s)}draw()}
  function up(){var s=sim.current;if(!s.drag)return;s.drag=null;draw();setTimeout(function(){sim.current.sup=false},0)}
  function crankClick(e){var s=sim.current;if(s.sup){s.sup=false;e.preventDefault();return}turn()}
  function again(){var s=sim.current;if(result==null||s.busy)return;
    s.out=null;res[1](null);live[1]('Ready to draw');
    var pile=makePile(n);s.caps=pile;draw()}
  var s=sim.current,ready=result==null&&!s.busy&&opts.length>0;
  var kids=[],i;
  for(i=0;i<s.caps.length;i++){var c=s.caps[i];kids.push(capsule('c'+i,c.x,c.y,c.rot,c.fill,0))}
  var out=s.out||(result!=null?{y:TY,open:6,fill:0}:null);
  var ca=s.ang,kx=HX+Math.cos(ca-Math.PI/2)*ARM,ky=HY+Math.sin(ca-Math.PI/2)*ARM;
  var bx=HIT/VW*100,by=HIT/VH*100;
  return h('div',{className:'cz-cap'},
    h('span',{id:lblId,className:'cz-cap-lb'},p.label),
    h('div',{className:'cz-cap-stage'},
      h('svg',{ref:svgRef,className:'cz-cap-svg',viewBox:'0 0 '+VW+' '+VH,'aria-hidden':'true',focusable:'false'},
        h('defs',null,h('clipPath',{id:idr.current+'-g'},h('circle',{cx:GX,cy:GY,r:GR-2}))),
        h('rect',{className:'cz-cap-base',x:44,y:160,width:152,height:128,rx:10}),
        h('rect',{className:'cz-cap-neck',x:96,y:164,width:48,height:14}),
        h('circle',{className:'cz-cap-globe',cx:GX,cy:GY,r:GR}),
        h('g',{clipPath:'url(#'+idr.current+'-g)'},kids),
        h('path',{className:'cz-cap-glint',d:'M'+(GX-56)+' '+(GY-30)+' A62 62 0 0 1 '+(GX-24)+' '+(GY-60)}),
        h('circle',{className:'cz-cap-rim',cx:GX,cy:GY,r:GR}),
        h('rect',{className:'cz-cap-chute',x:TX-26,y:TY-22,width:52,height:40,rx:6}),
        out?capsule('out',TX,out.y,0,out.fill,out.open,'cz-cap-out'):null,
        h('rect',{className:'cz-cap-lip',x:TX-30,y:TY+14,width:60,height:8,rx:2}),
        h('circle',{className:'cz-cap-plate',cx:HX,cy:HY,r:30}),
        h('line',{className:'cz-cap-arm',x1:HX,y1:HY,x2:f1(kx),y2:f1(ky)}),
        h('circle',{className:'cz-cap-hub',cx:HX,cy:HY,r:7}),
        h('circle',{className:'cz-cap-knob',cx:f1(kx),cy:f1(ky),r:8}),
        h('path',{className:'cz-cap-dir',d:'M'+(HX+22)+' '+(HY+30)+' A38 38 0 0 1 '+(HX-24)+' '+(HY+30)}),
        h('path',{className:'cz-cap-dirh',d:'M'+(HX-24)+' '+(HY+30)+' l7 -1 M'+(HX-24)+' '+(HY+30)+' l2 -7'})),
      h('button',{type:'button',className:'cz-cap-crank','aria-label':'Crank: turn to draw','aria-describedby':hintId,'aria-disabled':ready?'false':'true',
        style:{left:((HX-HIT)/VW*100)+'%',top:((HY-HIT)/VH*100)+'%',width:(2*bx)+'%',height:(2*by)+'%'},
        onClick:crankClick,onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up,onLostPointerCapture:up})),
    h('div',{className:'cz-cap-res'+(result!=null?' cz-cap-has':'')},
      result!=null?[h('span',{key:'k',className:'cz-cap-k'},'Drawn:'),h('span',{key:'v',className:'cz-cap-v'},result)]
        :h('span',{className:'cz-cap-k'},opts.length?(s.busy?'Drawing…':opts.length+' in the machine'):'No options')),
    h('div',{className:'cz-cap-row'},
      h('button',{type:'button',className:'cz-btn cz-btn-primary cz-cap-b','aria-disabled':ready?'false':'true',onClick:turn},'Turn crank'),
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-cap-b','aria-disabled':result!=null?'false':'true',onClick:again},'Draw again')),
    h('p',{id:hintId,className:'cz-cap-hint'},'Drag the crank one full turn clockwise, or press Turn crank, or focus the crank and press Enter or Space.'),
    h('span',{className:'cz-cap-sr','aria-live':'polite'},live[0]))}
window.Componentia.CapsuleDraw=CapsuleDraw;})();

/* Componentia SwipeDeck — forge_20261105T1359Z. Credit: Idea: the swipe-to-decide card stack; near-duplicates seen: rememberlenny gist, shadcn.io dialog card swipe, Vue + interact.js swipeable stack (Medium / Netguru), madewithvuejs swipeable cards, Card Stack by kuratlielia (21st.dev), re-cardswipe (npm) (licences not read, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
/* spring constants (px, s): fling pulls towards OFF*width, snap-back is under-damped so it wobbles once */
var KF=170,CF=14,KB=320,CB=17,OFF=1.35,THR=0.3,VTHR=0.5,TILT=0.07,MAXTILT=18,STAMP=16,MAXT=3000,cnt=0;
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function now(){return (window.performance&&performance.now)?performance.now():Date.now()}
function SwipeDeck(p){
  var items=p.items||[],total=items.length,leftL=p.leftLabel||'Skip',rightL=p.rightLabel||'Keep';
  var st=S(function(){return {idx:Math.max(0,Math.min(total,+(p.defaultIndex||0))),hist:[]}}),deck=st[0];
  var idx=deck.idx,hist=deck.hist,top=idx<total?items[idx]:null;
  var uid=R.useId?R.useId():'',idr=R.useRef(null);
  if(!idr.current)idr.current='cz-sw-'+(uid?uid.replace(/[^a-zA-Z0-9_-]/g,''):'n'+(++cnt));
  var lblId=idr.current+'-l',hintId=idr.current+'-h';
  var live=S(''),fr=S(0),stageRef=R.useRef(null),cardRef=R.useRef(null),sumRef=R.useRef(null),deckRef=R.useRef(deck);deckRef.current=deck;
  var sim=R.useRef(null);if(!sim.current)sim.current={x:0,vx:0,mode:'idle',dir:0,raf:0,t0:0,lt:0,drag:null,refocus:false};
  R.useEffect(function(){return function(){var s=sim.current;if(s.raf){cancelAnimationFrame(s.raf);s.raf=0}}},[]);
  R.useEffect(function(){var s=sim.current;if(!s.refocus)return;s.refocus=false;
    var el=cardRef.current||sumRef.current;if(el)try{el.focus({preventScroll:true})}catch(_){}},[idx]);
  function draw(){fr[1](function(n){return n+1})}
  function width(){var el=stageRef.current;return el&&el.clientWidth?el.clientWidth:320}
  function name(it){return it?String(it.title):''}
  function decide(dir){var d=deckRef.current,s=sim.current;if(d.idx>=total)return;var it=items[d.idx];
    var nh=d.hist.concat([{id:it.id,dir:dir}]),nd={idx:d.idx+1,hist:nh};deckRef.current=nd;st[1](nd);
    s.x=0;s.vx=0;s.mode='idle';s.dir=0;
    var msg=(dir==='right'?'Kept: ':'Skipped: ')+name(it);
    if(p.onDecide)p.onDecide(it.id,dir);
    if(nd.idx>=total){msg+='. '+summary(nh);if(p.onDone)p.onDone()}
    live[1](msg)}
  function summary(hs){var k=0,sk=0;for(var i=0;i<hs.length;i++){if(hs[i].dir==='right')k++;else sk++}
    return 'All '+total+' sorted · '+k+' kept, '+sk+' skipped'}
  function loop(t){var s=sim.current,dt=s.lt?Math.min((t-s.lt)/1000,1/30):1/60;s.lt=t;var w=width();
    if(s.mode==='fling'){var tg=s.dir*w*OFF,n=4,h2=dt/n;for(var i=0;i<n;i++){s.vx+=(-KF*(s.x-tg)-CF*s.vx)*h2;s.x+=s.vx*h2}
      if(Math.abs(s.x)>=w*1.08||t-s.t0>MAXT){s.raf=0;s.lt=0;decide(s.dir>0?'right':'left');return}}
    else if(s.mode==='back'){var n2=4,h3=dt/n2;for(var j=0;j<n2;j++){s.vx+=(-KB*s.x-CB*s.vx)*h3;s.x+=s.vx*h3}
      if((Math.abs(s.x)<0.3&&Math.abs(s.vx)<4)||t-s.t0>MAXT){s.x=0;s.vx=0;s.mode='idle';s.raf=0;s.lt=0;draw();return}}
    else{s.raf=0;s.lt=0;draw();return}
    draw();s.raf=requestAnimationFrame(loop)}
  function kick(){var s=sim.current;s.t0=now();if(!s.raf){s.lt=0;s.raf=requestAnimationFrame(loop)}}
  function flush(){var s=sim.current;if(s.mode==='fling'){if(s.raf){cancelAnimationFrame(s.raf);s.raf=0}decide(s.dir>0?'right':'left')}}
  function go(dir,fromCard){flush();var s=sim.current,d=deckRef.current;if(d.idx>=total)return;s.refocus=!!fromCard;
    if(reduced()){decide(dir);return}
    s.mode='fling';s.dir=dir==='right'?1:-1;s.vx=s.dir*Math.max(900,width()*3.2);kick()}
  function undo(fromCard){flush();var d=deckRef.current,s=sim.current;if(!d.hist.length)return;
    var last=d.hist[d.hist.length-1],nd={idx:d.idx-1,hist:d.hist.slice(0,-1)};deckRef.current=nd;
    s.x=0;s.vx=0;s.mode='idle';s.refocus=!!fromCard;st[1](nd);
    live[1]('Restored: '+name(items[nd.idx]))}
  function key(e){var k=e.key;
    if(k==='ArrowRight'){e.preventDefault();go('right',true)}
    else if(k==='ArrowLeft'){e.preventDefault();go('left',true)}
    else if(k==='Backspace'){e.preventDefault();undo(true)}}
  function deckKey(e){if(e.key==='Backspace'&&e.target===e.currentTarget){e.preventDefault();undo(true)}}
  function down(e){if(e.button!=null&&e.button>0)return;var s=sim.current;flushBack(s);
    if(s.mode==='fling')return;
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    s.drag={x0:e.clientX-s.x,samples:[[now(),e.clientX]]};s.mode='drag';draw()}
  function flushBack(s){if(s.mode==='back'){if(s.raf){cancelAnimationFrame(s.raf);s.raf=0}s.mode='idle';s.vx=0}}
  function move(e){var s=sim.current,d=s.drag;if(!d)return;s.x=e.clientX-d.x0;d.samples.push([now(),e.clientX]);if(d.samples.length>6)d.samples.shift();draw()}
  function up(e,cancel){var s=sim.current,d=s.drag;if(!d)return;s.drag=null;
    var sm=d.samples,a=sm[0],b=sm[sm.length-1],v=b[0]>a[0]?(b[1]-a[1])/(b[0]-a[0]):0,w=width();
    var pass=!cancel&&(Math.abs(s.x)>THR*w||(Math.abs(v)>VTHR&&Math.abs(s.x)>12&&(v>0)===(s.x>0)));
    if(pass){var dir=s.x>0?'right':'left';s.refocus=document.activeElement===cardRef.current;
      if(reduced()){decide(dir);return}
      s.mode='fling';s.dir=s.x>0?1:-1;s.vx=Math.max(Math.abs(v)*1000,600)*s.dir;kick();return}
    if(reduced()||Math.abs(s.x)<0.5){s.x=0;s.vx=0;s.mode='idle';draw();return}
    s.mode='back';s.vx=v*1000;kick()}
  var s=sim.current,rm=reduced(),w=width(),x=s.x,prog=Math.min(1,Math.abs(x)/(THR*w));
  var rot=rm?0:Math.max(-MAXTILT,Math.min(MAXTILT,x*TILT));
  var stampDir=Math.abs(x)>STAMP?(x>0?'right':'left'):null;
  var sumText=summary(hist);
  var cards=[];
  for(var j=Math.min(total-1,idx+2);j>idx;j--){var dpt=j-idx,pr=dpt===1?prog:0,sc=1-0.05*dpt+0.05*pr,ty=10*dpt-10*pr;
    cards.push(h('div',{key:items[j].id,className:'cz-sw-card cz-sw-back','aria-hidden':'true',style:{transform:'translateY('+ty.toFixed(1)+'px) scale('+sc.toFixed(3)+')'}},
      h('span',{className:'cz-sw-n'},(j+1)+' of '+total),h('span',{className:'cz-sw-t'},items[j].title),items[j].meta?h('span',{className:'cz-sw-m'},items[j].meta):null))}
  if(top){var lbl=name(top)+', '+(idx+1)+' of '+total;
    cards.push(h('div',{key:top.id,ref:cardRef,className:'cz-sw-card cz-sw-top'+(s.drag?' cz-sw-drag':''),role:'group','aria-roledescription':'card',
        'aria-label':lbl,'aria-describedby':hintId,tabIndex:0,onKeyDown:key,
        onPointerDown:down,onPointerMove:move,onPointerUp:function(e){up(e,false)},onPointerCancel:function(e){up(e,true)},onLostPointerCapture:function(e){up(e,false)},
        style:{transform:'translateX('+x.toFixed(1)+'px) rotate('+rot.toFixed(2)+'deg)'}},
      h('span',{className:'cz-sw-n'},(idx+1)+' of '+total),
      h('span',{className:'cz-sw-t'},top.title),
      top.meta?h('span',{className:'cz-sw-m'},top.meta):null,
      stampDir?h('span',{className:'cz-sw-stamp cz-sw-st-'+stampDir,'aria-hidden':'true'},
        h('svg',{className:'cz-sw-mk',viewBox:'0 0 20 20',focusable:'false'},
          stampDir==='right'?[h('circle',{key:'c',className:'cz-sw-okm',cx:10,cy:10,r:9}),h('path',{key:'p',className:'cz-sw-okt',d:'M5.5 10.5 L8.6 13.4 L14.5 6.8'})]
            :[h('circle',{key:'c',className:'cz-sw-skm',cx:10,cy:10,r:9}),h('path',{key:'p',className:'cz-sw-skt',d:'M6.5 6.5 L13.5 13.5 M13.5 6.5 L6.5 13.5'})]),
        stampDir==='right'?rightL:leftL):null))}
  else cards.push(h('div',{key:'done',ref:sumRef,className:'cz-sw-card cz-sw-done',tabIndex:-1},
    h('svg',{className:'cz-sw-mk','aria-hidden':'true',viewBox:'0 0 20 20',focusable:'false'},h('circle',{className:'cz-sw-okm',cx:10,cy:10,r:9}),h('path',{className:'cz-sw-okt',d:'M5.5 10.5 L8.6 13.4 L14.5 6.8'})),
    h('span',{className:'cz-sw-t'},sumText)));
  var empty=!top;
  return h('section',{className:'cz-sw',role:'region','aria-labelledby':lblId},
    h('span',{id:lblId,className:'cz-sw-lb'},p.label),
    h('div',{ref:stageRef,className:'cz-sw-stage',onKeyDown:deckKey},cards),
    h('div',{className:'cz-sw-row'},
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-sw-b','aria-disabled':empty?'true':'false',onClick:function(){go('left',false)}},leftL),
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-sw-b','aria-disabled':hist.length?'false':'true',onClick:function(){undo(false)}},'Undo'),
      h('button',{type:'button',className:'cz-btn cz-btn-primary cz-sw-b','aria-disabled':empty?'true':'false',onClick:function(){go('right',false)}},rightL)),
    h('p',{id:hintId,className:'cz-sw-hint'},'Drag the card right to '+rightL.toLowerCase()+' or left to '+leftL.toLowerCase()+'. Keys: Right arrow '+rightL+', Left arrow '+leftL+', Backspace undo.'),
    h('span',{className:'cz-sw-sr','aria-live':'polite'},live[0]))}
window.Componentia.SwipeDeck=SwipeDeck;})();

/* Componentia ComboLock — forge_20261105T1359Z. Credit: Idea: the rotary combination padlock; near-duplicates seen: none as a web UI component in the results (MasterCrack, a CTF contract, an electronic-lock patent, a CS class exercise and lock vendor pages are not UI components) (licences not read, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
/* dial geometry in viewBox units (0 0 220 220) */
var C=110,RING=92,MAJ0=88,MAJ1=75,MIN1=81,NUMR=62,HUB=30,MAXT=3000,cnt=0;
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function now(){return (window.performance&&performance.now)?performance.now():Date.now()}
function f1(n){return Math.round(n*10)/10}
function mod(a,m){return ((a%m)+m)%m}
function ord(n){var s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])}
function dirOf(i){return i%2===0?'right':'left'}
/* numbers sit counter-clockwise on the face, so turning right (clockwise) raises the number under the index */
function face(max){var out=[],sd=360/max;
  for(var n=0;n<max;n++){var a=-n*sd*Math.PI/180,sx=Math.sin(a),cy=-Math.cos(a),maj=n%5===0;
    out.push(h('line',{key:'t'+n,className:maj?'cz-lock-maj':'cz-lock-min',x1:f1(C+MAJ0*sx),y1:f1(C+MAJ0*cy),x2:f1(C+(maj?MAJ1:MIN1)*sx),y2:f1(C+(maj?MAJ1:MIN1)*cy)}));
    if(maj){var x=f1(C+NUMR*sx),y=f1(C+NUMR*cy);
      out.push(h('text',{key:'n'+n,className:'cz-lock-num',x:x,y:y,textAnchor:'middle',dominantBaseline:'central',transform:'rotate('+f1(-n*sd)+' '+x+' '+y+')'},String(n)))}}
  return out}
function ComboLock(p){
  var len=Math.max(1,p.length||3),max=Math.max(5,p.max||40),sd=360/max;
  var ctl=Array.isArray(p.value);
  var st=S(function(){return (p.defaultValue||[]).slice(0,len)});
  var code=ctl?p.value.slice(0,len):st[0];
  var uid=R.useId?R.useId():'',idr=R.useRef(null);
  if(!idr.current)idr.current='cz-lock-'+(uid?uid.replace(/[^a-zA-Z0-9_-]/g,''):'n'+(++cnt));
  var lblId=idr.current+'-l',stepId=idr.current+'-s',keysId=idr.current+'-k';
  var live=S(''),fr=S(0),codeRef=R.useRef(code),m=R.useRef(null),dialRef=R.useRef(null);
  codeRef.current=code;
  if(!m.current)m.current={rot:0,start:0,ext:0,drag:false,last:0,lt:0,v:0,raf:0,phase:'',t0:0,pt:0};
  var ticks=R.useMemo(function(){return face(max)},[max]);
  R.useEffect(function(){return function(){var s=m.current;if(s.raf){cancelAnimationFrame(s.raf);s.raf=0}}},[]);
  function draw(){fr[1](function(n){return n+1})}
  function num(rot){return mod(Math.round(rot/sd),max)}
  function snapRot(rot){return Math.round(rot/sd)*sd}
  function stop(s){if(s.raf){cancelAnimationFrame(s.raf);s.raf=0}}
  function anchor(s){s.start=s.ext=s.rot}
  function setCode(next,msg){codeRef.current=next;if(!ctl)st[1](next);live[1](msg);
    if(p.onChange)p.onChange(next.slice());
    if(next.length>=len&&p.onComplete)p.onComplete(next.slice())}
  function nextMsg(k){return k<len?' Turn '+dirOf(k)+' to the '+ord(k+1)+' number.':' Code entered.'}
  function commit(n){var c=codeRef.current;if(c.length>=len)return false;var next=c.concat([n]);
    setCode(next,ord(next.length)+' number set: '+n+'.'+nextMsg(next.length));return true}
  /* pointer turns: a reversal of at least 0.6 of a tick, after at least half a tick of travel the right way, commits the number at the turning point */
  function track(s){var c=codeRef.current;if(c.length>=len)return;
    var sg=dirOf(c.length)==='right'?1:-1,r=s.rot*sg,e=s.ext*sg,b=s.start*sg;
    if(r>e){s.ext=s.rot;return}
    if(e-r>=sd*0.6&&e-b>=sd*0.5){var turn=s.ext;if(commit(num(turn))){s.start=turn;s.ext=s.rot}return}
    if(r<b){s.start=s.ext=s.rot}}
  function ang(e){var el=dialRef.current;if(!el)return null;var b=el.getBoundingClientRect(),x=e.clientX-(b.left+b.width/2),y=e.clientY-(b.top+b.height/2);
    if(Math.sqrt(x*x+y*y)<b.width*0.08)return null;return Math.atan2(x,-y)*180/Math.PI}
  function down(e){if(e.button!=null&&e.button>0)return;var a=ang(e);e.preventDefault();
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    try{e.currentTarget.focus({preventScroll:true})}catch(_){}
    var s=m.current;stop(s);s.drag=true;s.last=a;s.lt=now();s.v=0}
  function move(e){var s=m.current;if(!s.drag)return;var a=ang(e);if(a==null)return;
    if(s.last==null){s.last=a;return}
    var d=a-s.last;if(d>180)d-=360;if(d<-180)d+=360;s.last=a;s.rot+=d;
    var t=now(),dt=t-s.lt;if(dt>0)s.v=0.6*s.v+0.4*(d/dt);s.lt=t;track(s);draw()}
  function loop(t){var s=m.current,dt=Math.min(40,Math.max(0,t-(s.pt||t)));s.pt=t;
    if(s.phase==='spin'){s.rot+=s.v*dt;s.v*=Math.pow(0.9,dt/16);track(s);if(Math.abs(s.v)<0.02)s.phase='snap'}
    else{var tg=snapRot(s.rot),d=tg-s.rot;if(Math.abs(d)<0.05){s.rot=tg;s.raf=0;draw();return}s.rot+=d*Math.min(1,dt/60)}
    if(t-s.t0>MAXT){s.rot=snapRot(s.rot);s.raf=0;draw();return}
    draw();s.raf=requestAnimationFrame(loop)}
  function up(){var s=m.current;if(!s.drag)return;s.drag=false;
    if(reduced()){s.rot=snapRot(s.rot);draw();return}
    if(now()-s.lt>80)s.v=0;s.v=Math.max(-1.2,Math.min(1.2,s.v));
    s.phase=Math.abs(s.v)>0.05?'spin':'snap';s.t0=now();s.pt=0;stop(s);s.raf=requestAnimationFrame(loop)}
  function turn(k){var s=m.current;stop(s);s.rot=snapRot(s.rot)+k*sd;anchor(s);draw()}
  function setNumber(){var s=m.current;stop(s);s.rot=snapRot(s.rot);
    if(codeRef.current.length>=len){live[1]('Code already entered. Press Clear to start again.');return}
    commit(num(s.rot));anchor(s);draw()}
  function back(){var c=codeRef.current,s=m.current;if(!c.length)return;var next=c.slice(0,-1);anchor(s);
    setCode(next,'Cleared the '+ord(c.length)+' number.'+nextMsg(next.length))}
  function clear(){var s=m.current;anchor(s);setCode([],'Code cleared. Turn right to the 1st number.')}
  function key(e){var k=e.key,n=0;
    if(k==='ArrowRight'||k==='ArrowUp')n=1;else if(k==='ArrowLeft'||k==='ArrowDown')n=-1;
    else if(k==='PageUp')n=5;else if(k==='PageDown')n=-5;
    if(n){e.preventDefault();turn(n);return}
    if(k==='Enter'){e.preventDefault();setNumber();return}
    if(k==='Backspace'||k==='Delete'){e.preventDefault();back()}}
  var s=m.current,cur=num(s.rot),full=code.length>=len,dir=dirOf(code.length);
  var step=full?'Code entered':'Turn '+dir+' to the '+ord(code.length+1)+' number';
  var vt=full?cur+', code entered':cur+', turning '+dir+', '+ord(code.length+1)+' of '+len;
  var slots=[],srSlots=[];for(var i=0;i<len;i++){if(i)slots.push(h('span',{key:'d'+i,className:'cz-lock-dot'},'·'));
    var has=i<code.length;slots.push(h('span',{key:'s'+i,className:'cz-lock-slot'+(has?'':' cz-lock-empty')},has?String(code[i]):'__'));if(has)srSlots.push(code[i])}
  var stat=p.status==='ok'||p.status==='error'?p.status:'idle';
  return h('div',{className:'cz-lock'},
    h('span',{id:lblId,className:'cz-lock-lb'},p.label),
    h('p',{id:stepId,className:'cz-lock-step'},step),
    h('div',{ref:dialRef,role:'slider',tabIndex:0,className:'cz-lock-dial','aria-labelledby':lblId,'aria-describedby':stepId+' '+keysId,
      'aria-valuemin':0,'aria-valuemax':max-1,'aria-valuenow':cur,'aria-valuetext':vt,
      onKeyDown:key,onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up,onLostPointerCapture:up},
      h('svg',{className:'cz-lock-svg',viewBox:'0 0 220 220','aria-hidden':'true',focusable:'false'},
        h('circle',{className:'cz-lock-face',cx:C,cy:C,r:RING}),
        h('g',{transform:'rotate('+f1(s.rot)+' '+C+' '+C+')'},ticks),
        h('circle',{className:'cz-lock-hub',cx:C,cy:C,r:HUB}),
        h('text',{className:'cz-lock-cur',x:C,y:C,textAnchor:'middle',dominantBaseline:'central'},String(cur)),
        h('path',{className:'cz-lock-idx',d:'M100 1 L120 1 L110 15 Z'}))),
    h('div',{className:'cz-lock-slots','aria-hidden':'true'},slots),
    h('span',{className:'cz-lock-sr'},'Entered '+code.length+' of '+len+(srSlots.length?': '+srSlots.join(', '):'')),
    h('div',{className:'cz-lock-btns'},
      h('button',{type:'button',className:'cz-btn cz-btn-primary cz-lock-btn','aria-disabled':full?'true':'false',onClick:setNumber},'Set number'),
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-lock-btn',onClick:clear},'Clear')),
    h('p',{id:keysId,className:'cz-lock-keys'},'Drag around the dial, or use the arrow keys and Enter. Backspace clears the last number.'),
    h('div',{role:'status',className:'cz-lock-status'},stat==='idle'?null:h(R.Fragment,null,
      h('svg',{className:'cz-lock-mark',viewBox:'0 0 14 14','aria-hidden':'true',focusable:'false'},
        stat==='ok'?h('circle',{className:'cz-lock-ok',cx:7,cy:7,r:5.5}):h('rect',{className:'cz-lock-crit',x:1.5,y:1.5,width:11,height:11})),
      h('span',null,p.statusText||(stat==='ok'?'Opened':'Wrong code')))),
    h('span',{className:'cz-lock-sr','aria-live':'polite'},live[0]))}
window.Componentia.ComboLock=ComboLock;})();

/* Componentia EtchSketch — forge_20261105T1359Z. Credit: Idea: the two-knob line-drawing toy; near-duplicates seen: Chrome Labs 'Etch-a-Skeb' (9to5Google), etch-a-sketch by Charbytesdev, Etch-a-Sketch by Shahir-47, web-sketch (Hackster), sketch-project by zeeshanchana95 (licences not read, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
/* DEG: degrees of knob turn per tick; PAD: logical margin around the drawing area so edge lines are not clipped */
var DEG=10,PAD=4,cnt=0,seq=0;
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function EtchSketch(p){
  var W=Math.max(20,p.width||240),H=Math.max(20,p.height||160),step=Math.max(1,p.step||2);
  var uid=R.useId?R.useId():'',idr=R.useRef(null);
  if(!idr.current)idr.current='cz-etch-'+(uid?uid.replace(/[^a-zA-Z0-9_-]/g,''):'n'+(++cnt));
  var lblId=idr.current+'-l',kxId=idr.current+'-kx',kyId=idr.current+'-ky',hintId=idr.current+'-h';
  var m=R.useRef(null),cvRef=R.useRef(null),scrRef=R.useRef(null),live=S(''),fr=S(0);
  if(!m.current){var pts=(p.defaultPoints||[]).map(function(q){return [clamp(Math.round(+q[0]||0),0,W),clamp(Math.round(+q[1]||0),0,H)]});
    if(!pts.length)pts=[[Math.round(W/2),Math.round(H/2)]];
    m.current={pts:pts,strokes:pts.length>1?[1]:[],src:null,drag:null,last:null,acc:0}}
  function draw(){fr[1](function(n){return n+1})}
  function paint(){var cv=cvRef.current;if(!cv)return;var b=cv.getBoundingClientRect();if(!b.width)return;
    var dpr=window.devicePixelRatio||1,pw=Math.max(1,Math.round(b.width*dpr)),ph=Math.max(1,Math.round(b.height*dpr));
    if(cv.width!==pw)cv.width=pw;if(cv.height!==ph)cv.height=ph;
    var cs=getComputedStyle(cv),tk=function(n){return cs.getPropertyValue(n).trim()};
    var ctx=cv.getContext('2d');if(!ctx)return;ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle=tk('--inset');ctx.fillRect(0,0,pw,ph);
    var sx=pw/(W+2*PAD),sy=ph/(H+2*PAD),P=m.current.pts;
    function X(v){return (v+PAD)*sx}function Y(v){return (v+PAD)*sy}
    ctx.strokeStyle=tk('--ink');ctx.lineWidth=Math.max(1.5,1.6*sx);ctx.lineJoin='round';ctx.lineCap='round';
    if(P.length>1){ctx.beginPath();ctx.moveTo(X(P[0][0]),Y(P[0][1]));for(var i=1;i<P.length;i++)ctx.lineTo(X(P[i][0]),Y(P[i][1]));ctx.stroke()}
    var e=P[P.length-1];ctx.beginPath();ctx.arc(X(e[0]),Y(e[1]),Math.max(3,3.2*sx),0,Math.PI*2);
    ctx.fillStyle=tk('--accent-ink');ctx.fill();ctx.lineWidth=Math.max(1,1.2*sx);ctx.strokeStyle=tk('--ink');ctx.stroke()}
  var paintRef=R.useRef(paint);paintRef.current=paint;
  R.useEffect(function(){paint()});
  R.useEffect(function(){var go=function(){paintRef.current()},ro=null,mo=null,mq=null;
    if(window.ResizeObserver&&cvRef.current){ro=new ResizeObserver(go);ro.observe(cvRef.current)}
    if(window.MutationObserver){mo=new MutationObserver(go);mo.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['data-theme','class']})}
    try{mq=window.matchMedia('(prefers-color-scheme: dark)');mq.addEventListener('change',go)}catch(_){mq=null}
    window.addEventListener('resize',go);
    return function(){if(ro)ro.disconnect();if(mo)mo.disconnect();if(mq)try{mq.removeEventListener('change',go)}catch(_){}window.removeEventListener('resize',go)}},[]);
  function emit(){if(p.onChange)p.onChange(m.current.pts.map(function(q){return [q[0],q[1]]}))}
  function begin(src){var s=m.current;if(s.src!==src){s.strokes.push(s.pts.length);s.src=src}}
  function nudge(axis,k){var s=m.current,P=s.pts,changed=false,dir=k>0?1:-1;
    for(var i=0;i<Math.abs(k);i++){var e=P[P.length-1],n=axis==='x'?[clamp(e[0]+dir*step,0,W),e[1]]:[e[0],clamp(e[1]+dir*step,0,H)];
      if(n[0]===e[0]&&n[1]===e[1])break;
      var st=s.strokes.length?s.strokes[s.strokes.length-1]:0;
      if(P.length>=st+1&&P.length>=2){var a=P[P.length-2];
        if((a[0]===e[0]&&e[0]===n[0]&&(e[1]-a[1])*(n[1]-e[1])>0)||(a[1]===e[1]&&e[1]===n[1]&&(e[0]-a[0])*(n[0]-e[0])>0)){P[P.length-1]=n;changed=true;continue}}
      P.push(n);changed=true}
    if(changed){draw();emit()}}
  function key(axis){return function(e){var k=e.key,n=0;
    if(axis==='x'){if(k==='ArrowRight'||k==='ArrowUp')n=1;else if(k==='ArrowLeft'||k==='ArrowDown')n=-1}
    else{if(k==='ArrowDown'||k==='ArrowRight')n=1;else if(k==='ArrowUp'||k==='ArrowLeft')n=-1}
    if(!n)return;e.preventDefault();begin('k'+axis);nudge(axis,e.shiftKey?n*5:n)}}
  function blur(){var s=m.current;if(s.src&&s.src.charAt(0)==='k')s.src=null}
  function ang(e,el){var b=el.getBoundingClientRect(),x=e.clientX-(b.left+b.width/2),y=e.clientY-(b.top+b.height/2);
    if(Math.sqrt(x*x+y*y)<b.width*0.1)return null;return Math.atan2(x,-y)*180/Math.PI}
  function down(axis){return function(e){if(e.button!=null&&e.button>0)return;e.preventDefault();var el=e.currentTarget;
    try{el.setPointerCapture(e.pointerId)}catch(_){}try{el.focus({preventScroll:true})}catch(_){}
    var s=m.current;s.drag=axis;s.last=ang(e,el);s.acc=0;begin('p'+(++seq))}}
  function move(axis){return function(e){var s=m.current;if(s.drag!==axis)return;var a=ang(e,e.currentTarget);if(a==null)return;
    if(s.last==null){s.last=a;return}var d=a-s.last;if(d>180)d-=360;if(d<-180)d+=360;s.last=a;s.acc+=d;
    var n=0;while(s.acc>=DEG){n++;s.acc-=DEG}while(s.acc<=-DEG){n--;s.acc+=DEG}if(n)nudge(axis,n)}}
  function up(){var s=m.current;s.drag=null;s.last=null;s.acc=0}
  function erase(){var s=m.current,e=s.pts[s.pts.length-1];s.pts=[[e[0],e[1]]];s.strokes=[];s.src=null;
    live[1](live[0]==='Screen erased'?'Screen erased.':'Screen erased');draw();emit();
    var el=scrRef.current;if(el&&!reduced()){el.classList.remove('cz-etch-shake');void el.offsetWidth;el.classList.add('cz-etch-shake')}}
  function undo(){var s=m.current;while(s.strokes.length&&s.strokes[s.strokes.length-1]>=s.pts.length)s.strokes.pop();
    if(!s.strokes.length){live[1]('Nothing to undo');return}
    s.pts.length=Math.max(1,s.strokes.pop());s.src=null;live[1](live[0]==='Stroke undone'?'Stroke undone.':'Stroke undone');draw();emit()}
  var s=m.current,P=s.pts,pen=P[P.length-1],n=P.length;
  var canUndo=s.strokes.some(function(v){return v<n});
  function knob(axis,id,text){var val=axis==='x'?pen[0]:pen[1],max=axis==='x'?W:H,rot=(val/step)*DEG;
    return h('div',{className:'cz-etch-kcol cz-etch-k'+axis},
      h('div',{role:'slider',tabIndex:0,className:'cz-etch-knob','aria-labelledby':lblId+' '+id,'aria-describedby':hintId,
        'aria-orientation':axis==='x'?'horizontal':'vertical','aria-valuemin':0,'aria-valuemax':max,'aria-valuenow':val,
        'aria-valuetext':axis+' '+val+' of '+max,onKeyDown:key(axis),onBlur:blur,
        onPointerDown:down(axis),onPointerMove:move(axis),onPointerUp:up,onPointerCancel:up,onLostPointerCapture:up},
        h('svg',{viewBox:'0 0 64 64','aria-hidden':'true',focusable:'false',className:'cz-etch-ksvg'},
          h('circle',{className:'cz-etch-kbody',cx:32,cy:32,r:28}),
          h('g',{transform:'rotate('+(Math.round(rot*10)/10)+' 32 32)'},
            h('line',{className:'cz-etch-knotch',x1:32,y1:32,x2:32,y2:9}),
            h('circle',{className:'cz-etch-kgrip',cx:32,cy:13,r:3})),
          h('circle',{className:'cz-etch-kcap',cx:32,cy:32,r:5}))),
      h('span',{id:id,className:'cz-etch-klb'},text))}
  return h('div',{className:'cz-etch'},
    h('span',{id:lblId,className:'cz-etch-lb'},p.label),
    h('div',{className:'cz-etch-frame'},
      h('div',{ref:scrRef,className:'cz-etch-screen',onAnimationEnd:function(e){e.currentTarget.classList.remove('cz-etch-shake')}},
        h('canvas',{ref:cvRef,className:'cz-etch-cv',width:W+2*PAD,height:H+2*PAD,style:{aspectRatio:(W+2*PAD)+' / '+(H+2*PAD)},
          role:'img','aria-label':n>1?'Drawing, '+n+' points':'Drawing, blank screen'})),
      h('div',{className:'cz-etch-knobs'},knob('x',kxId,'Left knob · across'),knob('y',kyId,'Right knob · up and down'))),
    h('div',{className:'cz-etch-btns'},
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-etch-btn','aria-disabled':canUndo?'false':'true',onClick:undo},'Undo stroke'),
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-etch-btn',onClick:erase},'Erase')),
    h('p',{id:hintId,className:'cz-etch-hint'},'Drag around a knob to turn it, or focus a knob and use the arrow keys (Shift for bigger moves).'),
    h('span',{className:'cz-etch-sr','aria-live':'polite'},live[0]))}
window.Componentia.EtchSketch=EtchSketch;})();

/* Componentia BumpTip — forge_20261105T1359Z-bumptip. Credit: Idea: the bump-a-block tooltip, Uiverse 'tooltip-mario' by barisdogansutcu (MIT); its game sprites were not used. Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState,E=R.useEffect,L=R.useLayoutEffect||R.useEffect;
var GAP=10,EDGE=4,MAXW=240,LEAVE=120,cnt=0;
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
/* the crate: 16x16 cells, ink outline with cut corners, accent face, highlight top bevel, inset bottom bevel, on-accent rivets */
function px(k,c,x,y,w,ht){return h('rect',{key:k,className:c,x:x,y:y,width:w,height:ht})}
function Crate(g){return h('svg',{className:'cz-bt-svg',viewBox:'0 0 16 16','aria-hidden':'true',focusable:'false',shapeRendering:'crispEdges'},
  px('o1','cz-bt-ol',1,0,14,1),px('o2','cz-bt-ol',1,15,14,1),px('o3','cz-bt-ol',0,1,1,14),px('o4','cz-bt-ol',15,1,1,14),
  px('f','cz-bt-face',1,1,14,14),px('b1','cz-bt-hi',1,1,14,1),px('b2','cz-bt-lo',1,14,14,1),
  px('r1','cz-bt-rv',2,3,1,1),px('r2','cz-bt-rv',13,3,1,1),px('r3','cz-bt-rv',2,12,1,1),px('r4','cz-bt-rv',13,12,1,1),
  h('text',{className:'cz-bt-gl',x:8,y:8.4,textAnchor:'middle',dominantBaseline:'central'},g))}
function BumpTip(p){
  var ctl=p.open!=null,uid=R.useId?R.useId():'',idr=R.useRef(null);
  if(!idr.current)idr.current='cz-bt-'+(uid?uid.replace(/[^a-zA-Z0-9_-]/g,''):'n'+(++cnt));
  var tipId=idr.current+'-t',lblId=idr.current+'-l';
  var pin=S(!!p.defaultOpen),hov=S(false),foc=S(false),dis=S(false),live=S(''),bump=S(0);
  var want=pin[0]||((hov[0]||foc[0])&&!dis[0]),shown=ctl?!!p.open:want;
  var wrap=R.useRef(null),btn=R.useRef(null),bub=R.useRef(null),arr=R.useRef(null),tmr=R.useRef(0),prevShown=R.useRef(shown),prevWant=R.useRef(want),annc=R.useRef(false);
  var side0=p.placement==='bottom'?'bottom':'top';
  /* hover / focus both gone: forget an Escape dismissal */
  E(function(){if(!hov[0]&&!foc[0]&&dis[0])dis[1](false)},[hov[0],foc[0],dis[0]]);
  /* controlled: report the wanted state */
  E(function(){if(prevWant.current!==want){prevWant.current=want;if(p.onOpenChange)p.onOpenChange(want)}},[want]);
  /* bump when the bubble appears */
  E(function(){if(shown&&!prevShown.current&&!reduced())bump[1](function(n){return n+1});prevShown.current=shown},[shown]);
  /* announce the tip once when pinned by a click */
  E(function(){if(annc.current&&shown&&bub.current){annc.current=false;live[1](bub.current.textContent||'')}},[shown,pin[0]]);
  E(function(){return function(){clearTimeout(tmr.current)}},[]);
  /* Escape can remove the bubble under the pointer without a pointerleave: watch moves while dismissed */
  E(function(){if(!(dis[0]&&hov[0]))return;
    function mv(e){var w=wrap.current;if(w&&!w.contains(e.target)){clearTimeout(tmr.current);hov[1](false)}}
    document.addEventListener('pointermove',mv);return function(){document.removeEventListener('pointermove',mv)}},[dis[0],hov[0]]);
  /* Escape dismisses wherever focus is; a tap outside closes a pinned bubble */
  E(function(){if(!shown)return;
    function key(e){if(e.key==='Escape'||e.key==='Esc'){pin[1](false);dis[1](true);live[1]('')}}
    function down(e){var w=wrap.current;if(pin[0]&&w&&!w.contains(e.target)){pin[1](false);live[1]('')}}
    document.addEventListener('keydown',key);document.addEventListener('pointerdown',down);
    return function(){document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',down)}},[shown,pin[0]]);
  /* place the bubble: flip to bottom if no room above, clamp inside the container and the viewport */
  L(function(){if(!shown)return;
    function place(){var w=wrap.current,b=btn.current,u=bub.current,a=arr.current;if(!w||!b||!u)return;
      var par=w.parentElement||w,pr=par.getBoundingClientRect(),vw=document.documentElement.clientWidth||window.innerWidth;
      var cl=Math.max(pr.left,0),cr=Math.min(pr.right,vw),room=Math.max(80,cr-cl-2*EDGE);
      u.style.maxWidth=Math.min(MAXW,room)+'px';
      var wr=w.getBoundingClientRect(),br=b.getBoundingClientRect(),uw=u.offsetWidth,uh=u.offsetHeight;
      var side=side0;if(side==='top'&&br.top-uh-GAP<0)side='bottom';
      var cx=br.left+br.width/2,lv=cx-uw/2;lv=Math.min(lv,cr-EDGE-uw);lv=Math.max(lv,cl+EDGE);
      u.style.left=Math.round(lv-wr.left)+'px';
      u.style.top=Math.round(side==='top'?br.top-wr.top-uh-GAP:br.bottom-wr.top+GAP)+'px';
      u.setAttribute('data-side',side);
      if(a){var ax=Math.max(12,Math.min(uw-12,cx-lv));a.style.left=Math.round(ax-8)+'px'}}
    place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
    return function(){window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true)}},[shown,p.tip,p.placement]);
  function enter(e){if(e.pointerType==='touch')return;clearTimeout(tmr.current);hov[1](true)}
  function leave(e){if(e.pointerType==='touch')return;clearTimeout(tmr.current);tmr.current=setTimeout(function(){hov[1](false)},LEAVE)}
  function click(){var next=!pin[0];pin[1](next);
    if(next){dis[1](false);annc.current=true;if(shown&&!reduced())bump[1](function(n){return n+1})}
    else{dis[1](true);live[1]('')}}
  var bc=bump[0]>0?' cz-bt-bump'+(bump[0]%2):'';
  return h('span',{ref:wrap,className:'cz-bt'+(shown?' cz-bt-open':''),onPointerEnter:enter,onPointerLeave:leave},
    h('button',{ref:btn,type:'button',className:'cz-bt-btn','aria-labelledby':lblId,'aria-describedby':shown?tipId:undefined,
      'aria-expanded':pin[0]&&shown?'true':'false',onClick:click,
      onFocus:function(){foc[1](true)},onBlur:function(){foc[1](false)}},
      h('span',{className:'cz-bt-blk'+bc},Crate(p.glyph==null?'i':String(p.glyph)))),
    h('span',{id:lblId,className:p.hideLabel?'cz-bt-sr':'cz-bt-cap'},p.label),
    shown?h('span',{ref:bub,id:tipId,role:'tooltip',className:'cz-bt-tip','data-side':side0},
      h('span',{className:'cz-bt-txt'},p.tip),
      h('svg',{ref:arr,className:'cz-bt-arr',viewBox:'0 0 16 8','aria-hidden':'true',focusable:'false',shapeRendering:'crispEdges'},
        h('rect',{className:'cz-bt-ae',x:0,y:0,width:2,height:2}),h('rect',{className:'cz-bt-af',x:2,y:0,width:12,height:2}),h('rect',{className:'cz-bt-ae',x:14,y:0,width:2,height:2}),
        h('rect',{className:'cz-bt-ae',x:2,y:2,width:2,height:2}),h('rect',{className:'cz-bt-af',x:4,y:2,width:8,height:2}),h('rect',{className:'cz-bt-ae',x:12,y:2,width:2,height:2}),
        h('rect',{className:'cz-bt-ae',x:4,y:4,width:2,height:2}),h('rect',{className:'cz-bt-af',x:6,y:4,width:4,height:2}),h('rect',{className:'cz-bt-ae',x:10,y:4,width:2,height:2}),
        h('rect',{className:'cz-bt-ae',x:6,y:6,width:4,height:2}))):null,
    h('span',{className:'cz-bt-sr','aria-live':'polite'},live[0]))}
window.Componentia.BumpTip=BumpTip;})();

/* Componentia HazardBand — forge_20261106-paste3. Credit: Idea: the warning-tape banner (Warning Tape tile, neo-brutalism set of a third-party animated component library; licence not stated, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
function rmq(){try{return window.matchMedia('(prefers-reduced-motion: reduce)')}catch(_){return null}}
function HazardBand(p){
  var tone=p.tone==='stop'?'stop':'caution',moving=p.moving!==false,compact=!!p.compact;
  var mq=R.useRef(null);if(mq.current===null)mq.current=rmq()||false;
  var red=S(function(){return !!(mq.current&&mq.current.matches)}),hov=S(false),foc=S(false),
      hid=S(function(){return typeof document!=='undefined'&&!!document.hidden}),usr=S(false),fresh=S(true);
  var rootRef=R.useRef(null),initStop=R.useRef(null);
  if(initStop.current===null)initStop.current=tone==='stop';
  R.useEffect(function(){var q=mq.current,on=function(){red[1](!!q.matches)};
    if(q)try{q.addEventListener('change',on)}catch(_){}
    var vis=function(){hid[1](!!document.hidden)};document.addEventListener('visibilitychange',vis);
    /* role="alert" only for the first moment after mount; later renders use role="status" */
    var t=setTimeout(function(){fresh[1](false)},1500);
    return function(){if(q)try{q.removeEventListener('change',on)}catch(_){}document.removeEventListener('visibilitychange',vis);clearTimeout(t)}},[]);
  var animated=moving&&!red[0];
  var run=animated&&!usr[0]&&!hov[0]&&!foc[0]&&!hid[0];
  var role=tone==='stop'&&initStop.current&&fresh[0]?'alert':'status';
  function tape(){return h('div',{className:'cz-hzb-tape'+(animated?' cz-hzb-mv':''),'aria-hidden':'true'})}
  return h('div',{ref:rootRef,className:'cz-hzb'+(compact?' cz-hzb-compact':''),'data-tone':tone,'data-run':run?'true':'false',
      onPointerEnter:function(){hov[1](true)},onPointerLeave:function(){hov[1](false)},
      onFocus:function(){foc[1](true)},
      onBlur:function(e){var r=rootRef.current;if(!r||!e.relatedTarget||!r.contains(e.relatedTarget))foc[1](false)}},
    tape(),
    h('div',{className:'cz-hzb-body'},
      h('div',{className:'cz-hzb-cw'},
        h('div',{className:'cz-hzb-chip'},
          h('div',{className:'cz-hzb-msg',role:role,'aria-atomic':'true'},
            h('div',{className:'cz-hzb-kind'},
              h('span',{className:'cz-hzb-mk','aria-hidden':'true'}),
              h('span',null,tone==='stop'?'Stop':'Caution')),
            h('p',{className:'cz-hzb-ttl'},p.title),
            p.sub?h('p',{className:'cz-hzb-sub'},p.sub):null),
          p.action?h('div',{className:'cz-hzb-act'},p.action):null)),
      animated?h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-hzb-tg','aria-pressed':usr[0]?'true':'false',
        onClick:function(){usr[1](!usr[0])}},usr[0]?'Play stripes':'Pause stripes'):null),
    compact?null:tape())}
window.Componentia.HazardBand=HazardBand;})();

/* Componentia CorridorView — forge_20261106-paste3. Credit: Idea: a plan-plus-first-person raycast view (Dungeon Raycaster tile of a third-party animated component library; licence not stated, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
/* Default layout: a 9x9 service corridor. S start by the door, T the target in the south-west corner. */
var DEF_MAP=['#########','#S..#...#','#.#.#.#.#','#.#...#.#','#.###.#.#','#...#...#','###.#.#.#','#T....#.#','#########'];
var DIRS=['north','east','south','west'],DX=[0,1,0,-1],DY=[-1,0,1,0];
/* FOV: camera plane half-width (about 66 degrees); TURN_MS: turn interpolation; SHADES: discrete distance steps */
var FOV=0.66,TURN_MS=180,SHADES=4,cnt=0;
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function parseMap(src){var rows=(src&&src.length?src:DEF_MAP).map(function(r){return String(r)});
  var w=0;rows.forEach(function(r){if(r.length>w)w=r.length});
  var g=[],s=null,t=null;
  for(var y=0;y<rows.length;y++){var line=[];for(var x=0;x<w;x++){var c=rows[y].charAt(x)||'#';
      if(c==='S'){s={x:x,y:y};c='.'}else if(c==='T'){t={x:x,y:y};c='.'}else if(c!=='.')c='#';line.push(c)}g.push(line)}
  if(!s)for(var yy=0;yy<g.length&&!s;yy++)for(var xx=0;xx<w;xx++)if(g[yy][xx]==='.'){s={x:xx,y:yy};break}
  return {g:g,w:w,h:g.length,s:s||{x:0,y:0},t:t}}
function wallAt(M,x,y){return x<0||y<0||x>=M.w||y>=M.h||M.g[y][x]==='#'}
/* colour helpers: tokens are hex in this system; anything else is resolved through a probe element */
function parseCol(v,probe){v=(v||'').trim();var m=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if(m){var s=m[1];if(s.length===3)s=s.charAt(0)+s.charAt(0)+s.charAt(1)+s.charAt(1)+s.charAt(2)+s.charAt(2);
    return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)]}
  if(probe){probe.style.color=v;var n=(getComputedStyle(probe).color.match(/[\d.]+/g)||[]).map(Number);if(n.length>=3)return n.slice(0,3)}
  return [128,128,128]}
function hex(c){return '#'+c.map(function(n){var s=Math.max(0,Math.min(255,Math.round(n))).toString(16);return s.length<2?'0'+s:s}).join('')}
function mix(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}
function cast(M,px,py,rx,ry){var mx=Math.floor(px),my=Math.floor(py),ddx=rx===0?1e30:Math.abs(1/rx),ddy=ry===0?1e30:Math.abs(1/ry),
    sx=rx<0?-1:1,sy=ry<0?-1:1,sdx=rx<0?(px-mx)*ddx:(mx+1-px)*ddx,sdy=ry<0?(py-my)*ddy:(my+1-py)*ddy,side=0;
  for(var i=0;i<128;i++){if(sdx<sdy){sdx+=ddx;mx+=sx;side=0}else{sdy+=ddy;my+=sy;side=1}if(wallAt(M,mx,my))break}
  return {d:side===0?sdx-ddx:sdy-ddy,side:side}}
function freeAhead(M,x,y,hd){var n=0;while(n<64&&!wallAt(M,x+DX[hd]*(n+1),y+DY[hd]*(n+1)))n++;return n}
function compass(dx,dy){var ns=dy<0?'north':dy>0?'south':'',ew=dx>0?'east':dx<0?'west':'';return ns&&ew?ns+'-'+ew:ns||ew}
function cap(t){return t.charAt(0).toUpperCase()+t.slice(1)}
function describe(M,x,y,hd,tl,noT){var f=freeAhead(M,x,y,hd),out='Facing '+DIRS[hd]+'. ';
  out+=f===0?'Wall directly ahead.':'Wall ahead in '+f+(f===1?' step.':' steps.');
  if(M.t&&!noT){var dx=M.t.x-x,dy=M.t.y-y;
    if(!dx&&!dy)out+=' You are at '+tl+'.';
    else{var st=Math.abs(dx)+Math.abs(dy);out+=' '+cap(tl)+' is '+st+(st===1?' step ':' steps ')+compass(dx,dy);
      if(dx&&dy)out+=' ('+Math.abs(dy)+' '+(dy<0?'north':'south')+', '+Math.abs(dx)+' '+(dx>0?'east':'west')+')';
      out+='.'}}
  return out}
function CorridorView(p){
  var M=R.useMemo(function(){return parseMap(p.map)},[(p.map||DEF_MAP).join('\n')]);
  var uid=R.useId?R.useId():'',idr=R.useRef(null);
  if(!idr.current)idr.current='cz-cvw-'+(uid?uid.replace(/[^a-zA-Z0-9_-]/g,''):'n'+(++cnt));
  var lblId=idr.current+'-l',hintId=idr.current+'-h';
  var hd0=((+p.defaultHeading||0)%4+4)%4,tl=(typeof p.targetLabel==='string'&&p.targetLabel.trim())?p.targetLabel.trim():'the target';
  var st=S(function(){return {x:M.s.x,y:M.s.y,hd:hd0}}),pos=st[0];
  var live=S(function(){return describe(M,M.s.x,M.s.y,hd0,tl)});
  var cvRef=R.useRef(null),prRef=R.useRef(null);
  var m=R.useRef(null);if(!m.current)m.current={ang:hd0*Math.PI/2,to:hd0*Math.PI/2,raf:0,from:0,t0:0};
  function say(t){live[1](function(o){return o===t?(t.charAt(t.length-1)==='.'?t.slice(0,-1):t+'.'):t})}
  function paint(){var cv=cvRef.current;if(!cv)return;var b=cv.getBoundingClientRect();if(!b.width)return;
    var dpr=window.devicePixelRatio||1,pw=Math.max(1,Math.round(b.width*dpr)),ph=Math.max(1,Math.round(b.height*dpr));
    if(cv.width!==pw)cv.width=pw;if(cv.height!==ph)cv.height=ph;
    var cs=getComputedStyle(cv),pr=prRef.current,tk=function(n){return parseCol(cs.getPropertyValue(n),pr)};
    var ctx=cv.getContext('2d');if(!ctx)return;ctx.setTransform(1,0,0,1,0,0);
    var cSurf=tk('--surface'),cIns=tk('--inset'),cInk=tk('--ink'),cMut=tk('--ink-muted'),cAcc=tk('--accent');
    ctx.fillStyle=hex(cSurf);ctx.fillRect(0,0,pw,Math.ceil(ph/2));
    ctx.fillStyle=hex(cIns);ctx.fillRect(0,Math.floor(ph/2),pw,ph-Math.floor(ph/2));
    /* wall shades: x-side walls from ink, y-side from ink-muted, each mixed toward inset in SHADES steps */
    var pal=[[],[]];for(var k=0;k<SHADES;k++){var t=k/SHADES;pal[0].push(hex(mix(cInk,cIns,t)));pal[1].push(hex(mix(cMut,cIns,t)))}
    var s=m.current,a=s.ang-Math.PI/2,dx=Math.cos(a),dy=Math.sin(a),plx=-dy*FOV,ply=dx*FOV,px=pos.x+0.5,py=pos.y+0.5;
    var col=Math.max(1,Math.round(dpr)),zb=[];
    for(var x=0;x<pw;x+=col){var cx=2*(x+col/2)/pw-1,r=cast(M,px,py,dx+plx*cx,dy+ply*cx),d=Math.max(0.05,r.d);
      zb.push(d);var lh=ph/d,top=Math.max(0,Math.round((ph-lh)/2)),bot=Math.min(ph,Math.round((ph+lh)/2));
      var sh=Math.min(SHADES-1,Math.floor(d/1.6));ctx.fillStyle=pal[r.side][sh];ctx.fillRect(x,top,col,bot-top)}
    /* target marker (round wheel): billboard at the target cell centre, clipped by the wall depth buffer */
    if(M.t&&!(M.t.x===pos.x&&M.t.y===pos.y)){var rx=M.t.x+0.5-px,ry=M.t.y+0.5-py,inv=1/(plx*dy-dx*ply),
        tx=inv*(dy*rx-dx*ry),ty=inv*(-ply*rx+plx*ry);
      if(ty>0.2){var sxp=(pw/2)*(1+tx/ty),size=(ph/ty)*0.42,cyp=ph/2+(ph/ty)*0.12;
        if(sxp+size>0&&sxp-size<pw){ctx.save();ctx.beginPath();var any=false;
          for(var i=0;i<zb.length;i++){if(zb[i]>ty){ctx.rect(i*col,0,col,ph);any=true}}
          if(any){ctx.clip();var lw=Math.max(1.5*dpr,size*0.09);
            ctx.fillStyle=hex(cInk);ctx.fillRect(sxp-lw/2,cyp,lw,(ph+ph/ty)/2-cyp);
            ctx.beginPath();ctx.arc(sxp,cyp,size/2,0,Math.PI*2);ctx.lineWidth=lw*2.6;ctx.strokeStyle=hex(cSurf);ctx.stroke();ctx.fillStyle=hex(cAcc);ctx.fill();
            ctx.lineWidth=lw;ctx.strokeStyle=hex(cInk);ctx.stroke();
            ctx.beginPath();for(var q=0;q<4;q++){var aa=q*Math.PI/4;ctx.moveTo(sxp-Math.cos(aa)*size/2,cyp-Math.sin(aa)*size/2);ctx.lineTo(sxp+Math.cos(aa)*size/2,cyp+Math.sin(aa)*size/2)}
            ctx.lineWidth=lw*0.7;ctx.stroke();
            ctx.beginPath();ctx.arc(sxp,cyp,size*0.12,0,Math.PI*2);ctx.fillStyle=hex(cInk);ctx.fill()}
          ctx.restore()}}}}
  var paintRef=R.useRef(paint);paintRef.current=paint;
  R.useEffect(function(){paint()});
  R.useEffect(function(){var go=function(){paintRef.current()},ro=null,mo=null,mq=null;
    if(window.ResizeObserver&&cvRef.current){ro=new ResizeObserver(go);ro.observe(cvRef.current)}
    if(window.MutationObserver){mo=new MutationObserver(go);mo.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['data-theme','class']})}
    try{mq=window.matchMedia('(prefers-color-scheme: dark)');mq.addEventListener('change',go)}catch(_){mq=null}
    window.addEventListener('resize',go);
    return function(){if(ro)ro.disconnect();if(mo)mo.disconnect();if(mq)try{mq.removeEventListener('change',go)}catch(_){}
      window.removeEventListener('resize',go);if(m.current.raf)cancelAnimationFrame(m.current.raf)}},[]);
  function animateTo(target){var s=m.current;s.to=target;if(s.raf){cancelAnimationFrame(s.raf);s.raf=0}
    if(reduced()){s.ang=target;return}
    s.from=s.ang;s.t0=0;
    var step=function(ts){if(!s.t0)s.t0=ts;var k=Math.min(1,(ts-s.t0)/TURN_MS),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      s.ang=s.from+(s.to-s.from)*e;paintRef.current();if(k<1)s.raf=requestAnimationFrame(step);else{s.ang=s.to;s.raf=0}};
    s.raf=requestAnimationFrame(step)}
  function turn(d){var hd=(pos.hd+d+4)%4,np={x:pos.x,y:pos.y,hd:hd};animateTo(m.current.to+d*Math.PI/2);st[1](np);
    say((d<0?'Turned left. ':'Turned right. ')+describe(M,np.x,np.y,hd,tl,true));
    if(p.onMove)p.onMove({x:np.x,y:np.y,heading:hd})}
  function stepF(){var nx=pos.x+DX[pos.hd],ny=pos.y+DY[pos.hd];
    if(wallAt(M,nx,ny)){say('Wall ahead');return}
    var np={x:nx,y:ny,hd:pos.hd};st[1](np);if(p.onMove)p.onMove({x:nx,y:ny,heading:pos.hd});
    if(M.t&&nx===M.t.x&&ny===M.t.y){say('You reached '+tl);if(p.onArrive)p.onArrive()}
    else say('Stepped forward. '+describe(M,nx,ny,pos.hd,tl,true))}
  function onKey(e){if(e.altKey||e.ctrlKey||e.metaKey)return;var k=e.key;
    if(k==='ArrowLeft'||k==='a'||k==='A'){e.preventDefault();turn(-1)}
    else if(k==='ArrowRight'||k==='d'||k==='D'){e.preventDefault();turn(1)}
    else if(k==='ArrowUp'||k==='w'||k==='W'){e.preventDefault();stepF()}}
  var desc=describe(M,pos.x,pos.y,pos.hd,tl),f=freeAhead(M,pos.x,pos.y,pos.hd);
  /* plan: walls ink-muted, floor inset, target accent with ink edge, player and facing ray accent-ink */
  var cells=[];for(var y=0;y<M.h;y++)for(var x=0;x<M.w;x++)if(M.g[y][x]==='#')cells.push(h('rect',{key:x+'_'+y,x:x,y:y,width:1.02,height:1.02,className:'cz-cvw-wall'}));
  var cxp=pos.x+0.5,cyp=pos.y+0.5,ex=cxp+DX[pos.hd]*(f+0.5),ey=cyp+DY[pos.hd]*(f+0.5);
  var plan=h('svg',{className:'cz-cvw-plan',viewBox:'0 0 '+M.w+' '+M.h,role:'img',
      'aria-label':'Plan, '+M.w+' by '+M.h+' cells. You are at column '+(pos.x+1)+', row '+(pos.y+1)+(M.t?'; '+tl+' at column '+(M.t.x+1)+', row '+(M.t.y+1):'')+'.'},
    h('rect',{x:0,y:0,width:M.w,height:M.h,className:'cz-cvw-floor'}),cells,
    M.t?h('circle',{cx:M.t.x+0.5,cy:M.t.y+0.5,r:0.34,className:'cz-cvw-tgt'}):null,
    h('line',{x1:cxp,y1:cyp,x2:ex,y2:ey,className:'cz-cvw-ray'}),
    h('g',{transform:'translate('+cxp+' '+cyp+') rotate('+(pos.hd*90)+')'},h('path',{d:'M0 -0.4 L0.32 0.3 L0 0.14 L-0.32 0.3 Z',className:'cz-cvw-me'})));
  function btn(text,glyph,fn){return h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-cvw-btn',onClick:fn},
    h('span',{className:'cz-cvw-g','aria-hidden':'true'},glyph),h('span',null,text))}
  return h('div',{className:'cz-cvw'},
    h('span',{id:lblId,className:'cz-cvw-lb'},p.label),
    h('div',{role:'group','aria-label':p.label,'aria-describedby':hintId,tabIndex:0,className:'cz-cvw-stage',onKeyDown:onKey},
      h('div',{className:'cz-cvw-pw',style:{width:Math.min(162,Math.max(M.w,M.h)*18)+'px'}},plan),
      h('div',{className:'cz-cvw-view'},h('canvas',{ref:cvRef,className:'cz-cvw-cv',role:'img','aria-label':desc}),
        h('span',{ref:prRef,className:'cz-cvw-probe','aria-hidden':'true'}))),
    h('div',{className:'cz-cvw-btns'},btn('Step forward','\u2191',stepF),btn('Turn left','\u21b6',function(){turn(-1)}),btn('Turn right','\u21b7',function(){turn(1)})),
    h('p',{className:'cz-cvw-status',role:'status','aria-live':'polite'},live[0]),
    h('p',{id:hintId,className:'cz-cvw-hint'},'Focus the view and use Arrow Left and Right (or A and D) to turn, Arrow Up (or W) to step.'))}
window.Componentia.CorridorView=CorridorView;})();

/* Componentia Volvelle — forge_20261109T1358Z. Credit: Idea: the volvelle (rotating paper wheel chart), a public-domain device; near-duplicates seen: Volvelleteer (kaleberg.com), 'polarity gate with volvelle' (Observable, universalcharacter), Color Helm (faculty.fairfield.edu/cstaecker) (licences not read, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
/* geometry in viewBox units (0 0 240 240): RO/RI outer ring edges, RK key label radius, RD inner disc, WY window centre radii along the pointer axis */
var C=120,RO=116,RI=84,RK=100,RD=80,WY=[52,28,4],WW=96,WH=20,SNAP_MS=220,cnt=0;
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function now(){return (window.performance&&performance.now)?performance.now():Date.now()}
function f1(n){return Math.round(n*10)/10}
function mod(a,m){return ((a%m)+m)%m}
function ease(t){return 1-Math.pow(1-t,3)}
function fit(text,avail,max,min){var n=String(text).length||1;return f1(Math.max(min,Math.min(max,avail/(n*0.66))))}
/* text that stays upright: flipped half a turn when its frame points into the lower half */
function upright(deg){var a=mod(deg,360);return a>90&&a<270}
function resolve(v,items){var n=items.length;if(typeof v==='number'&&isFinite(v))return Math.max(0,Math.min(n-1,Math.round(v)));
  if(typeof v==='string')for(var i=0;i<n;i++)if(items[i].key===v)return i;return -1}
function Volvelle(p){
  var items=(p.items||[]).slice(0,12).map(function(it){return {key:String(it&&it.key!=null?it.key:''),values:(it&&it.values)||[]}});
  if(!items.length)items=[{key:'—',values:[]}];
  var n=items.length,step=360/n,wins=(p.windows||[]).map(String),drawn=wins.slice(0,3);
  var ctl=p.value!==undefined&&p.value!==null;
  var st=S(function(){var d=resolve(p.defaultValue,items);return d<0?0:d});
  var cur=ctl?resolve(p.value,items):st[0];if(cur<0)cur=0;
  var uid=R.useId?R.useId():'',idr=R.useRef(null);
  if(!idr.current)idr.current='cz-vv-'+(uid?uid.replace(/[^a-zA-Z0-9_-]/g,''):'n'+(++cnt));
  var lblId=idr.current+'-l',hintId=idr.current+'-h';
  var live=S(''),fr=S(0),m=R.useRef(null),wheelRef=R.useRef(null),curRef=R.useRef(cur);curRef.current=cur;
  if(!m.current)m.current={rot:cur*step,drag:null,last:null,moved:0,raf:0,a0:0,a1:0,t0:0};
  function draw(){fr[1](function(k){return k+1})}
  function stop(s){if(s.raf){cancelAnimationFrame(s.raf);s.raf=0}}
  R.useEffect(function(){return function(){stop(m.current)}},[]);
  function idxOf(rot){return mod(Math.round(rot/step),n)}
  function near(i,rot){var b=i*step;return b+360*Math.round((rot-b)/360)}
  function tick(t){var s=m.current,k=Math.min(1,(t-s.t0)/SNAP_MS);s.rot=s.a0+(s.a1-s.a0)*ease(k);
    if(k>=1){s.rot=s.a1;s.raf=0;draw();return}draw();s.raf=requestAnimationFrame(tick)}
  function animateTo(i){var s=m.current,tg=near(i,s.rot);stop(s);
    if(reduced()||Math.abs(tg-s.rot)<0.05){s.rot=tg;draw();return}
    s.a0=s.rot;s.a1=tg;s.t0=now();s.raf=requestAnimationFrame(tick)}
  /* keep the disc on the current key when idle (controlled value changes, rejected changes, odd angles) */
  R.useEffect(function(){var s=m.current;if(s.drag||s.raf)return;
    if(idxOf(s.rot)!==cur||Math.abs(near(cur,s.rot)-s.rot)>0.05)animateTo(cur)});
  function text(i){var it=items[i],parts=[];
    for(var j=0;j<wins.length;j++)parts.push(wins[j]+' '+(it.values[j]!=null?it.values[j]:'—'));
    return it.key+(parts.length?': '+parts.join(', '):'')}
  function choose(i){i=mod(i,n);if(i!==curRef.current){curRef.current=i;if(!ctl)st[1](i);live[1](text(i));
      if(p.onChange)p.onChange({key:items[i].key,values:items[i].values.slice()},i)}
    animateTo(i)}
  function key(e){var k=e.key,c=curRef.current,t=null;
    if(k==='ArrowRight'||k==='ArrowUp')t=c+1;else if(k==='ArrowLeft'||k==='ArrowDown')t=c-1;
    else if(k==='Home')t=0;else if(k==='End')t=n-1;else if(k==='PageUp')t=c+3;else if(k==='PageDown')t=c-3;
    if(t===null)return;e.preventDefault();choose(t)}
  function geo(e){var el=wheelRef.current;if(!el)return null;var b=el.getBoundingClientRect();if(!b.width)return null;
    var x=e.clientX-(b.left+b.width/2),y=e.clientY-(b.top+b.height/2);
    return {r:Math.sqrt(x*x+y*y)*240/b.width,a:Math.atan2(x,-y)*180/Math.PI}}
  function down(e){if(e.button!=null&&e.button>0)return;var g=geo(e);if(!g||g.r>RO+2)return;e.preventDefault();
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    try{e.currentTarget.focus({preventScroll:true})}catch(_){}
    var s=m.current;stop(s);s.drag=g.r<=RD+2?'disc':'ring';s.last=g.a;s.moved=0}
  function move(e){var s=m.current;if(s.drag!=='disc')return;var g=geo(e);if(!g||g.r<6)return;
    if(s.last==null){s.last=g.a;return}
    var d=g.a-s.last;if(d>180)d-=360;if(d<-180)d+=360;s.last=g.a;s.rot+=d;s.moved+=Math.abs(d);draw()}
  function up(e){var s=m.current,kind=s.drag;if(!kind)return;s.drag=null;
    if(kind==='ring'){var g=e&&e.clientX!=null?geo(e):null;if(g&&g.r>RI-4&&g.r<=RO+2){choose(mod(Math.round(g.a/step),n));return}
      animateTo(curRef.current);return}
    choose(idxOf(s.rot))}
  var s=m.current,rot=s.rot,vis=idxOf(rot),it=items[cur];
  var ring=[];
  for(var i=0;i<n;i++){var a=i*step,on=i===vis,lx=C,ly=C-RK,fs=fit(items[i].key,2*Math.PI*RK/n-8,11,7);
    var tr='rotate('+f1(a)+' '+C+' '+C+')'+(upright(a)?' rotate(180 '+lx+' '+ly+')':'');
    if(on){var hw=Math.min(2*Math.PI*RK/n-4,items[i].key.length*fs*0.6+10)/2;
      ring.push(h('rect',{key:'m'+i,className:'cz-vv-mark',x:f1(lx-hw),y:ly-8,width:f1(hw*2),height:16,rx:3,transform:'rotate('+f1(a)+' '+C+' '+C+')'}))}
    ring.push(h('line',{key:'t'+i,className:'cz-vv-tick',x1:C,y1:C-RO,x2:C,y2:C-RO+6,transform:'rotate('+f1(a)+' '+C+' '+C+')'}));
    ring.push(h('text',{key:'k'+i,className:'cz-vv-k'+(on?' cz-vv-kon':''),x:lx,y:ly,textAnchor:'middle',dominantBaseline:'central',transform:tr,style:{fontSize:fs+'px'}},items[i].key))}
  var flip=upright(rot),vit=items[vis],wv=[];
  for(var j=0;j<drawn.length;j++){var cy=C-WY[j],val=vit.values[j]!=null?String(vit.values[j]):'—',str=drawn[j]+' '+val;
    wv.push(h('g',{key:'w'+j},
      h('rect',{className:'cz-vv-win',x:C-WW/2,y:cy-WH/2,width:WW,height:WH,rx:4}),
      h('text',{className:'cz-vv-wt',x:C,y:cy,textAnchor:'middle',dominantBaseline:'central',transform:flip?'rotate(180 '+C+' '+cy+')':undefined,style:{fontSize:fit(str,WW-10,11,6)+'px'}},str)))}
  var rows=wins.map(function(w,j){return h('div',{key:j,className:'cz-vv-row'},h('dt',null,w),h('dd',null,it.values[j]!=null?String(it.values[j]):'—'))});
  return h('div',{className:'cz-vv'},
    h('span',{id:lblId,className:'cz-vv-lb'},p.label),
    h('div',{className:'cz-vv-body'},
      h('div',{ref:wheelRef,role:'slider',tabIndex:0,className:'cz-vv-wheel','aria-labelledby':lblId,'aria-describedby':hintId,
        'aria-valuemin':0,'aria-valuemax':n-1,'aria-valuenow':cur,'aria-valuetext':text(cur),
        onKeyDown:key,onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:function(){var q=m.current;if(q.drag){q.drag=null;animateTo(curRef.current)}},
        onLostPointerCapture:function(){var q=m.current;if(q.drag==='disc'){q.drag=null;choose(idxOf(q.rot))}else if(q.drag){q.drag=null;animateTo(curRef.current)}}},
        h('svg',{className:'cz-vv-svg',viewBox:'0 0 240 240','aria-hidden':'true',focusable:'false'},
          h('circle',{className:'cz-vv-ring',cx:C,cy:C,r:(RO+RI)/2,strokeWidth:RO-RI}),
          h('circle',{className:'cz-vv-edge',cx:C,cy:C,r:RO}),
          h('circle',{className:'cz-vv-edge',cx:C,cy:C,r:RI}),
          ring,
          h('g',{transform:'rotate('+f1(rot)+' '+C+' '+C+')'},
            h('circle',{className:'cz-vv-disc',cx:C,cy:C,r:RD}),
            h('circle',{className:'cz-vv-hub',cx:C,cy:C,r:4}),
            wv,
            h('path',{className:'cz-vv-ptr',d:'M'+(C-7)+' '+(C-RD+12)+' L'+(C+7)+' '+(C-RD+12)+' L'+C+' '+(C-RI-6)+' Z'})))),
      h('div',{className:'cz-vv-out'},
        h('p',{className:'cz-vv-key'},it.key),
        rows.length?h('dl',{className:'cz-vv-vals'},rows):null)),
    h('div',{className:'cz-vv-btns'},
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-vv-btn',onClick:function(){choose(curRef.current-1)}},'Turn left'),
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-vv-btn',onClick:function(){choose(curRef.current+1)}},'Turn right')),
    h('p',{id:hintId,className:'cz-vv-hint'},p.hint||'Drag the inner disc or tap a key, or use the arrow keys, Home and End.'),
    h('span',{className:'cz-vv-sr','aria-live':'polite'},live[0]))}
window.Componentia.Volvelle=Volvelle;})();

/* Componentia TriBlend — forge_20261109T1358Z. Credit: Idea: the ternary plot (barycentric triangle), a public-domain chart form; near-duplicates seen: tri-slider (npm), '3 filtres pour les données des MOOC v3' (Observable, maliky), Observable notebook d/e10108a47bd7b610 (licences not read, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
/* triangle geometry in viewBox units (0 0 300 268): corner 0 top, 1 bottom-left, 2 bottom-right; EASE_MS: keyed move */
var P=[[150,30],[30,237.85],[270,237.85]],EASE_MS=180,PR=13,cnt=0;
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
/* split total into whole units of size u, in proportion to w (largest remainder); equal weights when all are 0 */
function apportion(w,total,u){var n=w.length,sw=0,i;for(i=0;i<n;i++)sw+=Math.max(0,w[i]);
  var units=Math.round(total/u),raw=[],out=[],used=0;
  for(i=0;i<n;i++){var r=sw>0?Math.max(0,w[i])/sw*units:units/n;raw.push(r);out.push(Math.floor(r));used+=Math.floor(r)}
  var ord=raw.map(function(r,j){return j}).sort(function(x,y){return (raw[y]-Math.floor(raw[y]))-(raw[x]-Math.floor(raw[x]))||x-y});
  for(i=0;used<units&&i<ord.length;i++){if(sw>0&&raw[ord[i]]===0)continue;out[ord[i]]++;used++}
  for(i=0;used<units;i=(i+1)%n){out[i]++;used++}
  var res=out.map(function(k){return k*u}),s=0;for(i=0;i<n;i++)s+=res[i];
  /* step that does not divide the total: the largest share absorbs the remainder */
  if(s!==total){var big=0;for(i=1;i<n;i++)if(res[i]>res[big])big=i;res[big]+=total-s}
  return res}
/* any 3 non-negative numbers -> whole percentages summing to 100 */
function normalise(v){var a=[0,1,2].map(function(i){var x=v&&+v[i];return isFinite(x)&&x>0?x:0});
  if(a[0]+a[1]+a[2]<=0)return [34,33,33];return apportion(a,100,1)}
function same(a,b){return a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2]}
function toXY(v){return [(v[0]*P[0][0]+v[1]*P[1][0]+v[2]*P[2][0])/100,(v[0]*P[0][1]+v[1]*P[1][1]+v[2]*P[2][1])/100]}
function bary(x,y){var A=P[0],B=P[1],C=P[2],d=(B[1]-C[1])*(A[0]-C[0])+(C[0]-B[0])*(A[1]-C[1]);
  var l0=((B[1]-C[1])*(x-C[0])+(C[0]-B[0])*(y-C[1]))/d,l1=((C[1]-A[1])*(x-C[0])+(A[0]-C[0])*(y-C[1]))/d;return [l0,l1,1-l0-l1]}
function nearSeg(x,y,a,b){var dx=b[0]-a[0],dy=b[1]-a[1],t=((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy);t=Math.max(0,Math.min(1,t));return [a[0]+t*dx,a[1]+t*dy]}
/* clamp a point to the triangle: nearest point on the closest edge when outside */
function clampXY(x,y){var l=bary(x,y);if(l[0]>=0&&l[1]>=0&&l[2]>=0)return [x,y];var best=null,bd=1e30;
  for(var i=0;i<3;i++){var q=nearSeg(x,y,P[i],P[(i+1)%3]),dd=(q[0]-x)*(q[0]-x)+(q[1]-y)*(q[1]-y);if(dd<bd){bd=dd;best=q}}return best}
/* foot of the perpendicular from (x,y) to the edge opposite corner i */
function foot(x,y,i){return nearSeg(x,y,P[(i+1)%3],P[(i+2)%3])}
function r2(n){return Math.round(n*100)/100}
/* set share i to t (snapped to step); the other two absorb the difference in proportion to their current shares */
function setShare(v,i,t,step){t=Math.max(0,Math.min(100,Math.round(t/step)*step));if(t===v[i])return v;
  var o=[(i+1)%3,(i+2)%3],rest=100-t,w=[v[o[0]],v[o[1]]],nv=[0,0,0];
  /* weights are the current shares, so a share at 0 gives nothing when raising */
  var sp=apportion(w,rest,step);nv[i]=t;nv[o[0]]=sp[0];nv[o[1]]=sp[1];return nv}
function TriBlend(p){
  var parts=(p.parts&&p.parts.length===3?p.parts:['Part 1','Part 2','Part 3']).map(String);
  var step=p.step>0&&p.step<=50?+p.step:5,ctl=p.value!=null;
  var st=S(function(){return normalise(p.defaultValue||[34,33,33])});
  var val=ctl?normalise(p.value):st[0];
  var uid=R.useId?R.useId():'',idr=R.useRef(null);
  if(!idr.current)idr.current='cz-tb-'+(uid?uid.replace(/[^a-zA-Z0-9_-]/g,''):'n'+(++cnt));
  var lblId=idr.current+'-l',hintId=idr.current+'-h';
  var live=S(''),fr=S(0),svgRef=R.useRef(null),valRef=R.useRef(val);valRef.current=val;
  var m=R.useRef(null);if(!m.current){var q0=toXY(val);m.current={x:q0[0],y:q0[1],raf:0,how:'',drag:false}}
  function draw(){fr[1](function(n){return n+1})}
  function stop(){var s=m.current;if(s.raf){cancelAnimationFrame(s.raf);s.raf=0}}
  R.useEffect(function(){return stop},[]);
  /* move the puck to the value: eased only after a key, never under reduced motion; a drag shows the pointer instead */
  R.useEffect(function(){var s=m.current,how=s.how;s.how='';if(s.drag)return;var to=toXY(val);stop();
    if(how!=='key'||reduced()){if(s.x!==to[0]||s.y!==to[1]){s.x=to[0];s.y=to[1];draw()}return}
    var fx=s.x,fy=s.y,t0=0;
    function step(ts){if(!t0)t0=ts;var k=Math.min(1,(ts-t0)/EASE_MS),e=1-Math.pow(1-k,3);s.x=fx+(to[0]-fx)*e;s.y=fy+(to[1]-fy)*e;draw();
      if(k<1)s.raf=requestAnimationFrame(step);else{s.x=to[0];s.y=to[1];s.raf=0}}
    s.raf=requestAnimationFrame(step)},[val[0],val[1],val[2]]);
  function sayFor(v){return parts.map(function(n,i){return n+' '+v[i]+'%'}).join(', ')}
  function commit(nv,how,say){var o=valRef.current;m.current.how=how;
    if(!same(nv,o)){valRef.current=nv;if(!ctl)st[1](nv);if(p.onChange)p.onChange(nv.slice())}
    if(say)live[1](sayFor(nv))}
  function pt(e){var el=svgRef.current,mx=el&&el.getScreenCTM();if(!mx)return toXY(valRef.current);var q=el.createSVGPoint();q.x=e.clientX;q.y=e.clientY;q=q.matrixTransform(mx.inverse());return [q.x,q.y]}
  function fromPointer(e){var q=pt(e),c=clampXY(q[0],q[1]),l=bary(c[0],c[1]);
    var s=m.current;s.x=c[0];s.y=c[1];commit(apportion([l[0],l[1],l[2]].map(function(x){return Math.max(0,x)}),100,step),'drag',false);draw()}
  function down(e){if(e.button!=null&&e.button>0)return;e.preventDefault();try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
    stop();m.current.drag=true;fromPointer(e)}
  function move(e){if(!m.current.drag)return;fromPointer(e)}
  function up(){var s=m.current;if(!s.drag)return;s.drag=false;var v=valRef.current,to=toXY(v);s.x=to[0];s.y=to[1];live[1](sayFor(v));draw()}
  function keyFor(i){return function(e){var k=e.key,v=valRef.current,t=null;
    if(k==='ArrowUp'||k==='ArrowRight')t=v[i]+step;else if(k==='ArrowDown'||k==='ArrowLeft')t=v[i]-step;
    else if(k==='PageUp')t=v[i]+2*step;else if(k==='PageDown')t=v[i]-2*step;else if(k==='Home')t=0;else if(k==='End')t=100;
    if(t==null)return;e.preventDefault();commit(setShare(v,i,t,step),'key',true)}}
  function reset(){commit(normalise([1,1,1]),'reset',true)}
  var s=m.current,grid=[],guides=[],labels=[];
  for(var g=20;g<100;g+=20)for(var i=0;i<3;i++){var u=[0,0,0],w=[0,0,0];u[i]=g;u[(i+1)%3]=100-g;w[i]=g;w[(i+2)%3]=100-g;
    var a=toXY(u),b=toXY(w);grid.push(h('line',{key:'g'+i+'_'+g,className:'cz-tb-grid',x1:r2(a[0]),y1:r2(a[1]),x2:r2(b[0]),y2:r2(b[1])}))}
  for(var j=0;j<3;j++){var f=foot(s.x,s.y,j);guides.push(h('line',{key:'d'+j,className:'cz-tb-guide',x1:r2(s.x),y1:r2(s.y),x2:r2(f[0]),y2:r2(f[1])}))}
  labels.push(h('text',{key:'l0',className:'cz-tb-cn',x:150,y:18,textAnchor:'middle'},parts[0]));
  labels.push(h('text',{key:'l1',className:'cz-tb-cn',x:22,y:260,textAnchor:'start'},parts[1]));
  labels.push(h('text',{key:'l2',className:'cz-tb-cn',x:278,y:260,textAnchor:'end'},parts[2]));
  var tri=P.map(function(q){return q[0]+','+q[1]}).join(' ');
  function slider(i){return h('div',{key:i,className:'cz-tb-ax',role:'slider',tabIndex:0,'aria-label':parts[i],
      'aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':val[i],'aria-valuetext':parts[i]+' '+val[i]+'%',
      'aria-describedby':hintId,onKeyDown:keyFor(i)},
    h('span',{className:'cz-tb-axn'},parts[i]),h('span',{className:'cz-tb-axv'},val[i]+'%'))}
  return h('div',{className:'cz-tb',role:'group','aria-labelledby':lblId},
    h('span',{id:lblId,className:'cz-tb-lb'},p.label),
    h('svg',{ref:svgRef,className:'cz-tb-svg'+(s.drag?' cz-tb-drag':''),viewBox:'0 0 300 268','aria-hidden':'true',focusable:'false',
        onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up,onLostPointerCapture:up},
      h('polygon',{className:'cz-tb-face',points:tri}),grid,
      h('polygon',{className:'cz-tb-edge',points:tri}),guides,
      h('circle',{className:'cz-tb-ring',cx:r2(s.x),cy:r2(s.y),r:PR}),
      h('circle',{className:'cz-tb-puck',cx:r2(s.x),cy:r2(s.y),r:PR-5}),labels),
    h('div',{className:'cz-tb-axes'},slider(0),slider(1),slider(2)),
    h('div',{className:'cz-tb-row'},h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-tb-b',onClick:reset},'Reset')),
    h('p',{id:hintId,className:'cz-tb-hint'},'Drag the puck, or focus a share and use the arrow keys. The other two shares make up the rest.'),
    h('span',{className:'cz-tb-sr','aria-live':'polite'},live[0]))}
window.Componentia.TriBlend=TriBlend;})();

/* Componentia StripChart — forge_20261109T1358Z. Credit: Idea: the pen strip-chart recorder (seismograph, chart recorder), a public-domain instrument; near-duplicates seen: SVG Trace Scroller (morphfx.co.uk), LightningChart strip chart, 'Strip Charts' (Bootsnipp), @crisislab/timeline (npm/JSR), Dewesoft recorder view, seisplotjs realtime tutorial (licences not read, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
/* SUMMARY_MS: minimum gap between canvas aria-label updates; PADL/PADR/PADT/PADB: plot margins in CSS px (PADR leaves room for the pen); GRID: samples between vertical grid rules */
var SUMMARY_MS=5000,PADL=6,PADR=16,PADT=10,PADB=10,GRID=10,cnt=0;
var WORD={ok:'In range',warn:'High',crit:'Over limit'};
function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
function now(){return (window.performance&&performance.now)?performance.now():Date.now()}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function num(v){v=+v;return isFinite(v)?v:null}
function StripChart(p){
  var label=p.label||'Reading',unit=p.unit||'',dec=p.decimals!=null?Math.max(0,Math.min(6,p.decimals|0)):1;
  var win=Math.max(2,(p.window|0)||60),cap=Math.max(win,(p.cap|0)||500),ivl=Math.max(50,(p.interval|0)||1000);
  var th=p.thresholds||{},warnL=num(th.warn),critL=num(th.crit),hasTh=warnL!=null||critL!=null;
  var ctl=p.paused!=null,ps=S(!!p.defaultPaused),paused=ctl?!!p.paused:ps[0];
  var uid=R.useId?R.useId():'',idr=R.useRef(null);
  if(!idr.current)idr.current='cz-strip-'+(uid?uid.replace(/[^a-zA-Z0-9_-]/g,''):'n'+(++cnt));
  var lblId=idr.current+'-l',hintId=idr.current+'-h';
  var m=R.useRef(null),cvRef=R.useRef(null),feedRef=R.useRef(p.feed);feedRef.current=p.feed;
  var fr=S(0),live=S('');
  function fmt(v){return v==null?'—':(v.toFixed(dec)+(unit?' '+unit:''))}
  function level(v){if(v==null)return null;if(critL!=null&&v>critL)return 'crit';if(warnL!=null&&v>warnL)return 'warn';return 'ok'}
  if(!m.current){var vals=(p.defaultValues||[]).map(num).filter(function(v){return v!=null});if(vals.length>cap)vals=vals.slice(vals.length-cap);
    m.current={vals:vals,gone:0,off:0,t:1,t0:0,raf:0,drag:null,sumAt:-1e9,sumTimer:0,lastLv:null};
    m.current.off=clamp((p.defaultScrub|0)||0,0,Math.max(0,vals.length-1));
    m.current.lastLv=hasTh&&vals.length?level(vals[vals.length-1]):null}
  var s=m.current;
  function rerender(){fr[1](function(n){return n+1})}
  function summary(){var V=s.vals,n=V.length;if(!n)return label+': no readings yet';
    var k=Math.min(win,n),lo=Infinity,hi=-Infinity;for(var i=n-k;i<n;i++){if(V[i]<lo)lo=V[i];if(V[i]>hi)hi=V[i]}
    return label+': latest '+fmt(V[n-1])+', range '+lo.toFixed(dec)+'–'+hi.toFixed(dec)+(unit?' '+unit:'')+' over '+k+(k===1?' sample':' samples')}
  var sum=S(function(){s.sumAt=now();return summary()});
  function bumpSummary(){var t=now();if(t-s.sumAt>=SUMMARY_MS){s.sumAt=t;sum[1](summary());return}
    if(!s.sumTimer)s.sumTimer=setTimeout(function(){s.sumTimer=0;s.sumAt=now();sum[1](summary())},Math.max(0,SUMMARY_MS-(t-s.sumAt)))}
  function yRange(){var lo=num(p.min),hi=num(p.max);
    if(lo==null||hi==null){var V=s.vals,a=Infinity,b=-Infinity;for(var i=0;i<V.length;i++){if(V[i]<a)a=V[i];if(V[i]>b)b=V[i]}
      if(warnL!=null){a=Math.min(a,warnL);b=Math.max(b,warnL)}if(critL!=null){a=Math.min(a,critL);b=Math.max(b,critL)}
      if(!isFinite(a)){a=0;b=1}var pad=(b-a)*0.1||Math.abs(a)*0.1||1;if(lo==null)lo=a-pad;if(hi==null)hi=b+pad}
    if(hi<=lo)hi=lo+1;return [lo,hi]}
  function paint(){var cv=cvRef.current;if(!cv)return;var b=cv.getBoundingClientRect();if(!b.width||!b.height)return;
    var dpr=window.devicePixelRatio||1,pw=Math.max(1,Math.round(b.width*dpr)),ph=Math.max(1,Math.round(b.height*dpr));
    if(cv.width!==pw)cv.width=pw;if(cv.height!==ph)cv.height=ph;
    var ctx=cv.getContext('2d');if(!ctx)return;
    var cs=getComputedStyle(cv),tk=function(n){return cs.getPropertyValue(n).trim()};
    var W=b.width,H=b.height,penX=W-PADR,dx=(penX-PADL)/(win-1),yr=yRange(),plotH=H-PADT-PADB;
    function Y(v){return PADT+(1-(v-yr[0])/(yr[1]-yr[0]))*plotH}
    var mono=tk('--cz-fm')||'monospace';
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.setLineDash([]);
    ctx.fillStyle=tk('--inset');ctx.fillRect(0,0,W,H);
    var V=s.vals,n=V.length,e=n-1-s.off,shift=(s.off===0&&s.t<1)?(1-s.t)*dx:0;
    function X(i){return penX-(e-i)*dx+shift}
    /* decorative grid: rules that ride on the paper every GRID samples, plus four horizontal divisions */
    ctx.strokeStyle=tk('--line');ctx.lineWidth=1;ctx.beginPath();
    for(var g=1;g<4;g++){var gy=Math.round(PADT+plotH*g/4)+0.5;ctx.moveTo(0,gy);ctx.lineTo(penX,gy)}
    var first=Math.max(0,e-win-1);
    for(var i=Math.max(0,first-GRID);i<=e+1;i++){if((i+s.gone)%GRID!==0)continue;var gx=Math.round(X(i))+0.5;if(gx<0||gx>penX)continue;ctx.moveTo(gx,0);ctx.lineTo(gx,H)}
    ctx.stroke();
    /* threshold rules: warn long dash, crit short dash */
    function rule(v,tok,dash){if(v==null||v<yr[0]||v>yr[1])return;var y=Math.round(Y(v))+0.5;ctx.strokeStyle=tk(tok);ctx.lineWidth=1.5;ctx.setLineDash(dash);
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(penX,y);ctx.stroke();ctx.setLineDash([])}
    rule(warnL,'--warn',[7,4]);rule(critL,'--crit',[2,3]);
    /* trace */
    if(n){ctx.save();ctx.beginPath();ctx.rect(0,0,penX,H);ctx.clip();
      ctx.strokeStyle=tk('--ink');ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
      for(var k=first;k<=e;k++){var px=X(k),py=Y(clamp(V[k],yr[0],yr[1]));if(k===first)ctx.moveTo(px,py);else ctx.lineTo(px,py)}
      if(e===first){ctx.moveTo(X(e)-0.5,Y(V[e]));ctx.lineTo(X(e),Y(V[e]))}
      ctx.stroke();ctx.restore()}
    /* pen carriage and tip */
    ctx.strokeStyle=tk('--ink-muted');ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(Math.round(penX)+0.5,0);ctx.lineTo(Math.round(penX)+0.5,H);ctx.stroke();
    if(n){var pv=V[e];if(shift&&e>0)pv=V[e-1]+(V[e]-V[e-1])*s.t;var py2=Y(clamp(pv,yr[0],yr[1]));
      ctx.beginPath();ctx.arc(penX,py2,4.5,0,Math.PI*2);ctx.fillStyle=tk('--accent-ink');ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle=tk('--ink');ctx.stroke()}
    /* labels in ink-muted on an inset chip, drawn last so the trace never hides them */
    ctx.font='600 11px '+mono;ctx.textBaseline='middle';
    function tag(text,x,y){var w=ctx.measureText(text).width;y=clamp(y,8,H-8);ctx.fillStyle=tk('--inset');ctx.fillRect(x-2,y-7,w+4,14);ctx.fillStyle=tk('--ink-muted');ctx.fillText(text,x,y)}
    tag(yr[1].toFixed(dec),PADL,PADT);tag(yr[0].toFixed(dec),PADL,H-PADB);
    var lx=Math.min(PADL+56,Math.max(PADL,penX-120));
    if(warnL!=null&&warnL>=yr[0]&&warnL<=yr[1]){var near=critL!=null&&critL>=yr[0]&&critL<=yr[1]&&Math.abs(Y(warnL)-Y(critL))<18;tag(WORD.warn+' '+warnL.toFixed(dec),lx,Y(warnL)+(near?9:-8))}
    if(critL!=null&&critL>=yr[0]&&critL<=yr[1])tag(WORD.crit+' '+critL.toFixed(dec),lx,Y(critL)-8)}
  var paintRef=R.useRef(paint);paintRef.current=paint;
  function stopLoop(){if(s.raf){cancelAnimationFrame(s.raf);s.raf=0}}
  function loop(){s.raf=0;if(reduced()||paused||s.off>0){s.t=1;paintRef.current();return}
    s.t=clamp((now()-s.t0)/Math.min(ivl,1000),0,1);paintRef.current();if(s.t<1)s.raf=requestAnimationFrame(loop)}
  function add(v){v=num(v);if(v==null)return;s.vals.push(v);if(s.vals.length>cap){s.vals.splice(0,s.vals.length-cap);s.gone+=1}
    if(s.off>0)s.off=Math.min(s.off+1,s.vals.length-1);
    s.t0=now();stopLoop();
    if(reduced()||s.off>0)s.t=1;else{s.t=0;s.raf=requestAnimationFrame(loop)}
    if(hasTh){var lv=level(v);if(s.lastLv!=null&&lv!==s.lastLv){var msg=label+': '+WORD[lv]+', '+fmt(v);live[1](function(o){return o===msg?msg+'.':msg})}s.lastLv=lv}
    bumpSummary();rerender()}
  var addRef=R.useRef(add);addRef.current=add;
  var hasFeed=typeof p.feed==='function';
  R.useEffect(function(){if(paused||!hasFeed)return;var id=setInterval(function(){var f=feedRef.current;if(typeof f!=='function')return;var v;try{v=f()}catch(_){return}addRef.current(v)},ivl);
    return function(){clearInterval(id)}},[paused,hasFeed,ivl]);
  R.useEffect(function(){if(paused){stopLoop();s.t=1}});
  R.useEffect(function(){if(!s.raf)paint()});
  R.useEffect(function(){var go=function(){paintRef.current()},ro=null,mo=null,mq=null;
    if(window.ResizeObserver&&cvRef.current){ro=new ResizeObserver(go);ro.observe(cvRef.current)}
    if(window.MutationObserver){mo=new MutationObserver(go);mo.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['data-theme','class']})}
    try{mq=window.matchMedia('(prefers-color-scheme: dark)');mq.addEventListener('change',go)}catch(_){mq=null}
    window.addEventListener('resize',go);
    return function(){if(ro)ro.disconnect();if(mo)mo.disconnect();if(mq)try{mq.removeEventListener('change',go)}catch(_){}window.removeEventListener('resize',go);
      if(s.raf)cancelAnimationFrame(s.raf);s.raf=0;if(s.sumTimer)clearTimeout(s.sumTimer);s.sumTimer=0}},[]);
  function setPaused(v){if(!ctl)ps[1](v);if(p.onPausedChange)p.onPausedChange(v)}
  function setOff(o){var n=s.vals.length;o=clamp(Math.round(o),0,Math.max(0,n-1));if(o===s.off)return;s.off=o;stopLoop();s.t=1;rerender();
    if(p.onScrub&&n)p.onScrub(o,s.vals[n-1-o])}
  function onKey(e){var k=e.key,o=s.off,n=s.vals.length,d=null;
    if(k==='ArrowLeft'||k==='ArrowDown')d=o+1;else if(k==='ArrowRight'||k==='ArrowUp')d=o-1;
    else if(k==='PageDown')d=o+10;else if(k==='PageUp')d=o-10;else if(k==='Home')d=n-1;else if(k==='End')d=0;
    if(d==null)return;e.preventDefault();setOff(d)}
  function pxPerSample(el){var w=el.getBoundingClientRect().width;return Math.max(1,(w-PADR-PADL)/(win-1))}
  function down(e){if(e.button!=null&&e.button>0)return;var el=e.currentTarget;try{el.setPointerCapture(e.pointerId)}catch(_){}try{el.focus({preventScroll:true})}catch(_){}
    s.drag={x:e.clientX,o:s.off,dx:pxPerSample(el)};el.classList.add('cz-strip-grab')}
  function move(e){var d=s.drag;if(!d)return;e.preventDefault();setOff(d.o+(e.clientX-d.x)/d.dx)}
  function up(e){s.drag=null;if(e&&e.currentTarget)e.currentTarget.classList.remove('cz-strip-grab')}
  function goLive(){setOff(0);if(paused)setPaused(false)}
  var V=s.vals,n=V.length,off=s.off,cur=n?V[n-1-off]:null;
  var mode=off>0?'Scrubbing':(paused?'Paused':'Live'),lv=hasTh?level(cur):null;
  var ago=off===1?'1 sample ago':off+' samples ago';
  var vtext=!n?'No readings yet':(off>0?ago+': '+fmt(cur):(paused?'Paused, latest: ':'Live: ')+fmt(cur));
  var isLive=off===0&&!paused;
  function mark(l){var c='cz-strip-mk cz-strip-mk-'+l;
    return h('svg',{className:c,viewBox:'0 0 16 16','aria-hidden':'true',focusable:'false'},
      l==='ok'?h('circle',{cx:8,cy:8,r:6.5}):l==='warn'?h('path',{d:'M8 0.8 15.2 8 8 15.2 0.8 8Z'}):h('rect',{x:1.5,y:1.5,width:13,height:13}))}
  return h('div',{className:'cz-strip cz-strip-'+mode.toLowerCase(),role:'group','aria-labelledby':lblId},
    h('span',{id:lblId,className:'cz-strip-lb'},label),
    h('div',{className:'cz-strip-paper'},
      h('canvas',{ref:cvRef,className:'cz-strip-cv',role:'img','aria-label':sum[0]}),
      h('div',{className:'cz-strip-scrub',role:'slider',tabIndex:0,'aria-label':label+' history','aria-describedby':hintId,
        'aria-orientation':'horizontal','aria-valuemin':0,'aria-valuemax':Math.max(0,n-1),'aria-valuenow':Math.max(0,n-1-off),'aria-valuetext':vtext,
        onKeyDown:onKey,onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up,onLostPointerCapture:up})),
    h('div',{className:'cz-strip-read'},
      h('span',{className:'cz-strip-val'},fmt(cur)),
      h('span',{className:'cz-strip-mode'},mode+(off>0?' · '+ago:'')),
      lv?h('span',{className:'cz-strip-th cz-strip-th-'+lv},mark(lv),h('span',null,WORD[lv])):null),
    h('div',{className:'cz-strip-btns'},
      hasFeed?h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-strip-btn','aria-pressed':paused?'true':'false',onClick:function(){setPaused(!paused)}},paused?'Resume':'Pause'):null,
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-strip-btn','aria-disabled':isLive?'true':'false',onClick:function(){if(!isLive)goLive()}},'Go live')),
    h('p',{id:hintId,className:'cz-strip-hint'},'Drag the paper or use the arrow keys to look back. End returns to the latest reading.'),
    h('span',{className:'cz-strip-sr','aria-live':'polite'},live[0]))}
window.Componentia.StripChart=StripChart;})();

/* Componentia Abacus — forge_20261109T1358Z. Credit: Idea: the soroban (Japanese abacus), a public-domain counting tool; near-duplicates seen: Abacus Simulator by resant18 (GitHub), java abacus (ux1.eiu.edu, cemattingly), Online Abacus Calculator (us5-bow.pages.dev), Abacus by Walter Fendt (walter-fendt.de), fail_abacus_2.py (inventwithpython) (licences not read, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
/* Rod geometry in SVG user units: bead height BH, travel gap GAP, bar top BAR_Y and height BAR_H */
var VW=40,BH=18,GAP=14,TOP=4,BAR_Y=TOP+BH+GAP,BAR_H=6,LOW_Y=BAR_Y+BAR_H,VH=LOW_Y+GAP+4*BH+4,DRAG=6,cnt=0;
var PLACES=['Ones','Tens','Hundreds','Thousands','Ten thousands','Hundred thousands','Millions','Ten millions'];
var WORDS=['no','one','two','three','four'];
var BEAD='2,9 11,0 29,0 38,9 29,18 11,18';
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function pow10(k){var r=1;while(k-->0)r*=10;return r}
function fmt(n){try{return n.toLocaleString('en-US')}catch(_){return String(n)}}
function beadsText(d){var u=d>=5,l=d%5,parts=[];if(u)parts.push('one five');if(l)parts.push(WORDS[l]+(l===1?' one':' ones'));
  return parts.length?parts.join(', '):'no beads counted'}
function Abacus(p){
  var rods=clamp(Math.round(+p.rods||4),1,8),max=pow10(rods)-1;
  var uid=R.useId?R.useId():'',idr=R.useRef(null);
  if(!idr.current)idr.current='cz-sob-'+(uid?uid.replace(/[^a-zA-Z0-9_-]/g,''):'n'+(++cnt));
  var lblId=idr.current+'-l',hintId=idr.current+'-h';
  var st=S(function(){return clamp(Math.round(+p.defaultValue||0),0,max)});
  var ctl=p.value!=null,n=clamp(Math.round(ctl?(+p.value||0):st[0]),0,max);
  var drag=R.useRef(null);
  var names=[];for(var k=0;k<rods;k++){var pw=rods-1-k;names.push((p.places&&p.places[k])||PLACES[pw]||('Place '+(pw+1)))}
  function digit(k){return Math.floor(n/pow10(rods-1-k))%10}
  function setN(v){v=clamp(v,0,max);if(v===n)return;if(!ctl)st[1](v);if(p.onChange)p.onChange(v)}
  function setDigit(k,d){var m=pow10(rods-1-k);setN(n+(clamp(d,0,9)-digit(k))*m)}
  function onKey(k){return function(e){var d=digit(k),key=e.key,nd=null;
    if(key==='ArrowUp'||key==='ArrowRight')nd=Math.min(9,d+1);
    else if(key==='ArrowDown'||key==='ArrowLeft')nd=Math.max(0,d-1);
    else if(key==='Home')nd=0;else if(key==='End')nd=9;
    else if(/^[0-9]$/.test(key)&&!e.ctrlKey&&!e.metaKey&&!e.altKey)nd=+key;
    if(nd==null)return;e.preventDefault();setDigit(k,nd)}}
  /* bead ids: 'u' upper five-bead; '0'..'3' lower one-beads counted outward from the bar */
  function toggle(k,b){var d=digit(k),u=d>=5,l=d%5;
    if(b==='u')u=!u;else{var i=+b;l=i<l?i:i+1}
    setDigit(k,(u?5:0)+l)}
  function isOn(d,b){return b==='u'?d>=5:(+b)<d%5}
  function down(k){return function(e){if(e.button!=null&&e.button>0)return;var el=e.currentTarget;
    try{el.focus({preventScroll:true})}catch(_){}
    var t=e.target&&e.target.closest?e.target.closest('[data-b]'):null;if(!t)return;e.preventDefault();
    try{el.setPointerCapture(e.pointerId)}catch(_){}
    drag.current={k:k,b:t.getAttribute('data-b'),y:e.clientY,acted:false}}}
  function move(k){return function(e){var s=drag.current;if(!s||s.k!==k)return;
    var svg=e.currentTarget.querySelector('svg'),b=svg?svg.getBoundingClientRect():null;if(!b||!b.height)return;
    var dy=(e.clientY-s.y)*VH/b.height,toward=s.b==='u'?dy:-dy,on=isOn(digit(k),s.b);
    if((toward>DRAG&&!on)||(toward<-DRAG&&on)){toggle(k,s.b);s.acted=true;s.y=e.clientY}}}
  function up(k){return function(){var s=drag.current;drag.current=null;if(s&&s.k===k&&!s.acted)toggle(k,s.b)}}
  function cancel(){drag.current=null}
  function bead(b,y,on){return h('g',{key:b,'data-b':b,className:'cz-sob-bead '+(on?'cz-sob-on':'cz-sob-off'),style:{transform:'translateY('+y+'px)'}},
    h('polygon',{points:BEAD}))}
  function rod(k){var d=digit(k),u=d>=5,l=d%5,name=names[k],beads=[bead('u',u?BAR_Y-BH:TOP,u)];
    for(var i=0;i<4;i++)beads.push(bead(String(i),LOW_Y+i*BH+(i<l?0:GAP),i<l));
    return h('div',{key:k,role:'slider',tabIndex:0,className:'cz-sob-rod','aria-label':name,'aria-describedby':hintId,
      'aria-orientation':'vertical','aria-valuemin':0,'aria-valuemax':9,'aria-valuenow':d,
      'aria-valuetext':name+': '+d+' ('+beadsText(d)+')',onKeyDown:onKey(k),
      onPointerDown:down(k),onPointerMove:move(k),onPointerUp:up(k),onPointerCancel:cancel,onLostPointerCapture:cancel},
      h('svg',{className:'cz-sob-svg',viewBox:'0 0 '+VW+' '+VH,'aria-hidden':'true',focusable:'false'},
        h('line',{className:'cz-sob-stick',x1:VW/2,y1:0,x2:VW/2,y2:VH}),
        h('rect',{className:'cz-sob-bar',x:-3,y:BAR_Y,width:VW+6,height:BAR_H}),
        beads),
      h('span',{className:'cz-sob-dg','aria-hidden':'true'},d))}
  var list=[];for(var j=0;j<rods;j++)list.push(rod(j));
  var total=fmt(n)+(p.unit?' '+p.unit:'');
  return h('div',{className:'cz-sob',role:'group','aria-labelledby':lblId},
    h('span',{id:lblId,className:'cz-sob-lb'},p.label),
    h('div',{className:'cz-sob-frame'},list),
    h('div',{className:'cz-sob-foot'},
      h('span',{className:'cz-sob-totw'},h('span',{className:'cz-sob-totl'},'Total'),
        h('output',{className:'cz-sob-tot','aria-live':'polite'},total)),
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-sob-btn',onClick:function(){setN(0)}},'Clear')),
    h('p',{id:hintId,className:'cz-sob-hint'},'Tap a bead to move it to or from the bar, or focus a rod and use the arrow keys or type a digit.'))}
window.Componentia.Abacus=Abacus;})();

/* Componentia RadioTuner — forge_20261109T1358Z. Credit: Idea: the analogue radio tuning dial, a public-domain device; near-duplicates seen: Digital Rotary Radio (Framer Marketplace), Music Radio Station block (shadcn.io), Rotary Radio Switch by ravikatiyar162 (21st.dev), CodePen pen dermalhealth/yygvgdx (licences not read, no code used). Componentia original code. */
(function(){var R=window.React,h=R.createElement,S=R.useState;
/* CELL: static dot cell in css px; FPS_MS: minimum ms between static redraws while flickering; FADE: signal fade zone in lockRange units */
var CELL=3,FPS_MS=70,FADE=3,MAXST=10,cnt=0;
function rmq(){try{return window.matchMedia('(prefers-reduced-motion: reduce)')}catch(_){return null}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function decs(n){var s=String(n),i=s.indexOf('.');return i<0?0:Math.min(6,s.length-i-1)}
/* seeded generator for the one still frame, so it does not change between paints */
function seeded(s){return function(){s=(s*1103515245+12345)%2147483648;return s/2147483648}}
function RadioTuner(p){
  var stations=R.useMemo(function(){return (p.stations||[]).filter(function(s){return s&&isFinite(+s.freq)})
    .map(function(s,i){return {freq:+s.freq,label:String(s.label==null?'':s.label),i:i}})
    .sort(function(a,b){return a.freq-b.freq}).slice(0,MAXST)},[JSON.stringify(p.stations||[])]);
  var lo=stations.length?stations[0].freq:0,hi=stations.length?stations[stations.length-1].freq:10;
  var min=p.min!=null&&isFinite(+p.min)?+p.min:Math.floor(lo)-1,max=p.max!=null&&isFinite(+p.max)?+p.max:Math.ceil(hi)+1;
  if(max<=min)max=min+1;
  var step=p.step>0?+p.step:0.1,lockR=p.lockRange>=0?+p.lockRange:0.3,unit=p.unit||'';
  var dp=Math.max(decs(step),stations.reduce(function(a,s){return Math.max(a,decs(s.freq))},0));
  function rnd(v){var k=Math.pow(10,dp);return Math.round(v*k)/k}
  function fit(v){return rnd(clamp(v,min,max))}
  var ctl=p.value!=null,own=S(function(){return fit(p.defaultValue!=null?+p.defaultValue:min)});
  var val=fit(ctl?+p.value:own[0]);
  var uid=R.useId?R.useId():'',idr=R.useRef(null);
  if(!idr.current)idr.current='cz-rt-'+(uid?uid.replace(/[^a-zA-Z0-9_-]/g,''):'n'+(++cnt));
  var lblId=idr.current+'-l',hintId=idr.current+'-h';
  var live=S(''),cvRef=R.useRef(null),trRef=R.useRef(null);
  var mq=R.useRef(null);if(mq.current===null)mq.current=rmq()||false;
  var red=S(function(){return !!(mq.current&&mq.current.matches)});
  /* nearest station, lock and signal */
  function near(v){var b=null,bd=Infinity;stations.forEach(function(s){var d=Math.abs(s.freq-v);if(d<bd-1e-9){bd=d;b=s}});return {s:b,d:bd}}
  var fade=Math.max(lockR*FADE,step*5);
  function signal(d){return d<=lockR+1e-9?1:clamp(1-(d-lockR)/fade,0,1)}
  var nr=near(val),locked=nr.s&&nr.d<=lockR+1e-9?nr.s:null,sig=signal(nr.d);
  var bars=locked?5:Math.min(4,Math.floor(sig*5));
  var m=R.useRef(null);if(!m.current)m.current={raf:0,vis:true,last:0,drag:false};
  m.current.locked=!!locked;m.current.sig=sig;m.current.red=red[0];
  function fmt(v){return v.toFixed(dp)+(unit?' '+unit:'')}
  function pct(v){return (v-min)/(max-min)*100}
  /* announce lock / unlock only (never on mount), in the same update as the value */
  function set(v){v=fit(v);if(v===val)return;
    if(!ctl)own[1](v);var n=near(v),ls=n.s&&n.d<=lockR+1e-9?n.s:null,was=locked?locked.i:-1,cur=ls?ls.i:-1;
    if(p.onChange)p.onChange(v,ls?{freq:ls.freq,label:ls.label}:null);
    if(cur!==was){if(ls){live[1]('Locked: '+ls.label+', '+fmt(ls.freq));if(p.onLock)p.onLock({freq:ls.freq,label:ls.label})}
      else live[1]('Signal lost, between stations')}}
  /* static field: dot density by distance from the nearest station at that x, scaled by the needle's signal */
  function paint(rng){var cv=cvRef.current;if(!cv)return;var b=cv.getBoundingClientRect();if(!b.width)return;
    var dpr=window.devicePixelRatio||1,pw=Math.max(1,Math.round(b.width*dpr)),ph=Math.max(1,Math.round(b.height*dpr));
    if(cv.width!==pw)cv.width=pw;if(cv.height!==ph)cv.height=ph;
    var cs=getComputedStyle(cv),ctx=cv.getContext('2d');if(!ctx)return;ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle=cs.getPropertyValue('--inset').trim();ctx.fillRect(0,0,pw,ph);
    ctx.fillStyle=cs.getPropertyValue('--ink-muted').trim();
    var c=Math.max(1,Math.round(CELL*dpr)),dot=Math.max(1,Math.round(2*dpr)),gain=0.35+0.65*(1-m.current.sig);
    for(var x=0;x<pw;x+=c){var f=min+(x+c/2)/pw*(max-min),dd=near(f).d,dn=(1-signal(dd))*gain*0.55;if(dn<=0)continue;
      for(var y=0;y<ph;y+=c)if(rng()<dn)ctx.fillRect(x,y,dot,dot)}}
  var paintRef=R.useRef(paint);paintRef.current=paint;
  function still(){paintRef.current(seeded(7919))}
  function stop(){var s=m.current;if(s.raf){cancelAnimationFrame(s.raf);s.raf=0}}
  function sync(){var s=m.current,run=!s.red&&s.vis&&!s.locked&&!(typeof document!=='undefined'&&document.hidden);
    if(run&&!s.raf){var tick=function(ts){var q=m.current;q.raf=0;
        if(q.red||!q.vis||q.locked||document.hidden){still();return}
        if(ts-q.last>=FPS_MS){q.last=ts;paintRef.current(Math.random)}
        q.raf=requestAnimationFrame(tick)};
      s.raf=requestAnimationFrame(tick)}
    else if(!run){stop();still()}}
  var syncRef=R.useRef(sync);syncRef.current=sync;
  R.useEffect(function(){if(!m.current.raf)still();syncRef.current()});
  R.useEffect(function(){var go=function(){if(!m.current.raf)still()},ro=null,mo=null,io=null,q=mq.current;
    var onRed=function(){red[1](!!q.matches)};if(q)try{q.addEventListener('change',onRed)}catch(_){}
    if(window.ResizeObserver&&cvRef.current){ro=new ResizeObserver(go);ro.observe(cvRef.current)}
    if(window.MutationObserver){mo=new MutationObserver(go);mo.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['data-theme','class']})}
    if(window.IntersectionObserver&&cvRef.current){io=new IntersectionObserver(function(en){var e=en[en.length-1];m.current.vis=!!(e&&e.isIntersecting);syncRef.current()});io.observe(cvRef.current)}
    var vis=function(){syncRef.current()};document.addEventListener('visibilitychange',vis);
    return function(){if(q)try{q.removeEventListener('change',onRed)}catch(_){}if(ro)ro.disconnect();if(mo)mo.disconnect();if(io)io.disconnect();
      document.removeEventListener('visibilitychange',vis);stop()}},[]);
  /* stations either side of the needle */
  function nextSt(){for(var i=0;i<stations.length;i++)if(stations[i].freq>val+1e-9)return stations[i];return null}
  function prevSt(){for(var i=stations.length-1;i>=0;i--)if(stations[i].freq<val-1e-9)return stations[i];return null}
  var ns=nextSt(),ps=prevSt();
  function onKey(e){if(e.altKey||e.ctrlKey||e.metaKey)return;var k=e.key,big=e.shiftKey?10:1,t=null;
    if(k==='ArrowRight'||k==='ArrowUp')t=val+step*big;
    else if(k==='ArrowLeft'||k==='ArrowDown')t=val-step*big;
    else if(k==='PageUp'){if(ns)t=ns.freq;else{e.preventDefault();return}}
    else if(k==='PageDown'){if(ps)t=ps.freq;else{e.preventDefault();return}}
    else if(k==='Home')t=min;else if(k==='End')t=max;
    if(t==null)return;e.preventDefault();set(t)}
  function fromX(e){var tr=trRef.current;if(!tr)return val;var b=tr.getBoundingClientRect();if(!b.width)return val;
    var f=min+clamp((e.clientX-b.left)/b.width,0,1)*(max-min);return min+Math.round((f-min)/step)*step}
  function down(e){if(e.button!=null&&e.button>0)return;e.preventDefault();var el=e.currentTarget;
    try{el.setPointerCapture(e.pointerId)}catch(_){}try{el.focus({preventScroll:true})}catch(_){}
    m.current.drag=true;set(fromX(e))}
  function move(e){if(m.current.drag)set(fromX(e))}
  function up(){m.current.drag=false}
  var name=locked?locked.label:'Between stations';
  var vt=val.toFixed(dp)+(unit?' '+unit:'')+' · '+(locked?locked.label+', locked':'between stations');
  /* tick marks: minor every step-multiple that gives about 20 ticks, major every fifth */
  var span=max-min,raw=span/20,mag=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)),unitT=[1,2,5,10].map(function(k){return k*mag}).filter(function(k){return k>=raw})[0]||raw;
  var ticks=[],t0=Math.ceil(min/unitT-1e-9)*unitT;
  for(var j=0,tv=t0;tv<=max+1e-9&&j<60;j++,tv=t0+j*unitT){var maj=Math.abs(Math.round(tv/unitT)%5)===0;
    ticks.push(h('line',{key:'t'+j,x1:pct(tv)*10,x2:pct(tv)*10,y1:maj?0:10,y2:24,className:maj?'cz-rt-tkM':'cz-rt-tk',vectorEffect:'non-scaling-stroke'}))}
  stations.forEach(function(s){ticks.push(h('line',{key:'s'+s.i,x1:pct(s.freq)*10,x2:pct(s.freq)*10,y1:0,y2:24,className:'cz-rt-tkS',vectorEffect:'non-scaling-stroke'}))});
  var labels=stations.map(function(s,k){var q=pct(s.freq),pos=q<=14?'s':q>=86?'e':'m';
    return h('span',{key:s.i,className:'cz-rt-sl cz-rt-sl-'+pos+' cz-rt-row'+(k%2)+(locked&&locked.i===s.i?' cz-rt-on':''),style:{left:q+'%'}},s.label)});
  var meter=[];for(var b=0;b<5;b++){var bh=6+b*3.5;meter.push(h('rect',{key:b,x:b*7+1,y:24-bh,width:5,height:bh,className:b<bars?'cz-rt-bon':'cz-rt-boff'}))}
  var mark=locked?h('svg',{className:'cz-rt-mk',viewBox:'0 0 20 20','aria-hidden':'true',focusable:'false'},h('circle',{cx:10,cy:10,r:8,className:'cz-rt-okm'}))
    :h('svg',{className:'cz-rt-mk',viewBox:'0 0 20 20','aria-hidden':'true',focusable:'false'},h('circle',{cx:10,cy:10,r:7,className:'cz-rt-ring'}));
  return h('div',{className:'cz-rt'+(locked?' cz-rt-locked':'')},
    h('span',{id:lblId,className:'cz-rt-lb'},p.label),
    h('div',{className:'cz-rt-read'},
      h('div',{className:'cz-rt-rl'},
        h('span',{className:'cz-rt-freq'},val.toFixed(dp),unit?h('span',{className:'cz-rt-unit'},' '+unit):null),
        h('span',{className:'cz-rt-name'},name)),
      h('div',{className:'cz-rt-rr'},
        h('span',{className:'cz-rt-state'},mark,h('span',null,locked?'Locked':'Searching')),
        h('span',{className:'cz-rt-sig'},h('svg',{className:'cz-rt-meter',viewBox:'0 0 36 25','aria-hidden':'true',focusable:'false'},meter),
          h('span',null,'Signal '+bars+'/5')))),
    h('div',{role:'slider',tabIndex:0,className:'cz-rt-band','aria-labelledby':lblId,'aria-describedby':hintId,'aria-orientation':'horizontal',
        'aria-valuemin':min,'aria-valuemax':max,'aria-valuenow':val,'aria-valuetext':vt,
        onKeyDown:onKey,onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up,onLostPointerCapture:up},
      h('div',{ref:trRef,className:'cz-rt-track'},
        h('canvas',{ref:cvRef,className:'cz-rt-cv','aria-hidden':'true'}),
        h('svg',{className:'cz-rt-ticks',viewBox:'0 0 1000 24',preserveAspectRatio:'none','aria-hidden':'true',focusable:'false'},ticks),
        h('div',{className:'cz-rt-labels','aria-hidden':'true'},labels),
        h('div',{className:'cz-rt-needle','aria-hidden':'true',style:{left:pct(val)+'%'}},h('span',{className:'cz-rt-nh'})))),
    h('div',{className:'cz-rt-btns'},
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-rt-btn','aria-disabled':ps?'false':'true',onClick:function(){if(ps)set(ps.freq)}},
        h('span',{'aria-hidden':'true',className:'cz-rt-g'},'‹'),h('span',null,'Previous station')),
      h('button',{type:'button',className:'cz-btn cz-btn-secondary cz-rt-btn','aria-disabled':ns?'false':'true',onClick:function(){if(ns)set(ns.freq)}},
        h('span',null,'Next station'),h('span',{'aria-hidden':'true',className:'cz-rt-g'},'›'))),
    h('p',{id:hintId,className:'cz-rt-hint'},'Drag along the band, or focus it and use the arrow keys (Shift for bigger moves). Page Up and Page Down jump between stations.'),
    h('span',{className:'cz-rt-sr','aria-live':'polite'},live[0]))}
window.Componentia.RadioTuner=RadioTuner;})();
