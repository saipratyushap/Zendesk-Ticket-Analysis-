
import sys
from deep_translator import GoogleTranslator

def translate(text, from_code='da', to_code='en'):
    try:
        # Using deep-translator as it is compatible with Python 3.14
        # and fulfills the requirement of translating Danish to English.
        return GoogleTranslator(source=from_code, target=to_code).translate(text)
    except Exception as e:
        return f"Translation Error: {str(e)}"

if __name__ == "__main__":
    text = sys.stdin.read().strip()
    if not text:
        if len(sys.argv) > 1:
            text = sys.argv[1].strip()
            
    if text:
        print(translate(text))
