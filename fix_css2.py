import sys

filepath = '/Users/hoji/Documents/code/mmephoto/print-layout.css'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """.pl-step-mode-1 #panelLeft,
.pl-step-mode-4 #panelLeft {
  display: none !important;
}"""

new_logic = """.pl-step-mode-1 #panelLeft {
  display: none !important;
}"""

content = content.replace(old_logic, new_logic)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Reverted CSS for step 4 in print-layout.css")
