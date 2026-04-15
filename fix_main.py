#!/usr/bin/env python3
with open('src/main.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old = 'ui.render(state, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getMaxCapacity(state))'
new = 'ui.render(state, FacilitySystem.getMaxCapacity(state))'

count = content.count(old)
content = content.replace(old, new)

with open('src/main.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Replaced {count} occurrences of ui.render calls in main.ts')

# Verify none remain
if 'breedingSystem.getTimeUntilNextSplit(),' in content:
    print('WARNING: some ui.render calls still have getTimeUntilNextSplit')
else:
    print('OK: all ui.render calls updated')
