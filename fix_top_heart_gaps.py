import re

with open('js/modules/pl-globals.js', 'r') as f:
    text = f.read()

# Add margin to w and h for heart slots so calcCover scales photo enough to cover top/bottom humps
def add_heart_margins(content):
    # A4 slots 0, 1, 2
    # slot_a4_0: w=350 -> 370, h=359 -> 375
    # slot_a4_1: w=350 -> 370, h=358 -> 375
    # slot_a4_2: w=394 -> 410, h=358 -> 375
    # A5 slots 10, 11, 12
    # slot_a5_10: w=324 -> 345, h=332 -> 350
    # slot_a5_11: w=325 -> 345, h=332 -> 350
    # slot_a5_12: w=370 -> 390, h=332 -> 350
    
    replacements = [
        ('slot_a4_0', 350.0, 359.0, 370.0, 380.0),
        ('slot_a4_1', 350.0, 358.0, 370.0, 380.0),
        ('slot_a4_2', 394.0, 358.0, 414.0, 380.0),
        ('slot_a5_10', 324.0, 332.0, 345.0, 352.0),
        ('slot_a5_11', 325.0, 332.0, 345.0, 352.0),
        ('slot_a5_12', 370.0, 332.0, 390.0, 352.0),
    ]
    
    for slot_id, old_w, old_h, new_w, new_h in replacements:
        pattern = rf'("id"\s*:\s*"{slot_id}".*?"w"\s*:\s*)([\d\.]+)(,\s*"h"\s*:\s*)([\d\.]+)'
        match = re.search(pattern, content, re.DOTALL)
        if match:
            print(f"Updating {slot_id}: w={old_w}->{new_w}, h={old_h}->{new_h}")
            content = content[:match.start(2)] + str(new_w) + match.group(3) + str(new_h) + content[match.end(4):]
            
    return content

new_text = add_heart_margins(text)

with open('js/modules/pl-globals.js', 'w') as f:
    f.write(new_text)

print("Successfully updated heart slot margins in pl-globals.js!")
