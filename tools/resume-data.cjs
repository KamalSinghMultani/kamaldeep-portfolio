const fs=require('fs'),vm=require('vm');
const menu=fs.readFileSync('site/game-menu.js','utf8'),src=fs.readFileSync('site/index.src.html','utf8');
function extract(text,start,end,name){const code=text.slice(text.indexOf(start),text.indexOf(end,text.indexOf(start)));return vm.runInNewContext(code+';JSON.stringify('+name+')');}
console.log(JSON.stringify({notes:JSON.parse(extract(menu,'  const projectNotes =','  const categories =','({projects:projectNotes,roles})')),missions:JSON.parse(extract(src,'  var MISSIONS =','  var CATS =','MISSIONS')),skills:JSON.parse(extract(src,'  var SKILLS =','  function el(','SKILLS'))}));
