import json
import re

# Input and output file paths
JMDICT_PATH = "jmdict-eng-3.6.1.json"
OUTPUT_PATH = "kanji_to_hiragana.json"

# Regular expressions for matching kanji and kana characters
KANJI_RE = re.compile(r'[\u4e00-\u9fff]')
KANA_RE = re.compile(r'[\u3040-\u309F\u30A0-\u30FF]')

# Helper: check if a string contains any kanji
def has_kanji(word):
    return bool(KANJI_RE.search(word))

# Helper: pure kanji word (all chars are kanji)
def is_pure_kanji(word):
    return bool(word) and all(KANJI_RE.match(ch) for ch in word)

# Helper: okurigana word (starts with kanji, ends with kana, contains both)
def is_okurigana(word):
    if not word:
        return False
    return KANJI_RE.match(word[0]) and KANA_RE.match(word[-1]) and any(KANA_RE.match(ch) for ch in word)

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
            if not kanji_text:
                continue
            # Only keep pure kanji words and okurigana words
            if is_pure_kanji(kanji_text) or is_okurigana(kanji_text):
                for reading in hiragana_readings:
                    if kanji_text not in kanji_to_hiragana:
                        kanji_to_hiragana[kanji_text] = []
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
        # Only keep pure kanji words
        if not is_pure_kanji(kanji):
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
