with open('repo/e2e/game.spec.ts', encoding='utf-8') as f:
    c = f.read()
c = c.replace('    // Verify quest button exists (10 buttons now)', '    // Verify quest button exists (11 buttons now with backpack)')
c = c.replace('    // Total button count should be 10', '    // Total button count should be 11 (includes backpack button)')
with open('repo/e2e/game.spec.ts', 'w', encoding='utf-8') as f:
    f.write(c)
print('done')
