script_path = '/Users/hoji/Documents/code/mmephotoscript/sync_client.py'

with open(script_path, 'r', encoding='utf-8') as f:
    code = f.read()

old_processed_logic = """processed_files = set()
processed_files_lock = threading.Lock()"""

new_processed_logic = """PROCESSED_DB_FILE = os.path.join(BASE_DIR, "processed_files.json")

def load_processed_files():
    if os.path.exists(PROCESSED_DB_FILE):
        try:
            with open(PROCESSED_DB_FILE, 'r', encoding='utf-8') as f:
                return set(json.load(f))
        except Exception:
            return set()
    return set()

def save_processed_files():
    try:
        with open(PROCESSED_DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(list(processed_files), f, indent=2)
    except Exception as e:
        print(f"[CẢNH BÁO] Không thể lưu processed_files.json: {e}")

processed_files = load_processed_files()
processed_files_lock = threading.Lock()"""

old_add_logic = """        processed_files.add(abs_path)"""
new_add_logic = """        processed_files.add(abs_path)
        save_processed_files()"""

old_discard_logic = """            processed_files.discard(abs_path)"""
new_discard_logic = """            processed_files.discard(abs_path)
            save_processed_files()"""

if old_processed_logic in code:
    code = code.replace(old_processed_logic, new_processed_logic)
    code = code.replace(old_add_logic, new_add_logic)
    code = code.replace(old_discard_logic, new_discard_logic)
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Successfully patched sync_client.py persistent processed_files!")
else:
    print("WARNING: Target code not found in sync_client.py")

