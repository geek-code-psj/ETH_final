import traceback
try:
    import main
    print("OK")
except Exception:
    traceback.print_exc()
