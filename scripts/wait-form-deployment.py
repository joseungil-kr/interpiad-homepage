"""Read-only wait for the exact public form assets from this checkout."""
import pathlib,time,urllib.request
paths=['tools/forms/document-forms.js','tools/forms/document-forms.css','tools/forms/quotation.mjs','tools/forms/quotation.css','tools/forms/employment-contract.mjs']
expected={p:pathlib.Path('static',p).read_bytes() for p in paths}
for attempt in range(60):
 try:
  for path,content in expected.items():
   with urllib.request.urlopen(urllib.request.Request('https://interpiad.com/'+path,headers={'Cache-Control':'no-cache'}),timeout=15) as r:
    assert r.status==200 and r.read()==content,path+' not yet current'
  print('Public form assets match this checkout byte-for-byte.');break
 except Exception as error:
  print('Deployment pending:',str(error));time.sleep(4)
else:raise SystemExit('Public assets did not match the requested commit within the verification window.')
