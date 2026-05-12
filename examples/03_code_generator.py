"""
Example 3 — Code generation, review, fix.

Run:
  export AVANIKO_API_KEY=ak_xxx
  python 03_code_generator.py
"""
import avaniko_ai as ai

ai.configure()

# 1. Generate fresh code
print("=== GENERATE ===")
code = ai.code.write(
    "Python class to validate Indian PAN numbers (5 letters + 4 digits + 1 letter)",
    language="python",
)
print(code)

# 2. Explain existing code
print("\n=== EXPLAIN ===")
snippet = """
def fib(n):
    if n < 2: return n
    return fib(n-1) + fib(n-2)
"""
print(ai.code.explain(snippet, language="python"))

# 3. Fix a buggy snippet
print("\n=== FIX ===")
buggy = """
function divide(a, b) {
    return a / b;
}
console.log(divide(10, 0));
"""
print(ai.code.fix(buggy, error="Returns Infinity instead of throwing for division by zero", language="javascript"))

# 4. SQL from natural language
print("\n=== SQL ===")
schema = """
TABLE users (id INT, email TEXT, created_at TIMESTAMP)
TABLE orders (id INT, user_id INT, amount DECIMAL, created_at TIMESTAMP)
"""
print(ai.code.generate_sql(
    "Top 10 customers by total order amount in 2024",
    schema=schema,
))
