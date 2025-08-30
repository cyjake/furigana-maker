# Furigana Maker


A web tool for rendering Japanese text with accurate furigana (ruby) annotations, supporting both pure kanji and okurigana words.

## Features

- **Accurate Furigana Rendering**: Automatically adds furigana for kanji and kanji+okurigana words using a prebuilt dictionary.
- **Okurigana Support**: Handles words with kanji followed by kana (okurigana), displaying kanji and okurigana separately for clarity.
- **Longest/Shortest Match Segmentation**: Segments Japanese text to match dictionary entries, supporting both pure kanji and okurigana forms.
- **Interactive Pronunciation Selection**: Click on kanji or kanji+okurigana units to select alternate readings from a dropdown.
- **Customizable Appearance**: Change font, colors, line height, ruby opacity, and more with palette and style controls.
- **Responsive UI**: Modern, mobile-friendly design with palette presets and live preview.
- **Hover Highlighting**: Highlights kanji, ruby, and okurigana units on hover for easy reading.

## How It Works

- Uses a prebuilt `kanji_to_hiragana.json` dictionary generated from JMdict and Kanjidic2.
- Segments input text by script, matches against dictionary, and renders HTML with `<ruby>`, `<rt>`, and `<span class="okurigana-group">` for okurigana.
- Okurigana is styled and highlighted separately for clarity.
- Pronunciation dropdowns are available for both kanji and okurigana units.

## Getting Started

1. Clone the repository.
2. Open `index.html` in your browser.
3. Paste or type Japanese text into the input area.
4. Adjust appearance and palette as desired.

## Dictionary Generation

- Uses dictionaries from [jmdict-simplified](https://github.com/scriptin/jmdict-simplified)
- See `extract_kanji_to_hiragana.py` for details on building the dictionary from JMdict and Kanjidic2.

## License

MIT
