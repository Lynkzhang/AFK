const fs = require('fs');
const p = 'C:/Users/haoyu.zhang/Desktop/company/.thebotcompany-demo/dev/src/github.com/Lynkzhang/AFK/repo/repo/src/core/systems/OnboardingSystem.ts';
let content = fs.readFileSync(p, 'utf8');
const old = "    checkComplete: (_s, events) => events.has('facility-upgrade'),\r\n  },\r\n  {\r\n    id: 'step-teach-shop',";
const replacement = "    checkComplete: (_s, events) => events.has('facility-upgrade'),\r\n    onShow: (s) => {\r\n      // 保底金币：field-expansion lv1 升级费 = ceil(150 * 1 * 1.5) = 225\r\n      const minGoldNeeded = 225;\r\n      if (s.currency < minGoldNeeded) {\r\n        s.currency = minGoldNeeded;\r\n      }\r\n    },\r\n  },\r\n  {\r\n    id: 'step-teach-shop',";
if (content.includes(old)) {
  content = content.replace(old, replacement);
  fs.writeFileSync(p, content, 'utf8');
  console.log('Done');
} else {
  console.log('Not found');
  const idx = content.indexOf('facility-upgrade');
  console.log(JSON.stringify(content.substring(idx-5, idx+120)));
}
