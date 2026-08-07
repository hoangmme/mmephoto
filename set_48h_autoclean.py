with open('server.js', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("function autoCleanOldSessions(maxAgeHours = 24)", "function autoCleanOldSessions(maxAgeHours = 48)")
code = code.replace("autoCleanOldSessions(24)", "autoCleanOldSessions(48)")
code = code.replace("parseInt(req.body.hours) || 24", "parseInt(req.body.hours) || 48")

# Also run autoCleanOldSessions(48) on startup after scanDiskSessions()
if "scanDiskSessions();\nautoCleanOldSessions(48);" not in code:
    code = code.replace("scanDiskSessions();", "scanDiskSessions();\nautoCleanOldSessions(48);")

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Successfully updated server.js to auto-clean QR & session photos older than 48 hours!")
