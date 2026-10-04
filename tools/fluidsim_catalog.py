"""Build the FluidSIM component catalog from installed FluidSIM P/H 4 folders.

For every component class (and valve configuration) it records: description,
simulation model name, size, ports (kind, position relative to the component's
top-left corner, label) and the symbol drawing stored in the file (SYM block).
Library files (sym/**) are the primary source; example circuits add the older
classes that the library no longer contains (Ag1, tank1, dbv, ...).

usage: python3 fluidsim_catalog.py tables.json ROOT out.json
  ROOT contains fl_sim_p4.es and fl_sim_h4.es
"""
import sys, glob, os, json, re, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fluidsim_ct as ct

PORT_CLASSES = ('PConnection', 'HConnection', 'EConnection', 'UEConnection', 'UMConnection', 'DConnection',
                'GConnection', 'UPEConnection', 'UPAConnection', 'PTriconnection', 'HTriconnection',
                'ETriconnection', 'DTriconnection')
SKIP = ('text', 'BITMAP', 'RTF_TEXT', 'GRAPHRECT', 'group', 'DIAGRAM', 'PART_LIST', 'DXF', 'CAD_RECT', 'SLIDER')
OBJ = re.compile(r'^(\S+) O(\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+)((?: -?\d+)*)$')

def parse(path):
    head, data = ct.read_ct(open(path, 'rb').read())
    H = [h.decode('latin-1') for h in head]
    txt = ct.body_text(data) if data is not None else ''
    objs = []; byid = {}; sym = {}; sec = 'pre'; cur = None; cs = None
    for line in txt.split('\n'):
        if sec == 'pre':
            if line.strip() == 'END_FSPREVIEW': sec = 'obj'
            continue
        if sec == 'obj':
            if line == 'ENDCT': sec = 'done'; continue
            m = OBJ.match(line)
            if m:
                cur = dict(cls=m.group(1), id=int(m.group(2)), box=[int(m.group(i)) for i in (3, 4, 5, 6)],
                           rot=int(m.group(7)), props={}, fields={}, ports=[])
                objs.append(cur); byid[cur['id']] = cur; continue
            g = re.match(r'^gate\d+ # (\d+) (\d+)$', line)
            if g and int(g.group(1)) in byid: byid[int(g.group(1))]['ports'].append(int(g.group(2))); continue
            if not cur: continue
            s = re.match(r'^ S (\S+) (\S+) ?(.*)$', line)
            if s: cur['props'][s.group(1)] = s.group(3); continue
            f = re.match(r'^ F (\S+) (\S+) (\S+) ?(.*)$', line)
            if f: cur['fields'].setdefault(f.group(1), {})[f.group(2)] = f.group(4)
        elif sec == 'done' and line == 'BEGINSYM': sec = 'sym'
        elif sec == 'sym':
            if line == 'ENDSYM': break
            m = re.match(r'^SYM (\d+)$', line)
            if m: cs = int(m.group(1)); sym[cs] = []; continue
            if cs is not None and line.strip(): sym[cs].append(line.strip())
    return H, objs, byid, sym

def main(tables, root, out):
    ct.load_tables(tables)
    src = []
    for prog, base in (('P', 'fl_sim_p4.es'), ('H', 'fl_sim_h4.es')):
        for p in sorted(glob.glob(os.path.join(root, base, 'sym', '**', '*.ct'), recursive=True)):
            src.append((prog, os.path.join(root, base, 'sym'), p, False))
    for prog, base in (('P', 'fl_sim_p4.es'), ('H', 'fl_sim_h4.es')):
        for p in sorted(glob.glob(os.path.join(root, base, '**', '*.ct'), recursive=True)):
            if '/sym/' not in p: src.append((prog, os.path.join(root, base), p, True))
    cat = {}; errors = collections.Counter(); n = 0
    for prog, base, path, example in src:
        rel = os.path.relpath(path, base)
        domain = ('pneu' if prog == 'P' else 'hyd') + '-example' if example else rel.split('/')[0]
        try: H, objs, byid, sym = parse(path)
        except Exception as e: errors[type(e).__name__] += 1; continue
        n += 1
        objlines = [h[4:] for h in H if h.startswith('OBJ ')]
        descr = next((h[7:] for h in H if h.startswith('DESCR1 ')), '')
        for o in objs:
            if o['cls'] in PORT_CLASSES or o['cls'] in SKIP: continue
            if example and any(v['cls'] == o['cls'] for v in cat.values()): continue
            cfg = next((l[len(o['cls']) + 1:] for l in objlines if l.split(' ')[0] == o['cls']), '')
            k = next((i for i, l in enumerate(objlines) if l.split(' ')[0] == o['cls'] and l[len(o['cls']) + 1:] == cfg), None)
            key = o['cls'] + ('|' + cfg if cfg else '')
            x0, y0, x1, y1 = o['box']
            ports = []
            for pid in o['ports']:
                p = byid.get(pid)
                if not p or p['cls'] not in PORT_CLASSES: continue
                ports.append(dict(kind=p['cls'], x=(p['box'][0] + p['box'][2]) // 2 - x0, y=(p['box'][1] + p['box'][3]) // 2 - y0,
                                  label=p['props'].get('description', ''), ex=p['props'].get('ex_type', '')))
            e = cat.setdefault(key, dict(cls=o['cls'], config=cfg, programs=[], domain=domain, files=[],
                                         description=o['props'].get('description') or descr, model=o['props'].get('MoName', ''),
                                         size=[x1 - x0, y1 - y0], ports=ports, sym=sym.get(k, []) if k is not None else [],
                                         props={kk: v for kk, v in o['props'].items() if not kk.endswith('_FEST') and not kk.startswith('dxf_prim')},
                                         fields=o['fields']))
            if prog not in e['programs']: e['programs'].append(prog)
            if len(e['files']) < 5: e['files'].append(prog + ':' + rel)
    json.dump(cat, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
    dom = collections.Counter(v['domain'] for v in cat.values())
    print('files parsed', n, 'errors', dict(errors), 'catalog entries', len(cat), dict(dom), 'bytes', os.path.getsize(out))

if __name__ == '__main__':
    main(*sys.argv[1:4])
