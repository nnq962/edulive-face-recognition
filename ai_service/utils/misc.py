# utils/misc.py
import contextlib
import platform

def emojis(s: str = "") -> str:
    return s.encode().decode("ascii", "ignore") if platform.system() == "Windows" else s

class TryExcept(contextlib.ContextDecorator):
    def __init__(self, msg: str = ""):
        self.msg = msg
    def __enter__(self): ...
    def __exit__(self, exc_type, value, tb):
        if value:
            print(emojis(f"{self.msg}{': ' if self.msg else ''}{value}"))
        return True