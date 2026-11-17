"""Smoke tests for VLSI Design and the three-case inverter lesson."""
from pathlib import Path
from html.parser import HTMLParser
from xml.etree import ElementTree as ET
import re
ROOT=Path(__file__).resolve().parents[1]
PAGES=[ROOT/'index.html',ROOT/'chapters'/'01-cmos-inverter.html',ROOT/'labs'/'cmos-inverter.html']
class Reader(HTMLParser):
    def __init__(self):super().__init__();self.links=[];self.ids=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if d.get('id'):self.ids.append(d['id'])
        if tag in ('a','link','iframe','script','img'):
            s=d.get('href') or d.get('src')
            if s:self.links.append(s)
for f in PAGES:
    assert f.exists(),f
    s=f.read_text(encoding='utf8')
    assert '<!doctype html>' in s.lower(),f
    p=Reader();p.feed(s)
    assert len(p.ids)==len(set(p.ids)),f'{f} duplicate IDs'
    for link in p.links:
        if link.startswith(('http:','https:','#','mailto:','data:')):continue
        url=link.split('#')[0].split('?')[0]
        assert (f.parent/url).exists(),f'{f} missing local resource {url}'
    print(f.name,'links:',len(p.links),'ids:',len(p.ids))
lab=PAGES[-1].read_text(encoding='utf8')
assert '<h1>Design of Inverters</h1>' in lab
assert len(re.findall(r'<button\s+[^>]*data-case=',lab))==3
assert all(x in lab for x in ['id="vtcChart"','id="delayChart"','id="transitionChart"','id="caseCards"','design-of-inverters.js'])
assert 'type="range"' not in lab and 'quizProgress' not in lab
assert 'id="noiseChart"' not in lab and 'LOW and HIGH Noise Margins' not in lab
assert '(a) Propagation delay' in lab and '(b) Output rise/fall times' in lab
assert 'No external output load' in lab or 'No external output load'.lower() in lab.lower() or 'no external output load' in lab.lower()
assert (ROOT/'labs'/'cmos-inverter-advanced.html').exists()
chapter=PAGES[1].read_text(encoding='utf8')
home=PAGES[0].read_text(encoding='utf8')
assert '1.6 Worked example' in chapter and '1.8 Interactive lab' in chapter
assert 'data-copy=' in chapter and '<math display="block">' in chapter
assert 'src="../labs/cmos-inverter.html"' in chapter
assert 'src="labs/cmos-inverter.html"' in home
assert 'id="live-lab"' in home
assert 'Design of Inverters' in chapter and 'Design of Inverters' in home
figs=list((ROOT/'assets'/'figures').glob('*.svg'))
assert len(figs)==5
for fig in figs:ET.parse(fig)
ns={'svg':'http://www.w3.org/2000/svg'}
for name,count in [('fig-1-cmos-schematic.svg',2),('fig-2-pull-up-pull-down.svg',4)]:
    root=ET.parse(ROOT/'assets'/'figures'/name).getroot()
    mos=root.findall('.//svg:g[@data-device]',ns)
    assert len(mos)==count,(name,len(mos))
    assert sum(x.get('data-device')=='pmos' for x in mos)==count//2
    assert sum(x.get('data-device')=='nmos' for x in mos)==count//2
    for m in mos:
        bubbles=m.findall('./svg:circle[@class="gate-bubble"]',ns)
        assert len(bubbles)==(1 if m.get('data-device')=='pmos' else 0)
        assert len(m.findall('./svg:path[@class="mos-gate"]',ns))==1
        assert len(m.findall('./svg:path[@class="mos-channel"]',ns))==1
        assert len(m.findall('./svg:path[@class="mos-terminals"]',ns))==1
for parent in [chapter,home]:assert 'vlsi-lab-height' in parent
print('PASS: three buttons, one VTC and two textbook timing charts, accessible links, textbook schematics and responsive embed')