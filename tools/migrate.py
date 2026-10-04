"""One-off migration: single-file htm app -> TSX modules.

Reads the inline <script> of the old single-file app, converts every html`...`
(htm) template into JSX, splits top-level declarations into modules and writes
import/export lines between them.
"""
import re, sys, json, os

SRC = sys.argv[1]
OUT = sys.argv[2]

# ---------------------------------------------------------------- lexing helpers
REGEX_PREV = set('(,=:[!&|?{};+-*%<>~^')

def skip_string(s, i):
    q = s[i]; i += 1
    while s[i] != q:
        if s[i] == '\\': i += 1
        i += 1
    return i + 1

def skip_regex(s, i):
    i += 1; in_cls = False
    while True:
        c = s[i]
        if c == '\\': i += 2; continue
        if in_cls:
            if c == ']': in_cls = False
        elif c == '[': in_cls = True
        elif c == '/': break
        i += 1
    i += 1
    while i < len(s) and s[i].isalpha(): i += 1
    return i

def prev_sig(s, i):
    j = i - 1
    while j >= 0 and s[j] in ' \t\n\r': j -= 1
    return s[j] if j >= 0 else ''

def prev_word(s, i):
    j = i - 1
    while j >= 0 and s[j] in ' \t\n\r': j -= 1
    k = j
    while k >= 0 and (s[k].isalnum() or s[k] == '_'): k -= 1
    return s[k + 1:j + 1]

def skip_template(s, i):
    """s[i] == '`'; returns (end_index_after_closing_backtick, parts, exprs)."""
    i += 1; parts = []; exprs = []; buf = ''
    while s[i] != '`':
        if s[i] == '\\':
            buf += s[i:i + 2]; i += 2; continue
        if s[i] == '$' and s[i + 1] == '{':
            j = skip_expr(s, i + 2)
            parts.append(buf); buf = ''
            exprs.append(s[i + 2:j]); i = j + 1; continue
        buf += s[i]; i += 1
    parts.append(buf)
    return i + 1, parts, exprs

def skip_expr(s, i):
    """from just after '${' or '{' ... returns index of the matching '}'."""
    depth = 0
    while True:
        c = s[i]
        if c in '\'"': i = skip_string(s, i); continue
        if c == '`': i = skip_template(s, i)[0]; continue
        if c == '/' and s[i + 1] == '/':
            i = s.index('\n', i); continue
        if c == '/' and s[i + 1] == '*':
            i = s.index('*/', i) + 2; continue
        if c == '/' and (prev_sig(s, i) in REGEX_PREV or prev_word(s, i) in ('return', 'typeof')):
            i = skip_regex(s, i); continue
        if c in '{([': depth += 1
        elif c in '})]':
            if depth == 0: return i
            depth -= 1
        i += 1

# ---------------------------------------------------------------- htm -> jsx
def camel(a):
    if a.startswith('aria-') or a.startswith('data-'): return a
    p = a.split('-'); return p[0] + ''.join(x[:1].upper() + x[1:] for x in p[1:])

RENAME = {'class': 'className', 'for': 'htmlFor', 'spellcheck': 'spellCheck'}
PH = '\x00%d\x00'

def convert_template(parts, exprs):
    exprs = [convert_js(e) for e in exprs]
    m = ''
    for k, p in enumerate(parts):
        m += p
        if k < len(exprs): m += PH % k
    root1 = single_root(m)
    # tag names
    m = re.sub(r'<\x00(\d+)\x00', lambda g: '<' + exprs[int(g.group(1))].strip(), m)
    m = re.sub(r'</\x00(\d+)\x00>', lambda g: '</' + exprs[int(g.group(1))].strip() + '>', m)
    # inside tags: attributes, spreads
    def tag(g):
        t = g.group(0)
        t = re.sub(r'\.\.\.\x00(\d+)\x00', lambda h: '{...' + exprs[int(h.group(1))] + '}', t)
        t = re.sub(r'(\s)([A-Za-z_:][-A-Za-z0-9_:]*)(?==)', lambda h: h.group(1) + RENAME.get(h.group(2), camel(h.group(2))), t)
        t = re.sub(r'=\x00(\d+)\x00', lambda h: '={' + exprs[int(h.group(1))] + '}', t)
        return t
    m = re.sub(r'<[A-Za-z][^<>]*?/?>', tag, m)
    # children
    m = re.sub(r'\x00(\d+)\x00', lambda g: '{' + exprs[int(g.group(1))] + '}', m)
    if root1: return '(' + m.strip() + ')'
    return '(<>' + m + '</>)'

def single_root(m):
    s = m.strip()
    if not s.startswith('<') or s.startswith('<>'): return False
    depth = 0; i = 0; roots = 0
    while i < len(s):
        if s[i] == '\x00':
            j = s.index('\x00', i + 1); i = j + 1
            if depth == 0: return False
            continue
        if s[i] == '<':
            close = s[i + 1] == '/'
            j = i
            while s[j] != '>':
                if s[j] in '"\'': j = skip_string(s, j) - 1
                j += 1
            selfc = s[j - 1] == '/'
            if close: depth -= 1
            elif selfc:
                if depth == 0: roots += 1
            else:
                if depth == 0: roots += 1
                depth += 1
            i = j + 1; continue
        if depth == 0 and not s[i].isspace(): return False
        i += 1
    return roots == 1

