import re

with open('js/modules/pl-globals.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove clipPath property from slot_a5_10, slot_a5_12, slot_a4_0, slot_a4_2
# 1. slot_a5_10
code = re.sub(
    r'(\{\s*"id":\s*"slot_a5_10"[^}]*?),?\s*"clipPath":\s*"[^"]*"',
    r'\1',
    code,
    flags=re.DOTALL
)

# 2. slot_a5_12
code = re.sub(
    r'(\{\s*"id":\s*"slot_a5_12"[^}]*?),?\s*"clipPath":\s*"[^"]*"',
    r'\1',
    code,
    flags=re.DOTALL
)

# 3. slot_a4_0
code = re.sub(
    r'(\{\s*"id":\s*"slot_a4_0"[^}]*?),?\s*"clipPath":\s*"[^"]*"',
    r'\1',
    code,
    flags=re.DOTALL
)

# 4. slot_a4_2
code = re.sub(
    r'(\{\s*"id":\s*"slot_a4_2"[^}]*?),?\s*"clipPath":\s*"[^"]*"',
    r'\1',
    code,
    flags=re.DOTALL
)

with open('js/modules/pl-globals.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Successfully removed clipPath from slot_a5_10, slot_a5_12, slot_a4_0, slot_a4_2!")
