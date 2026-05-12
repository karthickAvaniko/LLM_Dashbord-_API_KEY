from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as f:
    long_description = f.read() if __import__("os").path.exists("README.md") else ""

setup(
    name="avaniko-ai",
    version="0.2.0",
    description="Avaniko AI — Gemini-style Python SDK for Qwen3.6 backed gateway. Chat, document extraction, code generation, vision — one API key for all.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Avaniko Technologies",
    author_email="karthick.murugan@avaniko.com",
    url="https://github.com/avaniko/avaniko-ai-python",
    packages=find_packages(),
    install_requires=["requests>=2.28.0"],
    python_requires=">=3.8",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    keywords=["ai", "llm", "qwen", "vision", "ocr", "invoice", "extraction"],
)
