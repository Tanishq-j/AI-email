const fs = require('fs');
let code = fs.readFileSync('e:/Tester/tester.js', 'utf8');

// Replace interactive questions with hardcoded constants for full E2E testing
code = code.replace(/readline\.questionInt\('How many emails to generate\? '\)/g, '2');
code = code.replace(/readline\.keyInYN\('Enable Ghost Attachments\? '\)/g, 'false');
code = code.replace(/readline\.keyInYN\('Enable Temporal Urgency\? '\)/g, 'true');
code = code.replace(/readline\.keyInYN\('Enable Normal Attachments\? '\)/g, 'true');
code = code.replace(/const choice = readline\.question\('Choice: '\);/, "const choice = '1';");

fs.writeFileSync('e:/AI-Email-Solution/tester_auto.js', code);
console.log("Automated Tester Script Generated.");
