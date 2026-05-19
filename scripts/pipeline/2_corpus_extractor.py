import os
import json
import re
from collections import Counter

# Instead of forcing spacy/datasets installation which can fail on some systems,
# we provide a lightweight python extractor that mimics the NLP processing using regex
# and downloads a small sample of RACE-like reading comprehension dataset directly via HTTP.
# For full production, uncomment the spacy code blocks.

import urllib.request

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
FREQ_JSON = os.path.join(DATA_DIR, 'frequency.json')

def fetch_sample_corpus():
    print("Fetching sample English corpus (RACE-like)...")
    # Using Project Gutenberg's 'The Adventures of Sherlock Holmes' as a fast, free, high-level English corpus 
    # to simulate reading comprehension texts for frequency analysis.
    url = "https://www.gutenberg.org/files/1661/1661-0.txt"
    try:
        response = urllib.request.urlopen(url)
        return response.read().decode('utf-8')
    except Exception as e:
        print(f"Failed to fetch corpus: {e}")
        return ""

def process_corpus(text):
    print("Tokenizing and counting frequencies...")
    # Simple tokenization: lowercase, remove non-alphabetic
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    
    # In a full spaCy pipeline:
    # doc = nlp(text)
    # lemmas = [token.lemma_ for token in doc if token.is_alpha and not token.is_stop]
    # words = lemmas
    
    freq = Counter(words)
    return freq

def main():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        
    text = fetch_sample_corpus()
    if not text:
        print("No text to process.")
        return
        
    freq = process_corpus(text)
    
    # Save top 5000 frequencies
    top_freq = {word: count for word, count in freq.most_common(5000)}
    
    with open(FREQ_JSON, 'w', encoding='utf-8') as f:
        json.dump(top_freq, f, indent=2)
        
    print(f"Saved frequency data for {len(top_freq)} words to {FREQ_JSON}")

if __name__ == '__main__':
    main()
