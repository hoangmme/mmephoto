import json
import os

filepath = 'data/templates.json'
if os.path.exists(filepath):
    with open(filepath, 'r') as f:
        templates = json.load(f)
    
    # Filter out a4-1 and a5-1
    templates = [t for t in templates if t['id'] not in ('a4-1', 'a5-1')]
    
    with open(filepath, 'w') as f:
        json.dump(templates, f, indent=2)
    print("Cleaned templates.json")
