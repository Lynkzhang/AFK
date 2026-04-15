import sys

filepath = r'C:\Users\haoyu.zhang\Desktop\company\.thebotcompany-demo\dev\src\github.com\Lynkzhang\AFK\repo\repo\src\core\systems\BreedingSystem.ts'
content = open(filepath, 'rb').read().decode('utf-8')

CRLF = '\r\n'

# Remove minRemaining variable and its assignments from the loop
# Current content has:
#   let splitParentIndex = -1;
#   let minRemaining = Infinity;
#
#   for loop with:
#       } else {
#         const remaining = effectiveSplitTime - slime.splitAccumulatedMs;
#         if (remaining < minRemaining) {
#           minRemaining = remaining;
#         }
#       }

# Remove minRemaining declaration
content = content.replace('    let minRemaining = Infinity;' + CRLF + CRLF, '')

# Remove the else block that only tracked minRemaining
old_else = '      } else {' + CRLF + \
           '        const remaining = effectiveSplitTime - slime.splitAccumulatedMs;' + CRLF + \
           '        if (remaining < minRemaining) {' + CRLF + \
           '          minRemaining = remaining;' + CRLF + \
           '        }' + CRLF + \
           '      }'
new_else = '      }'

if old_else in content:
    content = content.replace(old_else, new_else)
    print('minRemaining else block removed OK')
else:
    print('ERROR: else block not found')
    idx = content.find('minRemaining')
    if idx >= 0:
        print(repr(content[idx-50:idx+200]))
    sys.exit(1)

# Verify no more minRemaining
if 'minRemaining' not in content:
    print('minRemaining fully removed')
else:
    print('WARNING: minRemaining still present')
    for i, line in enumerate(content.split(CRLF)):
        if 'minRemaining' in line:
            print(f'  line {i+1}: {repr(line)}')

open(filepath, 'wb').write(content.encode('utf-8'))
print('File written OK')
