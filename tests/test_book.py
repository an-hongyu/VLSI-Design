from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
PAGES=[ROOT/'index.html',ROOT/'chapters'/'01-cmos-inverter.html',ROOT/'labs'/'cmos-inverter.html']
class Links(HTMLParser):
 def __init__(self): super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag in ('a','link','iframe','script'):
   x=d.get('href') or d.get('src')
   if x:self.links.append(x)
for f in PAGES:
 assert f.exists(), f
 s=f.read_text(encoding='utf-8')
 assert '<!doctype html>' in s.lower()
 p=Links(); p.feed(s)
 for link in p.links:
  if link.startswith(('http:','https:','#','mailto:','data:')):continue
  assert (f.parent/link.split('#')[0]).exists(),f'{f}: broken link {link}'
lab=PAGES[-1].read_text(encoding='utf-8')
assert all(x in lab for x in ('id="inputPlot"','id="outputPlot"','id="vtcPlot"','function staticOut','function solveVM'))
assert 'id="frequency"' not in lab and 'id="capacitance"' not in lab
assert 'no externally connected load' in lab
print('PASS: HTML book and interactive CMOS inverter lab')
