"""
Generate HouseScene.jsx from coloured SVG v2 (4 named window layers).
"""
import re

SVG_PATH = r'C:\Users\DELL\Downloads\Animation Gridflex (2).svg'
OUT_PATH = r'C:\Users\DELL\OneDrive\UCL_GridFlex\UCL_GridFlex_HCI\my-project\web\frontend\src\components\HouseScene.jsx'

with open(SVG_PATH, 'r') as f:
    lines = f.readlines()

def get_d(line):
    m = re.search(r'd="([^"]+)"', line)
    return m.group(1) if m else ''
def get_fill(line):
    m = re.search(r'fill="([^"]+)"', line)
    return m.group(1) if m else 'none'
def get_stroke(line):
    m = re.search(r'stroke="([^"]+)"', line)
    return m.group(1) if m else 'none'

all_paths = []
def add_path(line_idx):
    idx = len(all_paths)
    all_paths.append(get_d(lines[line_idx]))
    return idx

i_parking = add_path(6)
neighbourhood_info = []
for ln0 in range(9, 28):
    if '<path' in lines[ln0]:
        idx = add_path(ln0)
        neighbourhood_info.append((idx, get_fill(lines[ln0]), get_stroke(lines[ln0])))
i_wire_car = add_path(57); wire_car_stroke = get_stroke(lines[57])
i_wire_neighbour = add_path(60); wire_neighbour_stroke = get_stroke(lines[60])
i_wire_sub = add_path(63); wire_sub_stroke = get_stroke(lines[63])
car_info = []
for ln0 in range(66, 80):
    if '<path' in lines[ln0]:
        idx = add_path(ln0)
        car_info.append((idx, get_fill(lines[ln0]), get_stroke(lines[ln0])))
sub_info = []
for ln0 in range(82, 91):
    if '<path' in lines[ln0]:
        idx = add_path(ln0)
        sub_info.append((idx, get_fill(lines[ln0]), get_stroke(lines[ln0])))
house_info = []
for ln0 in range(96, 106):
    if '<path' in lines[ln0]:
        idx = add_path(ln0)
        house_info.append((idx, get_fill(lines[ln0]), get_stroke(lines[ln0])))

w4_frame=add_path(108); w4_yellow=add_path(110); w4_overlay=add_path(111)
w3_frame=add_path(115)
w3_details=[add_path(ln0) for ln0 in [117,120,123]]
w3_yellow=add_path(126); w3_overlay=add_path(127)
w2_frame=add_path(131)
w2_details=[add_path(ln0) for ln0 in [133,136,139,142,145]]
w2_yellow=add_path(148); w2_overlay=add_path(149)
w1_frame=add_path(153); w1_yellow=add_path(155); w1_overlay=add_path(156)

print(f"Total paths: {len(all_paths)}")

def p(idx, fill, stroke='none'):
    parts = [f'd={{PATHS[{idx}]}}', f'fill="{fill}"']
    if stroke != 'none': parts.append(f'stroke="{stroke}"')
    return '        <path ' + ' '.join(parts) + ' />'

paths_js = '\n'.join(f'  "{d}",' for d in all_paths)

