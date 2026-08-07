with open('server.js', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("# Preserve original filename", "// Preserve original filename")

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Successfully replaced # comment with // in server.js!")
