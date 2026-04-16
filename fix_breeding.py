import sys

filepath = r'C:\Users\haoyu.zhang\Desktop\company\.thebotcompany-demo\dev\src\github.com\Lynkzhang\AFK\repo\repo\src\core\systems\BreedingSystem.ts'
content = open(filepath, 'rb').read().decode('utf-8')

CRLF = '\r\n'

# 1. Remove field declaration (line 25)
content = content.replace('  private cachedMinTimeUntilSplit = Infinity;' + CRLF, '')

# 2. Remove the capacity-full assignment (line 36)
content = content.replace('      this.cachedMinTimeUntilSplit = Infinity;' + CRLF, '')

# 3. Remove the split-happened assignment (line 112)
content = content.replace('      // Update cached min time' + CRLF + '      this.cachedMinTimeUntilSplit = 0;' + CRLF + CRLF, '')

# 4. Remove the end-of-loop assignment (line 125)
content = content.replace('    this.cachedMinTimeUntilSplit = minRemaining;' + CRLF, '')

# 5. Remove minRemaining tracking (if only used for cachedMinTimeUntilSplit)
# Check what's left with minRemaining
if 'minRemaining' in content:
    print('minRemaining still present - need to check usage')
    for i, line in enumerate(content.split(CRLF)):
        if 'minRemaining' in line:
            print(f'  line {i+1}: {repr(line)}')
else:
    print('minRemaining fully removed')

# 6. Remove getTimeUntilNextSplit() method
old_method = '  getTimeUntilNextSplit(): number {' + CRLF + '    return Math.max(0, this.cachedMinTimeUntilSplit);' + CRLF + '  }' + CRLF + CRLF
if old_method in content:
    content = content.replace(old_method, '')
    print('getTimeUntilNextSplit() removed OK')
else:
    print('ERROR: getTimeUntilNextSplit not found')
    # Check actual content around it
    idx = content.find('getTimeUntilNextSplit')
    if idx >= 0:
        print('Found at:', idx)
        print(repr(content[idx-10:idx+100]))
    sys.exit(1)

print('Field removed:', 'cachedMinTimeUntilSplit' not in content)

open(filepath, 'wb').write(content.encode('utf-8'))
print('File written OK')
