# Python_LLMEvaluation

Python fundamentals practice and logic-building drills — used as a hand-written baseline
to evaluate LLM-generated Python solutions against (correctness, style, edge-case handling).

## Structure

- **[logical_questions](logical_questions)** — Standalone logic/algorithm scripts: string
  ops (anagram, palindrome, reverse string, vowel/char counting), array ops (duplicates,
  missing number, largest/second-largest, smallest), and ASCII pattern printing (pyramid,
  triangles, hollow square).
- **[PythonPractice](PythonPractice)** — Sequential lab exercises (`Lab001`–`Lab181`)
  covering core Python end-to-end: basics, keywords/identifiers/variables, literals,
  operators, conditionals/loops, switch-match, functions, scope, decorators, type
  conversion, lambdas, list/tuple/set/dict, OOP (class, constructor, encapsulation,
  inheritance, polymorphism, abstraction, static members, exceptions, modules), packages,
  collections/file I/O, and pytest basics (`ex_21_PyTest`, with a cheatsheet).

## Usage

```bash
python logical_questions/<script>.py
python PythonPractice/<exercise_folder>/<Lab>.py
pytest PythonPractice/ex_21_PyTest/
```
