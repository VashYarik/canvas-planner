import sys

filepath = 'c:\\Planer\\app\\components\\Calendar.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open(filepath, 'w', encoding='utf-8') as f:
    for i, line in enumerate(lines):
        if i < 1105:
            f.write(line)
