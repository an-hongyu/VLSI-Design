'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm'),path=require('path');
const script=fs.readFileSync(path.join(__dirname,'..','labs','design-of-inverters.js'),'utf8');
const els=new Map(),buttons=['weak','balanced','strong'].map(id=>({dataset:{case:id},attrs:{},addEventListener(){},setAttribute(k,v){this.attrs[k]=v;}}));
const E=id=>{if(!els.has(id))els.set(id,{textContent:'',innerHTML:''});return els.get(id);};
const doc={getElementById:E,querySelectorAll(sel){return sel==='button[data-case]'?buttons:[]},documentElement:{scrollHeight:1500},body:{}};
const wnd={addEventListener(){},parent:null,location:{origin:'https://an-hongyu.github.io'}};wnd.parent=wnd;
const ctx={console,document:doc,window:wnd,Math,Array,Number,Object,ResizeObserver:undefined};
vm.createContext(ctx);vm.runInContext(script,ctx,{filename:'design-of-inverters.js'});
const lab=wnd.VLSI_DESIGN;assert(lab&&lab.cases.length===3);
const cases=lab.cases,weak=cases[0],bal=cases[1],strong=cases[2];
function near(val,expected,tol=.005){assert(Math.abs(val-expected)<tol,val+' not near '+expected);}
near(weak.r,.5);near(bal.r,1);near(strong.r,1.5);
near(weak.vm,.8142,.002);near(bal.vm,.9,.002);near(strong.vm,.9505,.002);
near(weak.nml,.654,.005);near(bal.nml,.765,.005);near(strong.nml,.832,.005);
near(weak.nmh,.879,.005);near(bal.nmh,.765,.005);near(strong.nmh,.699,.005);
near(weak.tplh,4.37,.05);near(bal.tplh,2.90,.05);near(strong.tplh,2.41,.05);
near(weak.tphl,2.18,.05);near(bal.tphl,2.90,.05);near(strong.tphl,3.62,.05);
for(const c of cases){
  lab.select(c.id);
  assert(E('vtcChart').innerHTML.includes('<svg'));
  assert(E('noiseChart').innerHTML.includes('<svg'));
  assert(E('fallChart').innerHTML.includes('<svg'));
  assert(E('riseChart').innerHTML.includes('<svg'));
  assert(E('caseCards').innerHTML.includes('100 × '+c.wp.toFixed(2)));
  assert(E('caseCards').innerHTML.match(/<article/g).length===3);
  assert(buttons.filter(b=>b.attrs['aria-pressed']==='true').length===1);
  console.log(c.id,JSON.stringify({r:c.r,vm:c.vm,nml:c.nml,nmh:c.nmh,tplh:c.tplh,tphl:c.tphl}));
}
assert(weak.vm<bal.vm&&bal.vm<strong.vm);
assert(weak.nml<bal.nml&&strong.nmh<bal.nmh);
assert(weak.tplh>bal.tplh&&strong.tphl>bal.tphl);
console.log('PASS: three physics-based scenarios, equations, plotted traces, and button selection')