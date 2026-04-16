import sys

filepath = r'C:\Users\haoyu.zhang\Desktop\company\.thebotcompany-demo\dev\src\github.com\Lynkzhang\AFK\repo\repo\src\main.ts'
content = open(filepath, 'rb').read().decode('utf-8')

old_line = 'scene.update(state, elapsedTime, breedingSystem.getTimeUntilNextSplit(), FacilitySystem.getSplitInterval(state) / 10000, !!(state.activeBuffs.splitFieldAcceleratorUntil && state.activeBuffs.splitFieldAcceleratorUntil > Date.now()));'
new_line = 'scene.update(state, elapsedTime, FacilitySystem.getSplitInterval(state) / 10000, !!(state.activeBuffs.splitFieldAcceleratorUntil && state.activeBuffs.splitFieldAcceleratorUntil > Date.now()));'

if old_line in content:
    content = content.replace(old_line, new_line)
    print('main.ts updated OK')
else:
    print('ERROR: old line not found in main.ts')
    sys.exit(1)

open(filepath, 'wb').write(content.encode('utf-8'))
print('File written OK')
