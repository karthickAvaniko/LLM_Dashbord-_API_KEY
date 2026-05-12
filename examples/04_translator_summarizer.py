"""
Example 4 — Translation, summarization, sentiment, Q&A.

Run:
  export AVANIKO_API_KEY=ak_xxx
  python 04_translator_summarizer.py
"""
import avaniko_ai as ai

ai.configure()

# Translation
print("=== TRANSLATE ===")
text_en = "Avaniko AI helps businesses extract data from documents using AI."
print("English:", text_en)
print("Tamil:  ", ai.text.translate(text_en, to_lang="Tamil"))
print("Hindi:  ", ai.text.translate(text_en, to_lang="Hindi"))
print("Telugu: ", ai.text.translate(text_en, to_lang="Telugu"))

# Summarization
print("\n=== SUMMARIZE ===")
article = """
Artificial intelligence is transforming how businesses operate. From customer
service chatbots to document processing automation, AI tools are becoming an
integral part of modern workflows. Companies that embrace AI early gain a
significant competitive advantage. However, deploying AI responsibly requires
careful consideration of data privacy, bias, and ethical implications.
Successful AI adoption involves not just technology but also training,
process redesign, and clear governance.
"""
print(ai.text.summarize(article, length="short"))

# Sentiment
print("\n=== SENTIMENT ===")
reviews = [
    "This product is amazing! Best purchase ever.",
    "Total waste of money. Broke after one use.",
    "It's okay, does what it says.",
]
for r in reviews:
    print(f"  '{r[:50]}...' → {ai.text.sentiment(r)}")

# Q&A grounded in context
print("\n=== Q&A ===")
context = """
The Taj Mahal was built between 1632 and 1648 by Mughal emperor Shah Jahan
in memory of his wife Mumtaz Mahal. It is located in Agra, India. The main
architect was Ustad Ahmad Lahauri. UNESCO declared it a World Heritage Site in 1983.
"""
qs = ["When was the Taj Mahal built?",
      "Who was the architect?",
      "Who built the Eiffel Tower?"]   # not in context
for q in qs:
    print(f"Q: {q}")
    print(f"A: {ai.text.question_answer(q, context=context)}\n")

# Entity extraction
print("=== ENTITIES ===")
text = "Apple Inc. CEO Tim Cook visited Chennai on March 15, 2024 and met with PM Narendra Modi to discuss a $5B investment."
print(ai.text.extract_entities(text))
