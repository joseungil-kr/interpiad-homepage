const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('scripts/indexnow-submit.js','utf8');
let tests=0;
for(const status of [200,202,400,403,429,500]){
 const processMock={argv:['node','indexnow-submit.js','https://interpiad.com/tools/manual-invoice/'],exitCode:0,exit:(code)=>{processMock.exitCode=code;}};
 const httpsMock={request:(_opts,cb)=>({on(){return this;},setTimeout(){},write(){},end(){cb({statusCode:status,on:(name,fn)=>{if(name==='end')fn();}});}})};
 vm.runInNewContext(code,{require:(name)=>name==='https'?httpsMock:require(name),__dirname:process.cwd()+'/scripts',process:processMock,console:{log(){},error(){}},Buffer,URL});
 assert.equal(processMock.exitCode,status>=400?1:0);tests++;
}
console.log(JSON.stringify({passed:tests,scope:'IndexNow response status handling; mocked network, not a submission receipt.'}));
