import os
from google import genai  # type: ignore
from dotenv import load_dotenv  # pyre-ignore
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent / '.env')
api_key = os.environ.get('GEMINI_API_KEY')

def list_mods():
    if not api_key:
        print("No API key found in .env")
        return
    
    try:
        client = genai.Client(api_key=api_key)
        print("Available Models and Actions:")
        for model in client.models.list():
            print(f"{model.name}: {model.supported_actions}")
    except Exception as e:
        print(f"Error listing models: {e}")

if __name__ == "__main__":
    list_mods()
