import sys

filepath = r'C:\Users\haoyu.zhang\Desktop\company\.thebotcompany-demo\dev\src\github.com\Lynkzhang\AFK\repo\repo\src\core\scene\Canvas2DRenderer.ts'
content = open(filepath, 'rb').read().decode('utf-8')
CRLF = '\r\n'

arrow = '\u2192'  # →

old_lines = [
    '    // --- Pre-split animation: last 3 seconds ---',
    '    let preSplitScale = 1;',
    '    let preSplitGlow = false;',
    '    let splitFlicker = false;',
    '    if (this.splitCountdown <= 3000 && this.splitCountdown > 0) {',
    '      const progress = 1 - this.splitCountdown / 3000; // 0' + arrow + '1',
    '      // Pulsing scale: grows with a sine wobble',
    '      preSplitScale = 1 + 0.15 * progress + 0.05 * Math.sin(t * 8);',
    '      preSplitGlow = true;',
    '      // Last 1 second: fast flicker',
    '      if (this.splitCountdown <= 1000) {',
    '        splitFlicker = true;',
    '      }',
    '    }',
]
old_block = CRLF.join(old_lines)

new_lines = [
    '    // --- Pre-split animation: last 3 seconds (per-slime) ---',
    '    let preSplitScale = 1;',
    '    let preSplitGlow = false;',
    '    let splitFlicker = false;',
    '    {',
    '      const effectiveSplitTime = calcEffectiveSplitTime(slime, this.facilityMultiplier, this.fieldAccelActive);',
    '      const slimeCountdown = effectiveSplitTime - (slime.splitAccumulatedMs ?? 0);',
    '      if (slimeCountdown <= 3000 && slimeCountdown > 0) {',
    '        const progress = 1 - slimeCountdown / 3000; // 0' + arrow + '1',
    '        // Pulsing scale: grows with a sine wobble',
    '        preSplitScale = 1 + 0.15 * progress + 0.05 * Math.sin(t * 8);',
    '        preSplitGlow = true;',
    '        // Last 1 second: fast flicker',
    '        if (slimeCountdown <= 1000) {',
    '          splitFlicker = true;',
    '        }',
    '      }',
    '    }',
]
new_block = CRLF.join(new_lines)

if old_block in content:
    content = content.replace(old_block, new_block)
    print('pre-split block replaced OK')
else:
    print('ERROR: old block not found')
    idx = content.find('Pre-split animation')
    if idx >= 0:
        print('Found at idx:', idx)
        print('Content:', repr(content[idx:idx+400]))
    sys.exit(1)

open(filepath, 'wb').write(content.encode('utf-8'))
print('File written OK')
