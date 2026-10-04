"""Rebuild the 8 FluidSIM 4 line-substitution tables from ad_kb.dll.

The DLL builds them at start-up (code at 0x100034d5): for table k it starts from
the identity permutation and swaps pairs of 3-digit numbers read from two digit
strings whose pointers are stored at 0x1003d038+4k and 0x1003d058+4k.
The decode table is the inverse permutation.

usage: python3 tools/fluidsim_tables.py path/to/ad_kb.dll > src/fluid/ctTables.json
"""
import json, struct, sys
import pefile

pe = pefile.PE(sys.argv[1]); ib = pe.OPTIONAL_HEADER.ImageBase
u32 = lambda va: struct.unpack('<I', pe.get_data(va - ib, 4))[0]
def cstr(va):
    b = b''
    while True:
        c = pe.get_data(va - ib + len(b), 1)
        if c == b'\0': return b
        b += c
dec = []
for k in range(8):
    A, B = cstr(u32(0x1003d038 + 4 * k)), cstr(u32(0x1003d058 + 4 * k))
    t = list(range(256))
    for j in range(0, 768, 3):
        a, b = int(A[j:j + 3]), int(B[j:j + 3])
        t[a], t[b] = t[b], t[a]
    inv = [0] * 256
    for i, v in enumerate(t): inv[v] = i
    dec.append(inv)
print(json.dumps(dec, separators=(',', ':')))
