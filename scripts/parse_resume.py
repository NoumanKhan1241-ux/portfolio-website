import zipfile,sys,xml.etree.ElementTree as ET
from pathlib import Path
p = Path('assets/Muhammad_Nouman_Khan_Resume.docx')
if not p.exists():
    print('DOCX not found', p)
    sys.exit(1)
with zipfile.ZipFile(p, 'r') as z:
    try:
        data = z.read('word/document.xml')
    except KeyError:
        print('document.xml not found in docx')
        sys.exit(1)
root = ET.fromstring(data)
ns = {'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
texts = []
for node in root.iter():
    if node.tag.endswith('}t'):
        texts.append(node.text or '')
text = '\n'.join(texts)
out = Path('assets/resume_text.txt')
out.write_text(text, encoding='utf-8')
print('wrote', out)
