"""Compare control declarations (including HTML built in JS) to the dictionary."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
source = (root / 'index.html').read_text()
doc = (root / 'docs/FEATURES.md').read_text()
entries = {row.split('|')[1].strip() for row in doc.splitlines() if row.startswith('| ')}
# Inputs without visible text, plus labels supplied by event handlers / loops.
labels = {
    'openFile':'開く', 'mountRange':'〈板名〉の取り付け高さ（地から板の下端まで）',
    'stlRange':'作品の範囲', 'stlScale':'縮尺', 'stlName':'保存名', 'sceneSel':'置く場所',
    'whoIn':'名前', 'flipBtn':'材料の端を反対側にする', 'refClear':'中の物を ぜんぶ出す',
    'rw':'横', 'rd':'奥', 'rh':'高さ', 'dimStep5':'5mm刻みで調整する（外すと1mm刻み）',
    'splitK':'材料Bの取り方', 'holeSel':'ケーブルを通す穴（φ25）', 'handBtn':'くりぬく',
    'mCmt':'どうしてその大きさにしたのか', 'qCode':'タイプ番号'
}
families = {
    'data-t=':'加工しない','data-s="${i}"':'左上','data-s="${k}"':'⓪そうだん',
    'data-r=':'＋教科書','data-d=':'外はば','class="why"':'いま最大・なぜ？',
    'data-a=':'ある','data-go=':'この作品でつくる','data-end-flip=':'接地側に反転',
    'data-end-repair=':'接地側に反転'
}
missing = []
count = 0
for m in re.finditer(r'<(button|select|input|textarea|option|summary|h[234]|th|a)\b([^>]*)>', source):
    tag, attrs = m.groups()
    if tag == 'a' and 'href=' not in attrs:  # JavaScript also uses the less-than operator.
        continue
    identifier = re.search(r'\bid="([^"]+)"', attrs)
    body = source[m.end():].split('</'+tag+'>', 1)[0]
    literal = re.sub('<[^>]+>', ' ', body)
    literal = ' '.join(literal.split())
    if tag == 'option' and '${' in literal:
        name = '〈板名〉にあける' if 'にあける' in literal else '置く場所'
    elif literal == '${esc(Q.q)}':
        name = '家の中に、置き場所が決まっていなくて 散らかってしまう物がありますか？'
    else:
        name = labels.get(identifier[1]) if identifier else None
        if not name:
            name = next((v for k,v in families.items() if k in attrs),literal)
    count += 1
    if name not in entries:
        missing.append((source.count('\n',0,m.start())+1,tag,name[:70]))
for item in missing:
    print('Missing', *item)
print(f'{count} source declarations checked; {len(missing)} missing')
if missing:
    raise SystemExit(1)

# Names supplied to controls from the application's data, outside the markup.
def check_names(values, family):
    missing = sorted(set(values) - entries)
    if missing:
        raise SystemExit(f'{family}: missing {missing}')
    print(f'{family}: {len(set(values))} names checked')

quiz = source.split('const QUIZ=[')[1].split('];')[0]
check_names(re.findall(r"'([^']+)'", quiz), 'consultation questions and choices')
refs = source.split('const REF_KINDS={')[1].split('};')[0]
check_names(['＋'+v for v in re.findall(r"label:\s*'([^']+)'", refs)], 'reference buttons')
views = source.split('const VIEWS3={')[1].split('};')[0]
check_names(re.findall(r"name:'([^']+)'", views), 'drawing captions')
works = source.split('const WORKS =')[1].split('const REF_KINDS')[0]
check_names(re.findall(r"k:'[^']+',label:'([^']+)'", works), 'work dimension sliders')
