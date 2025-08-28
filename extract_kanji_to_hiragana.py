import json
import re

# Input and output file paths
JMDICT_PATH = "jmdict-eng-3.6.1.json"
OUTPUT_PATH = "kanji_to_hiragana.json"

# Helper: check if a string is all kanji
KANJI_RE = re.compile(r'^[\u4e00-\u9fff]+$')

def is_kanji(word):
    return bool(KANJI_RE.match(word))

def main():
    print("Loading JMdict...")
    with open(JMDICT_PATH, "r", encoding="utf-8") as f:
        jmdict = json.load(f)

    kanji_to_hiragana = {}
    words = jmdict.get("words", [])
    for entry in words:
        kanji_list = entry.get("kanji", [])
        kana_list = entry.get("kana", [])
        # Get hiragana readings only
        hiragana_readings = [k.get("text") for k in kana_list if k.get("text") and all('ぁ' <= ch <= 'ん' or ch == 'ー' for ch in k.get("text"))]
        for kanji in kanji_list:
            kanji_text = kanji.get("text") if isinstance(kanji, dict) else kanji
            if kanji_text and is_kanji(kanji_text):
                if kanji_text not in kanji_to_hiragana:
                    kanji_to_hiragana[kanji_text] = []
                for reading in hiragana_readings:
                    if reading not in kanji_to_hiragana[kanji_text]:
                        kanji_to_hiragana[kanji_text].append(reading)

    # Merge with Kanjidic2
    print("Loading Kanjidic2...")
    with open("kanjidic2-all-3.6.1.json", "r", encoding="utf-8") as f:
        kanjidic = json.load(f)
    for entry in kanjidic.get("characters", []):
        kanji = entry.get("literal")
        if not kanji or kanji in kanji_to_hiragana:
            continue
        if not entry.get('readingMeaning'):
            continue
        readings = []
        for group in entry.get("readingMeaning", {}).get("groups", []):
            for r in group.get("readings", []):
                if r.get("type") == "ja_kun":
                    val = r.get("value")
                    val = val.split('.')[0]
                    if val and all('ぁ' <= ch <= 'ん' or ch == 'ー' for ch in val):
                        readings.append(val)
        if readings:
            kanji_to_hiragana[kanji] = list(sorted(set(readings)))

    print(f"Writing compact dictionary to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(kanji_to_hiragana, f, ensure_ascii=False, indent=2)
    print("Done.")

if __name__ == "__main__":
    main()
