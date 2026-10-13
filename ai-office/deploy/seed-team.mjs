#!/usr/bin/env node
// Safe seed only. No agents are started and no services are changed.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const a=process.argv[2];
if(!a || !path.isAbsolute(a)) { console.error("Usage: node seed-team.mjs /absolute/workspace");process.exit(2); }
const workspace=path.resolve(a);
const root=process.env.PIXEL_OFFICE_HOME?path.resolve(process.env.PIXEL_OFFICE_HOME):path.join(os.homedir(),".pixel-office");
fs.mkdirSync(root,{recursive:true,mode:0o700});
fs.mkdirSync(workspace,{recursive:true,mode:0o700});
const cfg=path.join(root,"config.json");
const desired={locale:"en",port:4747,host:"127.0.0.1",cwd:workspace,employeesDir:"employees",dataDir:"data",refreshHours:24,taskSessions:true,sickness:false};
if(fs.existsSync(cfg)){
 const old=JSON.parse(fs.readFileSync(cfg,"utf8"));
 if(old.host!=="127.0.0.1" || path.resolve(old.cwd||"")!==workspace) throw new Error("Existing config is not locked to loopback and sandbox. Inspect manually.");
 console.log("Existing safe config preserved");
} else fs.writeFileSync(cfg,JSON.stringify(desired,null,2)+"\n",{flag:"wx",mode:0o600});
const staff=[
{id:"director",name:"총괄 팀장",role:"Project Manager",color:"#4C7CA7",prompt:"총괄 팀장으로 업무를 분해하고 직원에게 message_colleague 도구로 전달합니다. 완료 보고만 믿지 말고 로그, 테스트, 커밋 증거를 확인합니다. 보드의 항목은 자동 실행되지 않습니다. 승인 없는 결제, 권한, DNS, 실서비스 배포를 금지합니다."},
{id:"researcher",name:"자료 조사",role:"Researcher",color:"#6C9B83",prompt:"시장 자료와 GitHub 구현 사례를 조사하고 출처와 함께 정리합니다. 라이선스, 업데이트, 유지보수, 위험도와 재사용할 코드를 확인합니다. 조사 결과를 message_colleague 도구로 팀장에게 전달하고 실서비스 변경은 금지합니다."},
{id:"builder",name:"개발 담당",role:"Software Developer",color:"#C28D50",prompt:"격리된 시험 작업공간에서만 최소 범위의 코드를 수정합니다. 변경 전후 diff, 테스트, 실패 이유를 남겨 QA에게 message_colleague 도구로 전달합니다. 실서비스, 인증, 비밀키, 권한, DNS, 유료 계약은 수정하지 않습니다."},
{id:"qa",name:"검수 담당",role:"QA Engineer",color:"#7D7BC5",prompt:"독립적으로 테스트, 코드 diff, 로그, HTTP 증거를 검증합니다. 실패 시 재현 절차를 개발 담당에게 message_colleague 도구로 전달합니다. 읽기 전용 검사를 우선하며 실서비스 변경과 병합을 금지합니다."},
{id:"watchdog",name:"복구 담당",role:"Operations Analyst",color:"#B86B75",prompt:"정체된 작업의 원인을 권한, 버그, 의존성, 외부 장애로 분류합니다. 반복적인 무한 재시도는 금지합니다. 복구는 격리된 작업공간에서만 제안/수행하며 승인 대상은 사용자에게 보고합니다. 자동 감시가 이미 작동한다고 주장하지 않습니다."}
];
const colors=["#3B2A20","#4E342E","#312B46","#4B342C","#563C2A"];
const home=path.join(root,"employees");fs.mkdirSync(home,{recursive:true,mode:0o700});
for(const [i,s] of staff.entries()){
 const dir=path.join(home,s.id);fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const look={skin:"#f1c9a5",hair:colors[i],hairStyle:"short",top:s.color,bottom:"#2f3548",accessory:"none",body:"normal"};
 const mode=s.id==="builder"?"default":"plan";
 const prompt=["---","name: "+s.name,"role: "+s.role,"color: "+s.color,"permissionMode: "+mode,"look: "+JSON.stringify(look),"---",s.prompt,"작업공간: "+workspace,""].join("\n");
 const ap=path.join(dir,"agent.md"),mp=path.join(dir,"memory.md");
 if(!fs.existsSync(ap))fs.writeFileSync(ap,prompt,{flag:"wx",mode:0o600});
 if(!fs.existsSync(mp))fs.writeFileSync(mp,"# "+s.name+" 기억\n\n검증된 장기 사실만 기록합니다.\n",{flag:"wx",mode:0o600});
 console.log("Role seeded:",s.id);
}
console.log("Select the connected Codex model for each employee in Pixel Office settings.");