def convert_js(s):
    out = ''; i = 0
    while i < len(s):
        c = s[i]
        if s.startswith('html`', i) and (i == 0 or not (s[i - 1].isalnum() or s[i - 1] in '_$.')):
            j, parts, exprs = skip_template(s, i + 4)
            out += convert_template(parts, exprs); i = j; continue
        if c in '\'"':
            j = skip_string(s, i); out += s[i:j]; i = j; continue
        if c == '`':
            j, parts, exprs = skip_template(s, i)
            t = '`'
            for k, p in enumerate(parts):
                t += p
                if k < len(exprs): t += '${' + convert_js(exprs[k]) + '}'
            out += t + '`'; i = j; continue
        if c == '/' and i + 1 < len(s) and s[i + 1] == '/':
            j = s.index('\n', i); out += s[i:j]; i = j; continue
        if c == '/' and i + 1 < len(s) and s[i + 1] == '*':
            j = s.index('*/', i) + 2; out += s[i:j]; i = j; continue
        if c == '/' and (prev_sig(s, i) in REGEX_PREV or prev_word(s, i) in ('return', 'typeof')):
            j = skip_regex(s, i); out += s[i:j]; i = j; continue
        out += c; i += 1
    return out


def strip_code(s):
    """blank out strings, comments, regexes and template text; keep ${} expressions."""
    out = []; i = 0
    while i < len(s):
        c = s[i]
        if c in '\'"':
            j = skip_string(s, i); out.append(' '); i = j; continue
        if c == '`':
            j, parts, exprs = skip_template(s, i)
            out.append(' ' + ' '.join(strip_code(e) for e in exprs) + ' '); i = j; continue
        if c == '/' and i + 1 < len(s) and s[i + 1] == '/':
            j = s.find('\n', i); j = len(s) if j < 0 else j; out.append(' '); i = j; continue
        if c == '/' and i + 1 < len(s) and s[i + 1] == '*':
            j = s.index('*/', i) + 2; out.append(' '); i = j; continue
        if c == '/' and (prev_sig(s, i) in REGEX_PREV or prev_word(s, i) in ('return', 'typeof')) and not (i + 1 < len(s) and s[i+1] == '>'):
            j = skip_regex(s, i); out.append(' '); i = j; continue
        out.append(c); i += 1
    return ''.join(out)

# ---------------------------------------------------------------- top-level split
def top_statements(s):
    stmts = []; i = 0; start = 0; depth = 0
    while i < len(s):
        c = s[i]
        if c in '\'"': i = skip_string(s, i); continue
        if c == '`': i = skip_template(s, i)[0]; continue
        if c == '/' and s[i + 1] == '/': i = s.index('\n', i); continue
        if c == '/' and s[i + 1] == '*': i = s.index('*/', i) + 2; continue
        if c == '/' and (prev_sig(s, i) in REGEX_PREV or prev_word(s, i) in ('return', 'typeof')):
            i = skip_regex(s, i); continue
        if c in '{([': depth += 1
        elif c in '})]': depth -= 1
        elif c == '\n' and depth == 0:
            rest = s[i + 1:]
            if re.match(r'(const |let |function |class |\[|Object\.|DEFS\.|ReactDOM|/\*)', rest):
                stmts.append(s[start:i + 1]); start = i + 1
        i += 1
    stmts.append(s[start:])
    return [x for x in stmts if x.strip()]

def names_of(st):
    st2 = re.sub(r'^\s*/\*.*?\*/\s*', '', st, flags=re.S)
    m = re.match(r'\s*(?:const|let|function|class)\s+(.+)', st2, flags=re.S)
    if not m: return []
    head = m.group(1)
    if re.match(r'\{', head):  # destructuring
        return []
    names = [re.match(r'([A-Za-z_$][\w$]*)', head).group(1)]
    # multi-declarations "const G=15, W=150, H=110;"
    if st2.lstrip().startswith(('const', 'let')):
        decl = head.split(';')[0]
        depth = 0; cur = ''
        for ch in decl:
            if ch in '{([': depth += 1
            elif ch in '})]': depth -= 1
            if ch == ',' and depth == 0:
                mm = re.match(r'\s*([A-Za-z_$][\w$]*)\s*=', cur.split(',')[-1] if False else '')
                cur += ch
                continue
            cur += ch
        for seg in re.split(r',\s*(?=[A-Za-z_$][\w$]*\s*=)', decl):
            mm = re.match(r'\s*([A-Za-z_$][\w$]*)\s*=', seg)
            if mm and mm.group(1) not in names: names.append(mm.group(1))
    return names

