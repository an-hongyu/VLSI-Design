(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const BASE = {wn:0.9,vdd:1.8,muN:200,muP:100,vtn:0.4,vtp:0.4,L:0.18};
  const COLORS={weak:'#df7448',balanced:'#286bc2',strong:'#078e87'};
  const CASES=[
    {id:'weak',name:'Weak PMOS',wp:0.9,color:COLORS.weak,short:'PMOS is weaker: VTC shifts left; LOW noise margin is smaller; output rising is slower.'},
    {id:'balanced',name:'Balanced',wp:1.8,color:COLORS.balanced,short:'Balanced transistor strengths: centered switching point and approximately symmetric noise margins and delays.'},
    {id:'strong',name:'Strong PMOS',wp:2.7,color:COLORS.strong,short:'PMOS is stronger: VTC shifts right; HIGH noise margin is smaller; output falling is slower.'}
  ];
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const f3=x=>x.toFixed(3),f2=x=>x.toFixed(2);
  function makeParams(wp){
    const p={...BASE,wp};
    p.bn=p.muN*1e-6*p.wn/p.L;
    p.bp=p.muP*1e-6*p.wp/p.L;
    p.r=p.bp/p.bn;
    p.capFf=0.8+0.85*(p.wp+p.wn);
    return p;
  }
  function iN(vin,vout,p){
    const over=vin-p.vtn;if(over<=0)return 0;
    const vd=clamp(vout,0,p.vdd);
    if(vd<over)return p.bn*(over*vd-0.5*vd*vd);
    return 0.5*p.bn*over*over*(1+0.06*(vd-over));
  }
  function iP(vin,vout,p){
    const over=p.vdd-vin-p.vtp;if(over<=0)return 0;
    const vd=clamp(p.vdd-vout,0,p.vdd);
    if(vd<over)return p.bp*(over*vd-0.5*vd*vd);
    return 0.5*p.bp*over*over*(1+0.06*(vd-over));
  }
  function staticOut(vin,p){
    if(vin<=p.vtn)return p.vdd;
    if(vin>=p.vdd-p.vtp)return 0;
    let lo=0,hi=p.vdd;
    for(let i=0;i<32;i++){
      const mid=(lo+hi)/2;
      if(iN(vin,mid,p)>iP(vin,mid,p))hi=mid;else lo=mid;
    }
    return 0.5*(lo+hi);
  }
  function solveVM(p){
    let lo=0,hi=p.vdd;
    for(let i=0;i<37;i++){const mid=(lo+hi)/2;if(staticOut(mid,p)>mid)lo=mid;else hi=mid;}
    return 0.5*(lo+hi);
  }
  function vtcSlope(v,p){
    const h=p.vdd/5000,a=Math.max(0,v-h),b=Math.min(p.vdd,v+h);
    return (staticOut(b,p)-staticOut(a,p))/(b-a);
  }
  function noiseBounds(p){
    let roots=[],prevX=0,prev=vtcSlope(0,p)+1;
    for(let i=1;i<=720;i++){
      const x=i*p.vdd/720,f=vtcSlope(x,p)+1;
      if(prev*f<0){
        let a=prevX,b=x,fa=prev;
        for(let j=0;j<24;j++){const mid=(a+b)/2,fm=vtcSlope(mid,p)+1;if(fa*fm<=0)b=mid;else{a=mid;fa=fm;}}
        roots.push((a+b)/2);
      }
      prevX=x;prev=f;
    }
    return {vil:roots[0],vih:roots[roots.length-1]};
  }
  function delay(p,which){
    const n=700,step=p.vdd/(2*n),cap=p.capFf*1e-15;
    let t=0;
    for(let i=0;i<n;i++){
      const v=which==='rise'? (i+0.5)*step : p.vdd/2+(i+0.5)*step;
      const current=which==='rise'?iP(0,v,p):iN(p.vdd,v,p);
      t+=cap*step/Math.max(current,1e-15);
    }
    return t*1e12;
  }
  function calculate(wp){
    const p=makeParams(wp),b=noiseBounds(p);
    return {...p,vm:solveVM(p),vil:b.vil,vih:b.vih,nml:b.vil,nmh:p.vdd-b.vih,
      tplh:delay(p,'rise'),tphl:delay(p,'fall')};
  }
  const DATA=CASES.map(c=>({...c,...calculate(c.wp)}));
  let selected='balanced';
  const sx=(n,max,min=0)=>min+(n/max);
  function line(points,x,y){return points.map((p,i)=>(i?'L':'M')+x(p).toFixed(2)+' '+y(p).toFixed(2)).join(' ');}
  function txt(x,y,value,attrs=''){return '<text x="'+x+'" y="'+y+'" '+attrs+'>'+value+'</text>';}
  function svgWrap(w,h,inside){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" aria-hidden="true">'+inside+'</svg>';}
  function vtcSvg(){
    const W=650,H=335,x0=59,x1=626,y0=20,y1=278,V=BASE.vdd;
    const X=v=>x0+(x1-x0)*v/V,Y=v=>y1-(y1-y0)*v/V;
    let s='';
    for(let i=0;i<=4;i++){
      const v=V*i/4,yy=Y(v),xx=X(v);
      s+='<line x1="'+x0+'" y1="'+yy+'" x2="'+x1+'" y2="'+yy+'" stroke="#e8eef3"/>';
      s+='<line x1="'+xx+'" y1="'+y0+'" x2="'+xx+'" y2="'+y1+'" stroke="#edf1f5"/>';
      s+=txt(x0-9,yy+4,v.toFixed(2),'text-anchor="end" class="tick"')+txt(xx,y1+19,v.toFixed(2),'text-anchor="middle" class="tick"');
    }
    s+='<line x1="'+x0+'" y1="'+y1+'" x2="'+x1+'" y2="'+y1+'" stroke="#8294a7"/>';
    s+='<path d="M '+X(0)+' '+Y(0)+' L '+X(V)+' '+Y(V)+'" fill="none" stroke="#b7c2ce" stroke-dasharray="6 5" stroke-width="1.5"/>';
    const ordered=[...DATA.filter(d=>d.id!==selected),DATA.find(d=>d.id===selected)];
    for(const d of ordered){
      const points=Array.from({length:290},(_,i)=>{const vin=V*i/289;return {x:vin,y:staticOut(vin,d)};});
      s+='<path d="'+line(points,p=>X(p.x),p=>Y(p.y))+'" stroke="'+d.color+'" stroke-width="'+(d.id===selected?4.5:2.5)+'" opacity="'+(d.id===selected?'1':'.57')+'" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
      if(d.id===selected){
        s+='<circle cx="'+X(d.vm)+'" cy="'+Y(d.vm)+'" r="5" fill="'+d.color+'" stroke="white" stroke-width="2"/>';
        s+='<line x1="'+X(d.vm)+'" y1="'+y1+'" x2="'+X(d.vm)+'" y2="'+Y(d.vm)+'" stroke="'+d.color+'" stroke-width="1.5" stroke-dasharray="4 4"/>';
        const tx=clamp(X(d.vm)+14,90,465);
        s+=txt(tx,Y(d.vm)-11,'VM = '+f3(d.vm)+' V','class="svg-title"');
      }
    }
    s+=txt(345,321,'Input voltage Vin (V)','class="axis-label" text-anchor="middle"');
    s+=txt(17,160,'Output voltage Vout (V)','class="axis-label" text-anchor="middle" transform="rotate(-90 17 160)"');
    return svgWrap(W,H,s);
  }
  function noiseSvg(){
    const W=650,H=335,x0=64,yTop=27,yBase=276,max=1;
    const Y=v=>yBase-(v/max)*(yBase-yTop);
    let s='';
    [0,.25,.5,.75,1].forEach(v=>{
      const y=Y(v);
      s+='<line x1="'+x0+'" y1="'+y+'" x2="633" y2="'+y+'" stroke="#e8eef3"/>';
      s+=txt(x0-12,y+4,v.toFixed(2),'text-anchor="end" class="tick"');
    });
    const xs=[148,336,524];
    DATA.forEach((d,i)=>{
      const xc=xs[i],active=d.id===selected;
      if(active)s+='<rect x="'+(xc-83)+'" y="'+(yTop-8)+'" width="166" height="'+(yBase-yTop+49)+'" rx="10" fill="'+d.color+'" opacity=".065"/>';
      const pair=[{v:d.nml,color:'#3974c5',dx:-49},{v:d.nmh,color:'#a872cc',dx:5}];
      pair.forEach(b=>{
        const bx=xc+b.dx,by=Y(b.v),ht=yBase-by;
        s+='<rect x="'+bx+'" y="'+by+'" width="43" height="'+ht+'" rx="3" fill="'+b.color+'" opacity="'+(active?1:.63)+'"/>';
        s+=txt(bx+21.5,by-8,b.v.toFixed(3),'class="tick" text-anchor="middle" font-weight="'+(active?'800':'500')+'"');
      });
      s+=txt(xc,306,d.name.replace(' PMOS',''),'class="axis-label" text-anchor="middle"');
    });
    s+=txt(24,151,'Noise margin (V)','class="axis-label" transform="rotate(-90 24 151)" text-anchor="middle"');
    return svgWrap(W,H,s);
  }
  function outputPoints(d,kind){
    const V=d.vdd,dt=.025,maxT=13.5,at=1;
    let v=kind==='fall'?V:0;
    const points=[];
    for(let i=0;i<=Math.round(maxT/dt);i++){
      const t=i*dt;
      if(i && t>at){
        const vin=kind==='fall'?V:0;
        const current=iP(vin,v,d)-iN(vin,v,d);
        v=clamp(v+current*dt*1e-12/(d.capFf*1e-15),0,V);
      }
      points.push({t,v});
    }
    return points;
  }
  function scopeSvg(kind){
    const d=DATA.find(x=>x.id===selected),V=d.vdd,del=kind==='fall'?d.tphl:d.tplh;
    const W=640,H=265,x0=50,x1=621,tMax=13.5,tStep=1;
    const X=t=>x0+(x1-x0)*t/tMax;
    const topY=v=>89-(v/V)*57,botY=v=>226-(v/V)*71;
    let s='';
    [0,4,8,12].forEach(t=>{
      const x=X(t);
      s+='<line x1="'+x+'" y1="24" x2="'+x+'" y2="227" stroke="#edf2f6"/>';
      s+=txt(x,249,t.toFixed(0),'class="tick" text-anchor="middle"');
    });
    for(const frac of [0,.5,1]){
      s+='<line x1="'+x0+'" y1="'+topY(V*frac)+'" x2="'+x1+'" y2="'+topY(V*frac)+'" stroke="#edf2f6"/>';
      s+='<line x1="'+x0+'" y1="'+botY(V*frac)+'" x2="'+x1+'" y2="'+botY(V*frac)+'" stroke="#edf2f6"/>';
    }
    s+=txt(15,58,'Vin','class="svg-title"')+txt(9,192,'Vout','class="svg-title"');
    const vinStart=kind==='fall'?0:V,vinEnd=kind==='fall'?V:0;
    s+='<path d="M '+X(0)+' '+topY(vinStart)+' L '+X(tStep)+' '+topY(vinStart)+' L '+X(tStep)+' '+topY(vinEnd)+' L '+X(tMax)+' '+topY(vinEnd)+'" stroke="#286bc2" stroke-width="3" fill="none"/>';
    const pts=outputPoints(d,kind);
    s+='<path d="'+line(pts,p=>X(p.t),p=>botY(p.v))+'" stroke="#df7448" stroke-width="3.2" fill="none"/>';
    const a=X(tStep),b=X(tStep+del);
    s+='<line x1="'+a+'" y1="23" x2="'+a+'" y2="229" stroke="#286bc2" stroke-dasharray="5 4" stroke-width="1.7"/>';
    s+='<line x1="'+b+'" y1="23" x2="'+b+'" y2="229" stroke="#df7448" stroke-dasharray="5 4" stroke-width="1.7"/>';
    s+='<line x1="'+x0+'" y1="'+botY(V/2)+'" x2="'+x1+'" y2="'+botY(V/2)+'" stroke="#b7c7d7" stroke-dasharray="3 4"/>';
    s+='<circle cx="'+b+'" cy="'+botY(V/2)+'" r="5" fill="#df7448" stroke="white" stroke-width="1.3"/>';
    s+=txt(a-4,16,'A','fill="#286bc2" font-size="12" font-weight="800" text-anchor="end"')+txt(b+5,16,'B','fill="#df7448" font-size="12" font-weight="800"');
    const yArrow=124;
    s+='<line x1="'+a+'" y1="'+yArrow+'" x2="'+b+'" y2="'+yArrow+'" stroke="#0b8580" stroke-width="2"/>';
    s+='<path d="M '+a+' '+yArrow+' l 7 -4 l 0 8 Z M '+b+' '+yArrow+' l -7 -4 l 0 8 Z" fill="#0b8580"/>';
    s+=txt((a+b)/2+11,113,f2(del)+' ps','fill="#08756d" text-anchor="middle" font-weight="800" font-size="13"');
    s+=txt(345,262,'Time after input step (ps)','class="axis-label" text-anchor="middle"');
    return svgWrap(W,H,s);
  }
  function caseCard(d){
    const r=f2(d.r),vm=f3(d.vm),vIL=f3(d.vil),vIH=f3(d.vih);
    const statement=d.id==='weak'?'LEFT VTC shift · reduced LOW noise margin · slower output rise':
       d.id==='strong'?'RIGHT VTC shift · reduced HIGH noise margin · slower output fall':
       'CENTERED VTC · nearly symmetric noise margins and delays';
    return '<article class="case-card '+d.id+'-case'+(d.id===selected?' selected':'')+'" data-case-card="'+d.id+'">'+
      '<div class="case-top"><h3><span class="color-swatch '+d.id+'"></span> '+d.name+'</h3><span class="case-chip">Wp = '+f2(d.wp)+' μm</span></div>'+
      '<div class="eq"><strong>1 · Beta ratio</strong><div>βp/βn = (100 × '+f2(d.wp)+') / (200 × 0.90) = <strong>'+r+'</strong></div></div>'+
      '<div class="eq"><strong>2 · Switching point</strong><div>VM = [0.4 + √'+r+' × 1.4] / [1 + √'+r+'] = <strong>'+vm+' V</strong></div></div>'+
      '<div class="eq"><strong>3 · Noise margins</strong><div>NML = '+vIL+' − 0 = <strong>'+f3(d.nml)+' V</strong></div><div>NMH = 1.800 − '+vIH+' = <strong>'+f3(d.nmh)+' V</strong></div></div>'+
      '<div class="eq"><strong>4 · Intrinsic delay</strong><div>Cint = 0.8 + 0.85('+f2(d.wp)+' + 0.90) = '+f2(d.capFf)+' fF</div>'+
      '<div>tPLH = Cint ∫ dV / Ip = <strong>'+f2(d.tplh)+' ps</strong></div><div>tPHL = Cint ∫ dV / In = <strong>'+f2(d.tphl)+' ps</strong></div></div>'+
      '<div class="results"><div>VM <b>'+vm+' V</b></div><div>βp/βn <b>'+r+'</b></div><div>NML <b>'+f3(d.nml)+' V</b></div><div>NMH <b>'+f3(d.nmh)+' V</b></div><div>tPLH <b>'+f2(d.tplh)+' ps</b></div><div>tPHL <b>'+f2(d.tphl)+' ps</b></div></div>'+
      '<p class="case-summary">'+statement+'</p></article>';
  }
  function select(id){
    if(!DATA.some(d=>d.id===id))return;
    selected=id;const d=DATA.find(x=>x.id===id);
    document.querySelectorAll('button[data-case]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.case===id)));
    $('selectedTakeaway').textContent=d.short+' Selected: Wp = '+f2(d.wp)+' μm, VM = '+f3(d.vm)+' V.';
    $('vtcChart').innerHTML=vtcSvg();
    $('noiseChart').innerHTML=noiseSvg();
    $('fallChart').innerHTML=scopeSvg('fall');
    $('riseChart').innerHTML=scopeSvg('rise');
    $('fallDelay').textContent='tPHL = '+f2(d.tphl)+' ps · Output discharging';
    $('riseDelay').textContent='tPLH = '+f2(d.tplh)+' ps · Output charging';
    $('caseCards').innerHTML=DATA.map(caseCard).join('');
    announceHeight();
  }
  function announceHeight(){
    if(window.parent===window)return;
    const h=Math.ceil(document.documentElement.scrollHeight);
    window.parent.postMessage({type:'vlsi-lab-height',height:h},window.location.origin);
  }
  document.querySelectorAll('button[data-case]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.case)));
  window.addEventListener('resize',announceHeight);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(announceHeight).observe(document.body);
  window.VLSI_DESIGN={cases:DATA,calculate,staticOut,select};
  select('balanced');
})();