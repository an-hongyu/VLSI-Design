/* Complementary enhancement to the existing lab: no frequency or external load control. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const core=window.VLSI_LAB;
  if(!core){console.error('VLSI lab model unavailable');return;}
  const ids=['wp','wn','vdd','mn','mp','vtn','vtp','length'];
  const baseline=core.simulate({...core.base});
  const clamp=(x,l,h)=>Math.max(l,Math.min(h,x));
  const currentN=core.currentN,currentP=core.currentP,staticOut=core.staticOut;
  const sgn=(x,digits=3)=>(x>=0?'+':'')+x.toFixed(digits);
  const fmtV=x=>x.toFixed(3)+' V';
  const fmtPs=x=>x.toFixed(2)+' ps';
  function slopeAt(v,p){
    const h=p.vdd/5000,a=Math.max(0,v-h),b=Math.min(p.vdd,v+h);
    return (staticOut(b,p)-staticOut(a,p))/(b-a);
  }
  function findNoiseBounds(p){
    // VIL and VIH are the first and last points where dVout/dVin = -1.
    let roots=[];
    const steps=850;
    let left=0,fleft=slopeAt(0,p)+1;
    for(let i=1;i<=steps;i++){
      const right=p.vdd*i/steps,fright=slopeAt(right,p)+1;
      if(fleft*fright<0){
        let a=left,b=right,fa=fleft;
        for(let j=0;j<29;j++){
          const m=(a+b)/2,fm=slopeAt(m,p)+1;
          if(fa*fm<=0){b=m;}else{a=m;fa=fm;}
        }
        roots.push((a+b)/2);
      }
      left=right;fleft=fright;
    }
    return {vil:roots.length>=2?roots[0]:NaN,vih:roots.length>=2?roots[roots.length-1]:NaN};
  }
  function intrinsicCap(p){
    // Inferred *illustrative* parasitics, NOT a characterized 0.18-um PDK.
    // No external load. Fixed interconnect + width-proportional drain diffusion.
    return (0.8 + 0.85*(p.wp+p.wn))*1e-15; // farads
  }
  function stepDelay(p,which){
    const n=480,V=p.vdd,cap=intrinsicCap(p),dx=V/(2*n);
    let delay=0;
    for(let i=0;i<n;i++){
      const v=which==='rise'? (i+.5)*dx : V/2+(i+.5)*dx;
      const I=which==='rise'?currentP(0,v,p):currentN(V,v,p);
      delay+=cap*dx/Math.max(I,1e-15);
    }
    return delay*1e12; // ps for an ideal instantaneous input step
  }
  function stats(p){
    const bounds=findNoiseBounds(p);
    return {
      ...bounds,
      nml:bounds.vil, // VOL ~ 0 for ideal rail-to-rail output
      nmh:p.vdd-bounds.vih, // VOH ~ VDD
      tplh:stepDelay(p,'rise'),
      tphl:stepDelay(p,'fall'),
      cintFf:intrinsicCap(p)*1e15
    };
  }
  const reference=stats(baseline);
  function response(p,which){
    // Integrate dt=Cint*dV/I(V) for a step-driven, unloaded output node.
    const n=300,V=p.vdd,cap=intrinsicCap(p),dx=V/n;
    let t=0;
    const out=[{t:0,v:which==='rise'?0:1}];
    for(let i=1;i<=n;i++){
      const vin='rise'===which?0:V;
      const mid=which==='rise'?(i-.5)*dx:V-(i-.5)*dx;
      const I=which==='rise'?currentP(vin,mid,p):currentN(vin,mid,p);
      t+=cap*dx/Math.max(I,1e-14)*1e12;
      out.push({t,v:which==='rise'?i/n:1-i/n});
    }
    return out;
  }
  function drawStep(canvas,which,p,m){
    // An ideal input STEP at tInput and an analog output response share a true ps axis.
    // Cursor A marks input 50%, Cursor B marks output 50%. The arrow is their difference.
    const baselineResponse=response(baseline,which);
    const selectedResponse=response(p,which);
    const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;
    if(w<20||h<20)return;
    const dpr=window.devicePixelRatio||1;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
    const g={l:53,r:13,t:59,b:38},pw=w-g.l-g.r,ph=h-g.t-g.b;
    const selectedDelay=which==='rise'?m.tplh:m.tphl;
    const referenceDelay=which==='rise'?reference.tplh:reference.tphl;
    const xMax=Math.max(12,3.4*Math.max(selectedDelay,referenceDelay));
    const tInput=0.15*xMax;
    const tOutput=tInput+selectedDelay;
    const X=t=>g.l+clamp(t/xMax,0,1)*pw;
    const Y=v=>g.t+(1-v)*ph;
    const initOutput=which==='rise'?0:1;
    const finalOutput=1-initOutput;
    const initInput=finalOutput; // Inverter: Vin is opposite to Vout
    const finalInput=initOutput;
    c.font='10px system-ui, sans-serif';c.fillStyle='#74889b';
    for(let i=0;i<=4;i++){
      const v=i/4,y=Y(v),t=i*xMax/4,x=X(t);
      c.strokeStyle='#e5edf3';c.lineWidth=1;
      c.beginPath();c.moveTo(g.l,y);c.lineTo(w-g.r,y);c.stroke();
      c.textAlign='right';c.fillStyle='#718398';c.fillText(v.toFixed(2),g.l-7,y+3);
      c.beginPath();c.moveTo(x,g.t);c.lineTo(x,h-g.b);c.stroke();
      c.textAlign='center';c.fillText(t.toFixed(1),x,h-g.b+15);
    }
    c.textAlign='center';c.fillStyle='#536c81';c.fillText('Time (ps) — ideal input step',g.l+pw/2,h-4);
    c.save();c.translate(14,g.t+ph/2);c.rotate(-Math.PI/2);c.fillText('Voltage / VDD',0,0);c.restore();
    const draw=(pts,color,dashes,thickness)=>{
      c.save();c.beginPath();c.strokeStyle=color;c.lineWidth=thickness;
      c.lineJoin='round';c.lineCap='round';c.setLineDash(dashes);
      c.moveTo(X(0),Y(initOutput));c.lineTo(X(tInput),Y(initOutput));
      for(const q of pts){const t=tInput+q.t;if(t>xMax)break;c.lineTo(X(t),Y(q.v));}
      c.stroke();c.restore();
    };
    draw(baselineResponse,'#a2adbd',[5,5],2);
    draw(selectedResponse,'#087f78',[],2.9);
    // Input step is overlaid in blue: it is NOT a static VTC curve.
    c.beginPath();c.strokeStyle='#2865d9';c.lineWidth=2.5;c.setLineDash([7,3]);
    c.moveTo(X(0),Y(initInput));c.lineTo(X(tInput),Y(initInput));
    c.lineTo(X(tInput),Y(finalInput));c.lineTo(X(xMax),Y(finalInput));c.stroke();c.setLineDash([]);
    // 50%-rail measurement horizontal line.
    const mid=Y(.5);c.setLineDash([3,4]);c.lineWidth=1.2;c.strokeStyle='#b8a780';
    c.beginPath();c.moveTo(g.l,mid);c.lineTo(w-g.r,mid);c.stroke();c.setLineDash([]);
    const xa=X(tInput),xb=X(tOutput);
    // Two independent timing cursors, from the top measurement bar to the voltage rails.
    for(const [x,color] of [[xa,'#2865d9'],[xb,'#087f78']]){
      c.beginPath();c.strokeStyle=color;c.lineWidth=1.35;c.setLineDash([4,4]);
      c.moveTo(x,46);c.lineTo(x,h-g.b);c.stroke();c.setLineDash([]);
      c.fillStyle='#fff';c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.arc(x,mid,4.2,0,Math.PI*2);c.fill();c.stroke();
    }
    // Double-headed caliper from A=input 50% to B=output 50%.
    const arrowY=42;
    c.strokeStyle='#cb6c2e';c.fillStyle='#cb6c2e';c.lineWidth=2;
    c.beginPath();c.moveTo(xa,arrowY);c.lineTo(xb,arrowY);c.stroke();
    c.beginPath();c.moveTo(xa,arrowY);c.lineTo(xa+6,arrowY-3.7);c.lineTo(xa+6,arrowY+3.7);c.closePath();c.fill();
    c.beginPath();c.moveTo(xb,arrowY);c.lineTo(xb-6,arrowY-3.7);c.lineTo(xb-6,arrowY+3.7);c.closePath();c.fill();
    // Render label on a white capsule, independent of cursor spacing at small widths.
    const label=(which==='rise'?'tPLH':'tPHL')+' = '+selectedDelay.toFixed(2)+' ps';
    c.font='bold 11px system-ui, sans-serif';
    const tw=c.measureText(label).width+17;
    const center=clamp((xa+xb)/2,g.l+tw/2,w-g.r-tw/2);
    c.fillStyle='#fff';c.strokeStyle='#f0d8be';c.lineWidth=1;
    c.beginPath();c.roundRect(center-tw/2,8,tw,23,5);c.fill();c.stroke();
    c.textAlign='center';c.fillStyle='#a64f22';c.fillText(label,center,23);
    c.font='bold 10px system-ui, sans-serif';
    c.fillStyle='#2865d9';c.textAlign='left';c.fillText('A',xa+5,55);
    c.fillStyle='#087f78';c.textAlign='right';c.fillText('B',xb-5,55);
    return {input:tInput,output:tOutput,delay:selectedDelay};
  }
  function fill(id,value){const el=$(id);if(el)el.textContent=value;}
  function update(){
    const p=core.simulate(core.read());
    const m=stats(p),ref=reference;
    fill('vilMetric',fmtV(m.vil));fill('vihMetric',fmtV(m.vih));
    fill('nmlMetric',fmtV(m.nml));fill('nmhMetric',fmtV(m.nmh));
    fill('tplhMetric',fmtPs(m.tplh));fill('tphlMetric',fmtPs(m.tphl));
    fill('capEstimate',m.cintFf.toFixed(2)+' fF');
    const columns={vm:[p.vm,baseline.vm,'V'],nml:[m.nml,ref.nml,'V'],nmh:[m.nmh,ref.nmh,'V'],tplh:[m.tplh,ref.tplh,'ps'],tphl:[m.tphl,ref.tphl,'ps']};
    for(const [k,[value,bv,unit]] of Object.entries(columns)){
      fill('comparison-'+k+'-base',bv.toFixed(unit==='V'?3:2)+' '+unit);
      fill('comparison-'+k+'-now',value.toFixed(unit==='V'?3:2)+' '+unit);
      fill('comparison-'+k+'-delta',sgn(value-bv,unit==='V'?3:2)+' '+unit);
    }
    const direction=p.vm<baseline.vm-.01?'left':p.vm>baseline.vm+.01?'right':'near center';
    const caution=m.nml<m.nmh?'LOW-level noise margin is smaller':m.nmh<m.nml?'HIGH-level noise margin is smaller':'noise margins are almost equal';
    fill('currentInference',`At this sizing, βp/βn = ${p.ratio.toFixed(2)}, VM = ${p.vm.toFixed(3)} V (${direction} relative to the default balanced design), and ${caution}. The estimated 50%-level output delays are tPLH = ${m.tplh.toFixed(2)} ps and tPHL = ${m.tphl.toFixed(2)} ps, with no external load.`);
    const riseCursor=drawStep($('riseResponse'),'rise',p,m);
    const fallCursor=drawStep($('fallResponse'),'fall',p,m);
    if(riseCursor){fill('riseInputTime',riseCursor.input.toFixed(2)+' ps');fill('riseOutputTime',riseCursor.output.toFixed(2)+' ps');fill('riseDelayValue',riseCursor.delay.toFixed(2)+' ps');}
    if(fallCursor){fill('fallInputTime',fallCursor.input.toFixed(2)+' ps');fill('fallOutputTime',fallCursor.output.toFixed(2)+' ps');fill('fallDelayValue',fallCursor.delay.toFixed(2)+' ps');}
    window.VLSI_STUDY.latest={...m,vm:p.vm,ratio:p.ratio};
    postHeight();
  }
  function postHeight(){
    if(window.parent===window)return;
    const height=Math.ceil(document.documentElement.scrollHeight);
    window.parent.postMessage({type:'vlsi-lab-height',height},window.location.origin);
  }
  const questions={
    shift:{correct:'left',why:()=>`With Wp = 0.9 μm and Wn = 0.9 μm, βp/βn = 0.50 and VM = 0.814 V instead of 0.900 V. A weak PMOS moves the switching point to the LEFT.`},
    margin:{correct:'nml',why:()=>`For the weak-PMOS example, NML decreases from ${reference.nml.toFixed(3)} V to ${weakStats.nml.toFixed(3)} V, while NMH increases from ${reference.nmh.toFixed(3)} V to ${weakStats.nmh.toFixed(3)} V. A shifted VTC redistributes the noise margins.`},
    delay:{correct:'tplh',why:()=>`The PMOS charges the output on a LOW→HIGH output transition. When Wp is halved, estimated tPLH increases from ${reference.tplh.toFixed(2)} ps to ${weakStats.tplh.toFixed(2)} ps. The NMOS pull-down delay changes too because intrinsic output capacitance depends on both widths.`},
    noise:{correct:'no',why:()=>`No random noise source is added here. Strength imbalance shifts VM, VIL and VIH and changes noise margins; that changes how much external noise the gate can tolerate, not how much random noise the inverter generates.`},
    open:{correct:'nonzero',why:()=>`No external capacitor is connected, but intrinsic drain diffusion and short interconnect still store charge. A finite transistor current needs finite time to charge or discharge that node. These delays are illustrative and not PDK-calibrated.`}
  };
  const weak=core.simulate({...core.base,wp:.9});
  const weakStats=stats(weak);
  const attempts=new Set();
  document.querySelectorAll('[data-question][data-choice]').forEach(button=>{
    button.addEventListener('click',()=>{
      const q=button.dataset.question,choice=button.dataset.choice;
      const root=button.closest('.question'),question=questions[q];
      root.querySelectorAll('.answer').forEach(b=>{b.classList.remove('good','bad');b.setAttribute('aria-pressed','false');});
      button.classList.add(choice===question.correct?'good':'bad');button.setAttribute('aria-pressed','true');
      const target=root.querySelector('.feedback'),yes=choice===question.correct;
      target.className='feedback '+(yes?'success':'retry');
      target.textContent=(yes?'Correct. ':'Try again. ')+question.why();
      if(yes)attempts.add(q);else attempts.delete(q);
      fill('quizProgress',attempts.size+' of 5 correct');postHeight();
    });
  });
  // Keep new measurements in sync with the existing sliders and preset buttons.
  let raf=0;
  function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(update);}
  ids.forEach(id=>$(id).addEventListener('input',schedule));
  document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',schedule));
  $('resetTop').addEventListener('click',schedule);
  window.addEventListener('resize',schedule);
  if('ResizeObserver' in window)new ResizeObserver(postHeight).observe(document.body);
  window.VLSI_STUDY={stats,baseline:reference,weak:weakStats,latest:null,update};
  update();
})();
