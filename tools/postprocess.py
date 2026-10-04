"""Second half of the migration: wire raw sample files and the catalog JSON."""
import re
p='src/examples/index.ts';s=open(p).read()
names=re.findall(r'__RAW__\("([^"]+)"\)',s)
imps=''.join('import %s from "./files/%s.cad?raw";\n'%('raw_'+n.replace('-','_'),n) for n in names)
s=re.sub(r'__RAW__\("([^"]+)"\)',lambda m:'raw_'+m.group(1).replace('-','_'),s)
s=s.replace('// @ts-nocheck\n','// @ts-nocheck\n'+imps,1);open(p,'w').write(s)
p='src/cad/catalog.ts';s=open(p).read()
s=s.replace('__CATALOG_JSON__','catalogNames as Record<string,string>').replace('// @ts-nocheck\n','// @ts-nocheck\nimport catalogNames from "./catalog.json";\n',1);open(p,'w').write(s)
p='src/cad/format.ts';s=open(p).read()
s=s.replace('import { pinsOf } from "../model/geometry";\n','');open(p,'w').write(s)
