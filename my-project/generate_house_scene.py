"""
Generate HouseScene.jsx from the coloured SVG file.
Run: python generate_house_scene.py
"""
import re

SVG_PATH = r'C:\Users\DELL\Downloads\Animation Gridflex (1).svg'
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

# Parking-space (L7)
i_parking = add_path(6)

# Neighbourhood (L10-28)
neighbourhood_info = []
for ln0 in range(9, 28):
    if '<path' in lines[ln0]:
        idx = add_path(ln0)
        neighbourhood_info.append((idx, get_fill(lines[ln0]), get_stroke(lines[ln0])))

# Wire-car (L58)
i_wire_car = add_path(57)
wire_car_stroke = get_stroke(lines[57])

# Wire-neighbour (L61)
i_wire_neighbour = add_path(60)
wire_neighbour_stroke = get_stroke(lines[60])

# Wire-sub (L64)
i_wire_sub = add_path(63)
wire_sub_stroke = get_stroke(lines[63])

# Car (L67-80)
car_info = []
for ln0 in range(66, 80):
    if '<path' in lines[ln0]:
        idx = add_path(ln0)
        car_info.append((idx, get_fill(lines[ln0]), get_stroke(lines[ln0])))

# Substation (L83-91)
sub_info = []
for ln0 in range(82, 91):
    if '<path' in lines[ln0]:
        idx = add_path(ln0)
        sub_info.append((idx, get_fill(lines[ln0]), get_stroke(lines[ln0])))

# House (L97-106)
house_info = []
for ln0 in range(96, 106):
    if '<path' in lines[ln0]:
        idx = add_path(ln0)
        house_info.append((idx, get_fill(lines[ln0]), get_stroke(lines[ln0])))

# Window frame (L109)
i_win_frame = add_path(108)

# 8 window panes
window_pane_indices = []
for ln0 in [110, 113, 116, 119, 122, 125, 128, 131]:
    idx = add_path(ln0)
    window_pane_indices.append(idx)

# Neighbourhood window details
nbr_win_info = []
for ln0 in [134, 135, 138, 139, 142, 143, 146, 147]:
    if '<path' in lines[ln0]:
        idx = add_path(ln0)
        nbr_win_info.append((idx, get_fill(lines[ln0]), get_stroke(lines[ln0])))

print(f"Total paths: {len(all_paths)}")
print(f"Window panes at indices: {window_pane_indices}")

def p(idx, fill, stroke='none'):
    parts = [f'd={{PATHS[{idx}]}}', f'fill="{fill}"']
    if stroke != 'none':
        parts.append(f'stroke="{stroke}"')
    return '        <path ' + ' '.join(parts) + ' />'

paths_js = '\n'.join(f'  "{d}",' for d in all_paths)
nbr_jsx = '\n'.join(p(i, f, s) for i, f, s in neighbourhood_info)
car_jsx = '\n'.join('  ' + p(i, f, s) for i, f, s in car_info)
sub_jsx = '\n'.join(p(i, f, s) for i, f, s in sub_info)
house_jsx = '\n'.join(p(i, f, s) for i, f, s in house_info)
nbr_win_jsx = '\n'.join(p(i, f, s) for i, f, s in nbr_win_info)

wp_start = window_pane_indices[0]
wp_end = window_pane_indices[-1] + 1

component = f'''import './HouseScene.css'

/**
 * HouseScene — Animated SVG illustration for participant dashboards.
 * Generated from hand-coloured Vectornator SVG.
 *
 * Props:
 *   carPresent     (boolean) — car visible, more windows lit
 *   charging       (boolean) — car-to-charger wire fill pulses red
 *   gridOverloaded (boolean) — neighbour wire fill pulses red
 *
 * Window config:
 *   Edit WINDOWS_LIT arrays to choose which windows illuminate.
 *   Test indexes 0-7 visually to identify each window.
 */

const WINDOWS_LIT = {{{{
  carAbsent:  [2],
  carPresent: [0, 1, 2, 4, 5],
}}}}

const PATHS = [
{paths_js}
]

function HouseScene({{{{ carPresent = true, charging = true, gridOverloaded = false }}}}) {{{{
  const litWindows = carPresent ? WINDOWS_LIT.carPresent : WINDOWS_LIT.carAbsent

  return (
    <svg
      className="house-scene"
      viewBox="0 0 1765 1330"
      xmlns="http://www.w3.org/2000/svg"
      style={{{{{{{{ fillRule: 'nonzero', clipRule: 'evenodd', strokeLinecap: 'round', strokeLinejoin: 'round' }}}}}}}}
    >
      {{{{/* === Parking space (static) === */}}}}
      <path d={{{{PATHS[{i_parking}]}}}} fill="#2c521e" />

      {{{{/* === Neighbourhood (static, multi-coloured) === */}}}}
      <g>
{nbr_jsx}
      </g>

      {{{{/* === Wire: substation to house (always pulses yellow) === */}}}}
      <path
        d={{{{PATHS[{i_wire_sub}]}}}}
        className="house-scene__wire house-scene__wire--yellow-pulse"
        stroke="{wire_sub_stroke}"
      />

      {{{{/* === Wire: neighbour (pulses red when grid overloaded) === */}}}}
      <path
        d={{{{PATHS[{i_wire_neighbour}]}}}}
        className={{{{`house-scene__wire${{{{gridOverloaded ? ' house-scene__wire--red-pulse' : ''}}}}`}}}}
        fill="#000000"
        stroke="{wire_neighbour_stroke}"
      />

      {{{{/* === Wire: charger to car (always visible, pulses red when charging) === */}}}}
      <path
        d={{{{PATHS[{i_wire_car}]}}}}
        className={{{{`house-scene__wire${{{{charging ? ' house-scene__wire--red-pulse' : ''}}}}`}}}}
        fill="#000000"
        stroke="{wire_car_stroke}"
      />

      {{{{/* === Car (visible when carPresent, multi-coloured) === */}}}}
      {{{{carPresent && (
        <g>
{car_jsx}
        </g>
      )}}}}

      {{{{/* === Substation (static, multi-coloured) === */}}}}
      <g>
{sub_jsx}
      </g>

      {{{{/* === House structure (static, multi-coloured) === */}}}}
      <g>
{house_jsx}
      </g>

      {{{{/* === House windows === */}}}}
      {{{{/* Window frame (always black) */}}}}
      <path d={{{{PATHS[{i_win_frame}]}}}} fill="#000000" />

      {{{{/* Window panes 0-7 (toggle between black and warm yellow #fff0b1) */}}}}
      {{{{PATHS.slice({wp_start}, {wp_end}).map((d, i) => (
        <path
          key={{{{`window-${{{{i}}}}`}}}}
          d={{{{d}}}}
          data-window={{{{i}}}}
          className={{{{litWindows.includes(i) ? 'house-scene__window--lit' : ''}}}}
          fill={{{{litWindows.includes(i) ? '#fff0b1' : '#000000'}}}}
        />
      ))}}}}

      {{{{/* Neighbourhood window details (static) */}}}}
      <g>
{nbr_win_jsx}
      </g>
    </svg>
  )
}}}}

export default HouseScene
'''

with open(OUT_PATH, 'w', encoding='utf-8') as f:
    f.write(component)

print(f"Written HouseScene.jsx: {len(component)} chars")
