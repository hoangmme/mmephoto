import re
with open('js/modules/pl-globals.js', 'r') as f:
    text = f.read()

text = text.replace(']\n        "tags"', '],\n        "tags"')
with open('js/modules/pl-globals.js', 'w') as f:
    f.write(text)
