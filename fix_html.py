with open('preview_slots.html', 'r') as f:
    html = f.read()
html = html.replace('z-index: 10;', 'z-index: 5;')
html = html.replace('.slot-box {', '.slot-box {\n            z-index: 20;')
with open('preview_slots.html', 'w') as f:
    f.write(html)