o = []
a = o.append
a("import './HouseScene.css'")
a("")
a("/**")
a(" * HouseScene - Animated SVG for participant dashboards.")
a(" * 4 named window layers: 0=W1, 1=W2, 2=W3, 3=W4")
a(" */")
a("")
a("const WINDOWS_LIT = {")
a("  carAbsent:  [0],")
a("  carPresent: [0, 1, 2, 3],")
a("}")
a("")
a("const PATHS = [")
a(paths_js)
a("]")
a("")
a("function HouseScene({ carPresent = true, charging = true, gridOverloaded = false }) {")
a("  const effectiveCharging = carPresent && charging")
a("  const litWindows = carPresent ? WINDOWS_LIT.carPresent : WINDOWS_LIT.carAbsent")
a("")
a("  return (")
a("    <svg")
a('      className="house-scene"')
a('      viewBox="0 0 1765 1330"')
a('      xmlns="http://www.w3.org/2000/svg"')
a("      style={{ fillRule: 'nonzero', clipRule: 'evenodd', strokeLinecap: 'round', strokeLinejoin: 'round' }}")
a("    >")
a(f'      <path d={{PATHS[{i_parking}]}} fill="#2c521e" />')
a("      <g>")
for idx,fill,stroke in neighbourhood_info: a(p(idx,fill,stroke))
a("      </g>")
a("      <path")
a(f"        d={{PATHS[{i_wire_sub}]}}")
a("        className={`house-scene__wire ${gridOverloaded ? 'house-scene__wire--red-pulse' : 'house-scene__wire--yellow-pulse'}`}")
a(f'        stroke="{wire_sub_stroke}"')
a("      />")
a("      <path")
a(f"        d={{PATHS[{i_wire_neighbour}]}}")
a("        className={`house-scene__wire ${gridOverloaded ? 'house-scene__wire--red-pulse' : 'house-scene__wire--yellow-pulse'}`}")
a(f'        stroke="{wire_neighbour_stroke}"')
a("      />")
a("      <path")
a(f"        d={{PATHS[{i_wire_car}]}}")
a("        className={`house-scene__wire${effectiveCharging ? ' house-scene__wire--red-pulse' : ''}`}")
a('        fill="#000000"')
a(f'        stroke="{wire_car_stroke}"')
a("      />")
a("      {carPresent && (")
a("        <g>")
for idx,fill,stroke in car_info: a("  "+p(idx,fill,stroke))
a("        </g>")
a("      )}")
a("      <g>")
for idx,fill,stroke in sub_info: a(p(idx,fill,stroke))
a("      </g>")
a("      <g>")
for idx,fill,stroke in house_info: a(p(idx,fill,stroke))
a("      </g>")

# Window 4
a("      <g>")
a(f'        <path d={{PATHS[{w4_frame}]}} fill="#000000" />')
a(f'        <path d={{PATHS[{w4_yellow}]}} fill="#fff0b1" />')
a(f'        <path d={{PATHS[{w4_overlay}]}} fill={{litWindows.includes(3) ? "none" : "#000000"}} />')
a("      </g>")
# Window 3
a("      <g>")
a(f'        <path d={{PATHS[{w3_frame}]}} fill="#000000" />')
for di in w3_details: a(f'        <path d={{PATHS[{di}]}} fill="#000000" />')
a(f'        <path d={{PATHS[{w3_yellow}]}} fill="#fff0b1" />')
a(f'        <path d={{PATHS[{w3_overlay}]}} fill={{litWindows.includes(2) ? "none" : "#000000"}} />')
a("      </g>")
# Window 2
a("      <g>")
a(f'        <path d={{PATHS[{w2_frame}]}} fill="#000000" />')
for di in w2_details: a(f'        <path d={{PATHS[{di}]}} fill="#000000" />')
a(f'        <path d={{PATHS[{w2_yellow}]}} fill="#fff0b1" />')
a(f'        <path d={{PATHS[{w2_overlay}]}} fill={{litWindows.includes(1) ? "none" : "#000000"}} />')
a("      </g>")
# Window 1
a("      <g>")
a(f'        <path d={{PATHS[{w1_frame}]}} fill="#000000" />')
a(f'        <path d={{PATHS[{w1_yellow}]}} fill="#fff0b1" />')
a(f'        <path d={{PATHS[{w1_overlay}]}} fill={{litWindows.includes(0) ? "none" : "#000000"}} />')
a("      </g>")

a("    </svg>")
a("  )")
a("}")
a("")
a("export default HouseScene")
a("")

content = '\n'.join(o)
with open(OUT_PATH, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Written HouseScene.jsx: {len(content)} chars")
