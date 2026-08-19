import fs from 'fs';
const html = fs.readFileSync('views/live-room.ejs', 'utf-8');
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
let i = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  const code = match[1];
  const cleanCode = code.replace(/<%=[\s\S]*?%>/g, '"EJS"').replace(/<%[\s\S]*?%>/g, '');
  fs.writeFileSync('test_script_' + i + '.js', cleanCode);
  i++;
}
console.log('Extracted ' + i + ' scripts');
