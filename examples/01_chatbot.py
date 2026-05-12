"""
Example 1 — Chatbot with multi-turn memory.

Run:
  pip install avaniko-ai     # or `pip install -e ./sdk/python`
  export AVANIKO_API_KEY=ak_xxx
  python 01_chatbot.py
"""
import avaniko_ai as ai

ai.configure()  # picks up AVANIKO_API_KEY from env

bot = ai.chat.Conversation(
    system="You are Avaniko's helpful assistant. Reply concisely.",
    temperature=0.7,
)

print("Avaniko Bot — type 'quit' to exit\n")
while True:
    user_input = input("You: ").strip()
    if user_input.lower() in {"quit", "exit", "bye"}: break
    if not user_input: continue
    print("Bot: ", end="", flush=True)
    for piece in bot.stream_say(user_input):
        print(piece, end="", flush=True)
    print()
