import json
import re
from typing import Any, List
from ai import extract_text # pyre-ignore

def test_extract_text():
    # 1. Simple string
    assert extract_text("Hello") == "Hello"
    
    # 2. JSON string
    assert extract_text('{"text": "JSON content"}') == "JSON content"
    
    # 3. Output structure
    out_obj = {
        "output": {
            "item_1": "Part 1",
            "item_2": "Part 2"
        }
    }
    result = extract_text(out_obj)
    assert "Part 1" in result
    assert "Part 2" in result
    assert "-- [MESSAGE SPLIT] --" in result
    
    # 4. Item structure
    item_obj = {
        "item_1": "Customer message",
        "item_2": {"text": "Agent reply"}
    }
    result = extract_text(item_obj)
    assert "Customer: Customer message" in result
    assert "Support: Agent reply" in result
    
    print("All tests passed!")

if __name__ == "__main__":
    test_extract_text()
