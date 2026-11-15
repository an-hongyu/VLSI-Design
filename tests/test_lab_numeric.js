'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(require('path').join(__dirname,'..','labs','cmos-inverter.html'),'utf8');
const js=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const extra=fs.readFileSync(require('path').join(__dirname,'..','labs','mismatch-exercise.js'),'utf8');
const els=new Map();
const defaults={wp:1.8,wn:.9,vdd:1.8,mn:200,mp:100,vtn:.4,vtp:.4,length:.18};
for(const [k,v] of Object.entries(defaults))els.set(k,{value:v,textContent:'',addEventListener(){},getBoundingClientRect(){return {width:0,height:0};}});
function E(id){if(!els.has(id))els.set(id,{id,textContent:'',value:0,addEventListener(){},getBoundingClientRect(){return {width:0,height:0}},querySelectorAll(){return []}});return els.get(id);}
const body= {getBoundingClientRect(){return {width:0,height:0}}};
const ctx={console,Math,Number,Object,Array,Set,Map,document:{getElementById:E,querySelectorAll(){return []},addEventListener(){},body,documentElement:{scrollHeight:1900}},window:{devicePixelRatio:1,addEventListener(){},parent:null},ResizeObserver:undefined,requestAnimationFrame:fn=>{fn();return 1},cancelAnimationFrame(){}};
ctx.window.window=ctx.window;ctx.window.parent=ctx.window;
vm.createContext(ctx);
vm.runInContext(js,ctx,{filename:'inline-lab.js'});
vm.runInContext(extra,ctx,{filename:'mismatch-exercise.js'});
const obj=ctx.window.VLSI_STUDY;
const inline=ctx.window.VLSI_LAB;
for(const [tag,pp] of [['balanced',defaults],['weak',{...defaults,wp:.9}],['strong',{...defaults,wp:2.7}]]){
 const m=inline.simulate({...pp}).waveTiming;
 assert(Number.isFinite(m.fall.delayPs)&&Number.isFinite(m.rise.delayPs),tag+' has finite measured ramp delay');
 assert(m.fall.delayPs>0 && m.rise.delayPs>0,tag+' has positive 50%-to-50% delays');
 console.log('INLINE '+tag+' tPHL='+m.fall.delayPs.toFixed(3)+' ps, tPLH='+m.rise.delayPs.toFixed(3)+' ps');
}

assert(obj&&obj.latest);
console.log('DEFAULT',JSON.stringify(obj.latest));
assert(Math.abs(obj.latest.vm-.9)<.00001);
assert(Math.abs(obj.latest.nml-obj.latest.nmh)<.001);
assert(Math.abs(obj.latest.tplh-obj.latest.tphl)<.001);
assert(Math.abs(ctx.window.VLSI_LAB.simulate({...defaults,wp:.9}).vm-.81421)<.002);
assert(obj.weak.nml<obj.baseline.nml);
assert(obj.weak.nmh>obj.baseline.nmh);
assert(obj.weak.tplh>obj.baseline.tplh);
assert(obj.weak.tphl<obj.baseline.tphl);
E('wp').value=.9;obj.update();console.log('WEAK',JSON.stringify(obj.latest));
assert(Math.abs(obj.latest.nml-.654)<.005);
E('wp').value=2.7;obj.update();console.log('STRONG',JSON.stringify(obj.latest));
assert(obj.latest.vm>.94);
assert(obj.latest.nmh<obj.baseline.nmh);
const three=[inline.simulate({...defaults}),inline.simulate({...defaults,wp:.9}),inline.simulate({...defaults,wp:2.7})];
assert(three[1].waveTiming.rise.delayPs>three[0].waveTiming.rise.delayPs, 'weak PMOS increases tPLH in the on-plot finite slew experiment');
assert(three[2].waveTiming.fall.delayPs>three[0].waveTiming.fall.delayPs, 'strong PMOS increases tPHL in the on-plot finite slew experiment');
assert(three.every(p=>p.wave.length===1601), 'all waveforms sampled on fixed timebase');
console.log('PASS: three sizing scenarios, matched 4A/4B 50%-crossing cursors and noise margin/delay behavior');
