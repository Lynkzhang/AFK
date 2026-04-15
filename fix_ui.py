#!/usr/bin/env python3
import sys

with open('src/core/ui/UIManager.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # Fix 2a: Remove countdownEl property declaration
    if line.strip() == 'private readonly countdownEl: HTMLSpanElement;':
        i += 1
        continue
    
    # Fix 2b: Skip countdown DOM block (lines 77-87 range: from comment to empty line after assignment)
    if line.strip() == '// Countdown with timer icon':
        # Skip until after the this.countdownEl assignment line and the empty line
        while i < len(lines):
            if 'countdownEl = countdown.querySelector' in lines[i]:
                i += 1  # skip assignment line
                # skip following empty line
                if i < len(lines) and lines[i].strip() == '':
                    i += 1
                break
            i += 1
        continue
    
    # Fix 2c: Remove countdown from root.append
    if 'slimeCount, countdown, capacity,' in line:
        line = line.replace('slimeCount, countdown, capacity,', 'slimeCount, capacity,')
    
    # Fix 2d: Remove countdownEl.textContent line
    if 'countdownEl.textContent' in line:
        i += 1
        continue
    
    # Fix 2e: Update render signature
    if 'render(state: GameState, timeUntilSplit: number, maxCapacity: number): void {' in line:
        line = line.replace('timeUntilSplit: number, maxCapacity: number', 'maxCapacity: number')
    
    new_lines.append(line)
    i += 1

with open('src/core/ui/UIManager.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

# Verify
with open('src/core/ui/UIManager.ts', 'r', encoding='utf-8') as f:
    result = f.read()

if 'countdownEl' in result:
    print('WARNING: countdownEl still present')
    for i, l in enumerate(result.split('\n')):
        if 'countdownEl' in l:
            print(f'  line {i+1}: {l}')
else:
    print('OK: countdownEl removed')

if 'timeUntilSplit' in result:
    print('WARNING: timeUntilSplit still present in render')
else:
    print('OK: render signature updated')

print('Done')
