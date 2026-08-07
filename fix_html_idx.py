with open('preview_slots.html', 'r') as f:
    html = f.read()
html = html.replace('${idx}', '${s.id ? s.id.split(\'_\').pop() : idx}')
with open('preview_slots.html', 'w') as f:
    f.write(html)
