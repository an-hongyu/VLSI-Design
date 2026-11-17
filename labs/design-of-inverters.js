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

  function buildEdgeProfile(p,kind){
    // Exact same long-channel current laws as the DC model, with a fixed
    // illustrative intrinsic node capacitor. Input is an ideal voltage step.
    // Output charging or discharging is numerically integrated in voltage.
    const n=1600, c=p.capFf*1e-15;
    const pts=[{t:0,v:kind==='rise'?0:p.vdd}];
    let t=0;
    for(let i=0;i<n;i++){
      const v0=p.vdd*(kind==='rise'?i/n:1-i/n);
      const v1=p.vdd*(kind==='rise'?(i+1)/n:1-(i+1)/n);
      const mid=(v0+v1)/2;
      const current=kind==='rise'?iP(0,mid,p):iN(p.vdd,mid,p);
      t+=c*Math.abs(v1-v0)/Math.max(1e-19,current)*1e12;
      pts.push({t,v:v1});
    }
    return pts;
  }
  function timeAtVoltage(profile,target){
    for(let i=1;i<profile.length;i++){
      const a=profile[i-1],b=profile[i];
      if((a.v-target)*(b.v-target)<=0){
        return a.t+(b.t-a.t)*(target-a.v)/(b.v-a.v);
      }
    }
    return NaN;
  }
  function sampleEdge(profile,time){
    if(time<=0)return profile[0].v;
    let lo=0,hi=profile.length-1;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(profile[mid].t<=time)lo=mid;else hi=mid;}
    if(time>=profile[hi].t)return profile[hi].v;
    const a=profile[lo],b=profile[hi];
    return a.v+(b.v-a.v)*(time-a.t)/(b.t-a.t);
  }
  function calculate(wp){
    const p=makeParams(wp),b=noiseBounds(p);
    const profileRise=buildEdgeProfile(p,'rise'),profileFall=buildEdgeProfile(p,'fall');
    const V=p.vdd;
    return {...p,vm:solveVM(p),vil:b.vil,vih:b.vih,nml:b.vil,nmh:V-b.vih,
      tplh:timeAtVoltage(profileRise,.5*V),
      tphl:timeAtVoltage(profileFall,.5*V),
      tr:timeAtVoltage(profileRise,.9*V)-timeAtVoltage(profileRise,.1*V),
      tf:timeAtVoltage(profileFall,.1*V)-timeAtVoltage(profileFall,.9*V),
      riseT10:timeAtVoltage(profileRise,.1*V),riseT90:timeAtVoltage(profileRise,.9*V),
      fallT90:timeAtVoltage(profileFall,.9*V),fallT10:timeAtVoltage(profileFall,.1*V),
      profileRise,profileFall};
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

  const svgText=(x,y,label,attributes='')=>txt(x,y,label,attributes);
  function drawTimingDiagram(){
    const d=DATA.find(x=>x.id===selected);
    const W=670,H=307,x0=59,x1=651,t1=4,t2=22,tmax=37,V=d.vdd;
    const X=t=>x0+(x1-x0)*t/tmax;
    const Yi=v=>94-(v/V)*58;
    const Yo=v=>245-(v/V)*87;
    let s='';
    const transitions=[
      {name:'tₚHL',at:t1,kind:'fall',delay:d.tphl},
      {name:'tₚLH',at:t2,kind:'rise',delay:d.tplh}
    ];
    for(const t of [0,5,10,15,20,25,30,35]){
      const x=X(t);
      s+='<line x1="'+x+'" x2="'+x+'" y1="25" y2="246" stroke="#edf2f6"/>';
      if(t%10===0)s+=svgText(x,278,String(t),'class="tick" text-anchor="middle"');
    }
    for(const level of [0,V/2,V]){
      s+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Yi(level)+'" y2="'+Yi(level)+'" stroke="#e9eef3"/>';
      s+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Yo(level)+'" y2="'+Yo(level)+'" stroke="#e9eef3"/>';
    }
    // Reference textbook style: two aligned voltage traces, with independent
    // output switching events and 50% timing cursors.
    s+=svgText(7,61,'Input','class="svg-title"')+svgText(4,202,'Output','class="svg-title"');
    s+=svgText(16,Yi(V/2)+4,'50%','class="tick"')+svgText(16,Yo(V/2)+4,'50%','class="tick"');
    s+='<path d="M '+X(0)+' '+Yi(0)+' L '+X(t1)+' '+Yi(0)+' L '+X(t1)+' '+Yi(V)+' L '+X(t2)+' '+Yi(V)+' L '+X(t2)+' '+Yi(0)+' L '+X(tmax)+' '+Yi(0)+'" fill="none" stroke="#286bc2" stroke-width="3.2" stroke-linejoin="round"/>';
    const pts=Array.from({length:980},(_,i)=>{
      const t=tmax*i/979;
      const v=t<t1?V:t<t2?sampleEdge(d.profileFall,t-t1):sampleEdge(d.profileRise,t-t2);
      return {t,v};
    });
    s+='<path d="'+line(pts,p=>X(p.t),p=>Yo(p.v))+'" fill="none" stroke="#df7448" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>';
    for(const edge of transitions){
      const a=X(edge.at),b=X(edge.at+edge.delay),yB=Yo(V/2);
      s+='<line x1="'+a+'" x2="'+a+'" y1="22" y2="248" stroke="#286bc2" stroke-width="1.45" stroke-dasharray="6 4"/>';
      s+='<line x1="'+b+'" x2="'+b+'" y1="22" y2="248" stroke="#df7448" stroke-width="1.45" stroke-dasharray="6 4"/>';
      s+='<circle cx="'+a+'" cy="'+Yi(V/2)+'" r="4" fill="#286bc2" stroke="white" stroke-width="1.6"/>';
      s+='<circle cx="'+b+'" cy="'+yB+'" r="4.5" fill="#df7448" stroke="white" stroke-width="1.6"/>';
      const arrowY=133,delta=b-a,center=(a+b)/2;
      s+='<line x1="'+a+'" x2="'+b+'" y1="'+arrowY+'" y2="'+arrowY+'" stroke="#087f79" stroke-width="2.5"/>';
      if(delta>14)s+='<path d="M '+a+' '+arrowY+' l 8 -5 v 10 Z M '+b+' '+arrowY+' l -8 -5 v 10 Z" fill="#087f79"/>';
      s+=svgText(center,121,edge.name+' = '+f2(edge.delay)+' ps','fill="#087f79" font-size="12" font-weight="800" text-anchor="middle"');
    }
    s+=svgText((x0+x1)/2,299,'Time (ps)','class="axis-label" text-anchor="middle"');
    s+=svgText(645,18,'Blue: input 50% · Orange: output 50%','fill="#526f84" font-size="9.5" text-anchor="end"');
    return svgWrap(W,H,s);
  }
  function drawTransitionDiagram(){
    const d=DATA.find(x=>x.id===selected);
    const W=670,H=251,x0=59,x1=651,y0=27,y1=189,t1=4,t2=21,tmax=38,V=d.vdd;
    const X=t=>x0+(x1-x0)*t/tmax;
    const Y=v=>y1-(y1-y0)*v/V;
    let s='';
    for(const frac of [.1,.9]){
      const yy=Y(V*frac);
      s+='<line x1="'+x0+'" x2="'+x1+'" y1="'+yy+'" y2="'+yy+'" stroke="#869aab" stroke-dasharray="7 5" stroke-width="1.35"/>';
      s+=svgText(16,yy+4,(frac*100)+'%','class="svg-title"');
    }
    const pts=Array.from({length:960},(_,i)=>{
      const t=tmax*i/959;
      const v=t<t1?0:t<t2?sampleEdge(d.profileRise,t-t1):sampleEdge(d.profileFall,t-t2);
      return {t,v};
    });
    s+='<path d="'+line(pts,p=>X(p.t),p=>Y(p.v))+'" stroke="#df7448" stroke-width="3.2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>';
    for(const def of [
      {name:'tᵣ',start:t1+d.riseT10,end:t1+d.riseT90,value:d.tr},
      {name:'t𝒇',start:t2+d.fallT90,end:t2+d.fallT10,value:d.tf}
    ]){
      const a=X(def.start),b=X(def.end);
      s+='<line x1="'+a+'" x2="'+a+'" y1="'+y0+'" y2="214" stroke="#168a87" stroke-width="1.4" stroke-dasharray="5 4"/>';
      s+='<line x1="'+b+'" x2="'+b+'" y1="'+y0+'" y2="214" stroke="#168a87" stroke-width="1.4" stroke-dasharray="5 4"/>';
      s+='<line x1="'+a+'" x2="'+b+'" y1="211" y2="211" stroke="#168a87" stroke-width="2.3"/>';
      if(b-a>14)s+='<path d="M '+a+' 211 l 7 -4 v 8 Z M '+b+' 211 l -7 -4 v 8 Z" fill="#168a87"/>';
      s+=svgText((a+b)/2,201,def.name+' = '+f2(def.value)+' ps','fill="#08756d" font-size="12" font-weight="800" text-anchor="middle"');
    }
    for(const t of [0,10,20,30]){
      const x=X(t);
      s+=svgText(x,236,String(t),'class="tick" text-anchor="middle"');
    }
    s+=svgText(632,245,'Time (ps)','class="axis-label" text-anchor="end"');
    s+=svgText(59,17,'Output voltage Vout','class="axis-label"');
    return svgWrap(W,H,s);
  }

  function caseCard(d){
    const r=f2(d.r),vm=f3(d.vm),vIL=f3(d.vil),vIH=f3(d.vih);
    const statement=d.id==='weak'?'LEFT VTC shift · reduced LOW noise margin · slower output rise':
      d.id==='strong'?'RIGHT VTC shift · reduced HIGH noise margin · slower output fall':
      'CENTERED VTC · nearly symmetric noise margins and transition times';
    return '<article class="case-card '+d.id+'-case'+(d.id===selected?' selected':'')+'" data-case-card="'+d.id+'">'+
      '<div class="case-top"><h3><span class="color-swatch '+d.id+'"></span> '+d.name+'</h3><span class="case-chip">Wp = '+f2(d.wp)+' μm</span></div>'+
      '<div class="eq"><strong>1 · Beta ratio</strong><div>βp/βn = (100 × '+f2(d.wp)+') / (200 × 0.90) = <strong>'+r+'</strong></div></div>'+
      '<div class="eq"><strong>2 · Switching point</strong><div>VM = [0.4 + √'+r+' × 1.4] / [1 + √'+r+'] = <strong>'+vm+' V</strong></div></div>'+
      '<div class="eq"><strong>3 · Noise margins (values retained)</strong><div>NML = '+vIL+' − 0 = <strong>'+f3(d.nml)+' V</strong></div><div>NMH = 1.800 − '+vIH+' = <strong>'+f3(d.nmh)+' V</strong></div></div>'+
      '<div class="eq timing-eq"><strong>4 · Delay and transition time</strong><div>Cint = 0.8 + 0.85('+f2(d.wp)+' + 0.90) = '+f2(d.capFf)+' fF</div>'+
      '<div>tpHL = t(B↓50%) − t(A↑50%) = <strong>'+f2(d.tphl)+' ps</strong></div>'+
      '<div>tpLH = t(B↑50%) − t(A↓50%) = <strong>'+f2(d.tplh)+' ps</strong></div>'+
      '<div>tr = t(Vout↑90%) − t(Vout↑10%) = <strong>'+f2(d.tr)+' ps</strong></div>'+
      '<div>tf = t(Vout↓10%) − t(Vout↓90%) = <strong>'+f2(d.tf)+' ps</strong></div></div>'+
      '<div class="results"><div>VM <b>'+vm+' V</b></div><div>βp/βn <b>'+r+'</b></div><div>NML <b>'+f3(d.nml)+' V</b></div><div>NMH <b>'+f3(d.nmh)+' V</b></div>'+
      '<div>tpHL <b>'+f2(d.tphl)+' ps</b></div><div>tpLH <b>'+f2(d.tplh)+' ps</b></div>'+
      '<div>tr <b>'+f2(d.tr)+' ps</b></div><div>tf <b>'+f2(d.tf)+' ps</b></div></div>'+
      '<p class="case-summary">'+statement+'</p></article>';
  }
  function select(id){
    if(!DATA.some(d=>d.id===id))return;
    selected=id;const d=DATA.find(x=>x.id===id);
    document.querySelectorAll('button[data-case]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.case===id)));
    $('selectedTakeaway').textContent=d.short+' Selected: Wp = '+f2(d.wp)+' μm, VM = '+f3(d.vm)+' V.';
    $('vtcChart').innerHTML=vtcSvg();
    $('delayChart').innerHTML=drawTimingDiagram();
    $('transitionChart').innerHTML=drawTransitionDiagram();
    $('dynamicReadout').textContent=d.name+': tpHL = '+f2(d.tphl)+' ps · tpLH = '+f2(d.tplh)+' ps · tr = '+f2(d.tr)+' ps · tf = '+f2(d.tf)+' ps';
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