MODULES = {
    'cad/format.ts': ['CADU', 'L2', 'CAD_PARTS', 'CAD_WIRE', 'CAD_WIRE_CODE', 'CAD_JUNCTION', 'TYPE_TO_CAD', 'CAD_DEFAULT_HEADER', 'CAD_DEFAULT_FOOTER', 'REC', 'recStr', 'XI', 'parseCad', 'writeCad', 'latin1', 'crc32', 'zipOne'],
    'cad/catalog.ts': ['CAD_CATALOG_NAMES', 'RAW_NAMES', 'RAW_CAT', 'rawTerminals'],
    'examples/index.ts': ['CAD_SAMPLE', 'CAD_CATALOG', 'CAD_CATALOG2', 'CAD_CATALOG3', 'CAD_CATALOG4', 'CAD_CATALOG5', 'CAD_TEST6', 'CAD_TEST7', 'timerExample', 'threePhaseExample', 'test7Example', 'test6Example', 'catalogExample', 'catalog2Example', 'catalog3Example', 'catalog4Example', 'catalog5Example', 'cadExample'],
    'model/parts.ts': ['G', 'TWO', 'C2', 'BOX2', 'DEFS', 'ACTS', 'FORMS', 'NAMED', 'contactDef', 'SHOW_CONTACTS', 'FAMS', 'polesDef', 'famType', 'VARIANTS', 'PALETTE_HIDE', 'NC_TYPES', 'LAMP'],
    'model/geometry.ts': ['rotV', 'pinPos', 'pinsOf', 'key', 'elbow', 'onSeg', 'UF', 'wireNet'],
    'sim/solve.ts': ['timerActs', 'actuated', 'pathOn', 'closed', 'PH', 'solve'],
    'i18n/strings.ts': ['I18N'],
    'i18n/descriptions.ts': ['DESC', 'ACT_DESC', 'FORM_DESC', 'pdesc', 'pname'],
    'ui/symbols.tsx': ['fit', 'Face', 'Ln', 'Pole', 'Poles', 'Glyph', 'Contact', 'Sym', 'ICON_VB', 'Icon', 'Preview', 'About'],
    'ui/App.tsx': ['STORE', 'initLang', 'loadSaved', 'uid', 'nid', 'safeName', 'App'],
}
OWNER = {n: m for m, ns in MODULES.items() for n in ns}

html = open(SRC, encoding='utf-8').read()
script = html.split('<script>\n', 1)[1].rsplit('</script>', 1)[0]
style = html.split('<style>', 1)[1].split('</style>', 1)[0]
css_links = re.findall(r'<link[^>]+>', html.split('<style>')[0])

stmts = top_statements(script)
mods = {m: [] for m in MODULES}; exports = {m: [] for m in MODULES}
cur = None; unassigned = []; pending = ''
for st in stmts:
    if st.lstrip().startswith(('const {useState', 'const html=', 'ReactDOM.')): continue
    if re.fullmatch(r'\s*/\*.*?\*/\s*', st, flags=re.S):
        pending += st; continue
    st = pending + st; pending = ''
    ns = names_of(st)
    if ns:
        m = OWNER.get(ns[0])
        if m is None:
            unassigned.append(ns); continue
        cur = m; exports[m] += ns
    if cur is None: unassigned.append(st[:60]); continue
    mods[cur].append(st)
if unassigned:
    print('UNASSIGNED', unassigned); sys.exit(1)

all_exports = {n: m for m, ns in exports.items() for n in ns}
for m, sts in mods.items():
    orig = ''.join(sts)
    body = convert_js(orig)
    # export every top-level declaration
    body = re.sub(r'(^|\n)(const|let|function|class) ', r'\1export \2 ', body)
    scan = strip_code(orig).replace('...', ' ')
    scan = re.sub(r'(?<=[{,])\s*[A-Za-z_$][\w$]*\s*:(?!:)', ' ', scan)
    used = set(re.findall(r'(?<![\w$.])([A-Za-z_$][\w$]*)', scan))
    imports = {}
    for n in sorted(used):
        om = all_exports.get(n)
        if om and om != m: imports.setdefault(om, []).append(n)
    lines = []
    if m.endswith('.tsx') or 'html' in body:
        hooks = [h for h in ('useState', 'useEffect', 'useRef', 'useMemo') if h in body]
        if hooks: lines.append('import { %s } from "react";' % ', '.join(hooks))
    for om, ns in sorted(imports.items()):
        rel = os.path.relpath(os.path.join(OUT, om), os.path.dirname(os.path.join(OUT, m))).replace('\\', '/')
        rel = re.sub(r'\.tsx?$', '', rel)
        if not rel.startswith('.'): rel = './' + rel
        lines.append('import { %s } from "%s";' % (', '.join(ns), rel))
    path = os.path.join(OUT, m)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write('// @ts-nocheck\n' + '\n'.join(lines) + '\n\n' + body.strip() + '\n')
    print(f'{m:24s} {len(body):7d} chars  exports {len(exports[m]):3d}  imports from {len(imports)} modules')
open(os.path.join(OUT, 'styles.css'), 'w', encoding='utf-8').write(style.strip() + '\n')
json.dump(css_links, open(os.path.join(OUT, '_links.json'), 'w'))
