const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(path,mocks={},extra={}){
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:id=>{if(id in mocks)return mocks[id];if(id==='../upload-step')return load('src/lib/upload-step.ts',mocks,extra);if(id==='../uploads/policy')return load('src/lib/uploads/policy.ts',mocks,extra);throw Error(id);},console,URL,Uint8Array,Blob,File,Headers,fetch,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout,queueMicrotask,...extra});return exports;
}
const errors=load('src/lib/upload-errors.ts');
const policy=load('src/lib/uploads/policy.ts');
const PNG=[137,80,78,71,13,10,26,10];
const PDF=[37,80,68,70,45];

// ── policy: the server's only decision point ───────────────────────────────
test('upload areas map to fixed folders and never to a caller-chosen path', () => {
  const admin={uid:'admin1',isAdmin:true}, student={uid:'stud1',isAdmin:false};
  assert.equal(policy.uploadTarget('course-cover',{courseId:'c1'},admin).prefix,'courses/c1/images');
  assert.equal(policy.uploadTarget('lesson-image',{courseId:'c1',lessonId:'l1'},admin).prefix,'courses/c1/lessons/l1/images');
  assert.equal(policy.uploadTarget('lesson-pdf',{courseId:'c1'},admin).prefix,'courses/c1/pdf');
  assert.equal(policy.uploadTarget('exam-question',{examId:'e1'},admin).prefix,'questions/e1');
  assert.equal(policy.uploadTarget('avatar',{},student).prefix,'avatars/stud1');
  assert.equal(policy.uploadTarget('forum',{courseId:'c1'},student).prefix,'course-forums/c1/stud1');
  // A student can never write where a teacher writes.
  for (const [area,input] of [['course-cover',{courseId:'c1'}],['lesson-pdf',{courseId:'c1'}],['exam-question',{examId:'e1'}],['community',{}],['notification',{}]])
    assert.throws(()=>policy.uploadTarget(area,input,student),/للأدمن فقط/,area);
  // A student's own folders follow the verified uid, not anything they send.
  assert.equal(policy.uploadTarget('avatar',{},student).prefix,'avatars/stud1');
  assert.equal(policy.uploadTarget('avatar',{},admin).prefix,'avatars/admin1');
});

test('path validation rejects traversal, wrong folders and wrong extensions', () => {
  const admin={uid:'a',isAdmin:true};
  const target=policy.uploadTarget('course-cover',{courseId:'c1'},admin);
  assert.equal(policy.assertPathForTarget('courses/c1/images/1234.png',target),'courses/c1/images/1234.png');
  for (const bad of ['courses/c2/images/1234.png','courses/c1/images/../x.png','courses/c1/images/x.exe','courses/c1/images/sub/x.png','courses/c1/pdf/x.pdf','courses/c1/images/x.png.bak'])
    assert.throws(()=>policy.assertPathForTarget(bad,target),/غير صالح|خارج المجلد/,bad);
  const pdf=policy.uploadTarget('lesson-pdf',{courseId:'c1'},admin);
  assert.equal(policy.assertPathForTarget('courses/c1/pdf/a.pdf',pdf),'courses/c1/pdf/a.pdf');
  assert.throws(()=>policy.assertPathForTarget('courses/c1/pdf/a.png',pdf),/امتداد/);
  assert.throws(()=>policy.uploadTarget('course-cover',{courseId:'../etc'},admin),/غير صالح/);
});

test('a renamed file is rejected by its first bytes, not by its declared type', async () => {
  await policy.assertDeclaredType(new Blob([new Uint8Array(PNG)]),'image/png');
  await policy.assertDeclaredType(new Blob([new Uint8Array(PDF)]),'application/pdf');
  await assert.rejects(policy.assertDeclaredType(new Blob([new Uint8Array(PDF)]),'image/png'),/لا يطابق/);
  await assert.rejects(policy.assertDeclaredType(new Blob([new Uint8Array([60,104,116,109,108])]),'application/pdf'),/لا يطابق/);
  await assert.rejects(policy.assertDeclaredType(new Blob([new Uint8Array([77,90])]),'image/jpeg'),/لا يطابق/);
});

test('only our own Blob store URLs are accepted, and stored paths come back correctly', () => {
  const good='https://abc123.public.blob.vercel-storage.com/courses/c1/images/a.png';
  assert.ok(policy.isStoredFileUrl(good));
  assert.equal(policy.storedPathFromUrl(good),'courses/c1/images/a.png');
  for (const bad of ['http://abc123.public.blob.vercel-storage.com/x.png','https://evil.test/courses/c1/images/a.png','https://blob.vercel-storage.com.evil.test/a.png','javascript:alert(1)'])
    assert.equal(policy.isStoredFileUrl(bad),false,bad);
  assert.throws(()=>policy.storedPathFromUrl('https://evil.test/x.png'));
});

test('upload limits match what the UI promises', () => {
  const pdf=policy.uploadRules('lesson-pdf');
  assert.equal(pdf.types.join(','),'application/pdf');
  assert.equal(pdf.maxBytes,20*1024*1024);
  for (const area of ['course-cover','lesson-image','exam-question','avatar','forum','community','notification']) {
    const rules=policy.uploadRules(area);
    assert.equal(rules.types.join(','),'image/jpeg,image/png,image/webp',area);
    assert.equal(rules.maxBytes,3*1024*1024,area);
  }
});

// ── the browser upload path ────────────────────────────────────────────────
function uploadFixture({fail=false,decodeFailure=false,storedSize=null,badToken=false}={}){
 const calls=[],timers=new Map();let n=0,lastSize=0;
 const blob={upload:async(path,file,options)=>{calls.push({path,type:options.contentType,size:file.size,payload:JSON.parse(options.clientPayload),auth:options.headers.authorization});options.onUploadProgress?.({percentage:0});options.onUploadProgress?.({percentage:55});lastSize=file.size;if(fail)throw Object.assign(new Error('denied'),{name:'BlobAccessError'});return{url:`https://store.public.blob.vercel-storage.com/${path}`,pathname:path,downloadUrl:''};}};
 const config={auth:{authStateReady:async()=>{},currentUser:{uid:'u1',getIdToken:async()=>{if(badToken)throw new Error('token');return'tok';}}}};
 const api=load('src/lib/uploads/storage-upload.ts',{'@vercel/blob/client':blob,'@/lib/firebase/config':config,'../upload-errors':errors,'../upload-step':load('src/lib/upload-step.ts')},{
   fetch:async(_url,init)=>({ok:true,status:200,blob:async()=>({size:storedSize??lastSize,type:'image/png'})}),
   Image:class{set src(v){queueMicrotask(()=>decodeFailure?this.onerror?.():this.onload?.());}},
 });
 return {calls,api};
}
const file=(type,bytes=type==='application/pdf'?PDF:PNG)=>({name:'x',type,size:bytes.length,slice:()=>({arrayBuffer:async()=>new Uint8Array(bytes).buffer})});

test('an image upload goes straight to Vercel Blob with a server token and progress', async () => {
  const s=uploadFixture(),progress=[];
  const result=await s.api.uploadStoredFile('course-cover',{courseId:'c1'},file('image/png'),(p,stage)=>progress.push([p,stage]));
  assert.match(result.url,/^https:\/\/store\.public\.blob\.vercel-storage\.com\/courses\/c1\/images\/[a-f0-9-]+\.png$/);
  assert.equal(result.path,decodeURIComponent(new URL(result.url).pathname.slice(1)));
  assert.equal(s.calls[0].auth,'Bearer tok');
  assert.deepEqual(s.calls[0].payload,{area:'course-cover',courseId:'c1'});
  assert.ok(progress.some(([p])=>p===55));
  assert.equal(progress.at(-1)[0],100);
});

test('a server denial is reported once and never retried', async () => {
  const s=uploadFixture({fail:true});
  await assert.rejects(s.api.uploadStoredFile('exam-question',{examId:'e1'},file('image/png')),/صلاحية/);
  assert.equal(s.calls.length,1);
});

test('an image that cannot be decoded as an image is not accepted, but the PDF is', async () => {
  const s=uploadFixture({decodeFailure:true});
  await assert.rejects(s.api.uploadStoredFile('avatar',{},file('image/png')),/لم يستطع عرضه/);
  const pdf=uploadFixture();
  const out=await pdf.api.uploadStoredFile('lesson-pdf',{courseId:'c1'},file('application/pdf'));
  assert.match(out.url,/\.pdf$/);
});

test('a stored size that differs from the original is rejected', async () => {
  const s=uploadFixture({storedSize:99});
  await assert.rejects(s.api.uploadStoredFile('community',{},file('image/png')),/لا يطابق/);
});

test('oversized or wrong-typed files never reach the network', async () => {
  const big=uploadFixture();
  await assert.rejects(big.api.uploadStoredFile('lesson-pdf',{courseId:'c'},{name:'x',type:'application/pdf',size:21*1024*1024,slice:()=>({arrayBuffer:async()=>new Uint8Array(PDF).buffer})}),/٢٠ ميجابايت/);
  assert.equal(big.calls.length,0);
  const renamed=uploadFixture();
  await assert.rejects(renamed.api.uploadStoredFile('course-cover',{courseId:'c'},{name:'x',type:'image/png',size:4,slice:()=>({arrayBuffer:async()=>new Uint8Array(PDF).buffer})}),/لا يطابق/);
  assert.equal(renamed.calls.length,0);
});

test('every image destination is wired to the right area and folder', () => {
  const image=fs.readFileSync('src/lib/firebase/image-upload.ts','utf8');
  for (const pair of [['course-cover','{ courseId }'],['lesson-image','{ courseId, lessonId }'],['exam-question','{ examId }'],['avatar','{}'],['community','{}'],['notification','{}'],['forum','{ courseId }']])
    assert.ok(image.includes(`"${pair[0]}", ${pair[1]}`)||image.includes(`area === "community" ? "community" : "notification"`),pair[0]);
  const pdf=fs.readFileSync('src/lib/firebase/course-builder-service.ts','utf8');
  assert.ok(pdf.includes('"lesson-pdf"'));
  assert.ok(!pdf.includes('firebase/storage'));
});

test('the token route verifies the Firebase token before it issues anything', () => {
  const route=fs.readFileSync('src/app/api/uploads/token/route.ts','utf8');
  assert.ok(route.includes('verifyUploader(token)'));
  assert.ok(route.includes('assertPathForTarget(pathname, target)'));
  assert.ok(route.includes('maximumSizeInBytes'));
  assert.ok(route.includes('allowedContentTypes'));
  assert.ok(route.includes('validUntil'));
  assert.ok(route.includes('assertForumAccess(token'));
  // The completion callback must not attach a file to content on its own.
  assert.ok(/onUploadCompleted:\s*async\s*\(\)\s*=>\s*\{\s*\}/.test(route));
});

test('the delete route only removes paths inside the caller\'s own folders', () => {
  const route=fs.readFileSync('src/app/api/uploads/delete/route.ts','utf8');
  assert.ok(route.includes('verifyUploader(bearerToken'));
  assert.ok(route.includes('storedPathFromUrl(body.url)'));
  assert.ok(route.includes('uploadTarget(body.area, body, uploader)'));
});

test('runtime files are never used as a storage backend', () => {
  for (const path of ['src/lib/uploads/storage-upload.ts','src/app/api/uploads/token/route.ts','src/lib/firebase/image-upload.ts']) {
    const source=fs.readFileSync(path,'utf8');
    assert.ok(!/writeFile|fs\.write|readAsDataURL|base64/i.test(source),path);
  }
});

test('forum image validation points at our own store and the student folder', () => {
  const image=load('src/lib/image-attachments.ts');
  const url='https://s.public.blob.vercel-storage.com/course-forums/c1/u1/a.png';
  assert.equal(image.validateForumImage({url,path:'course-forums/c1/u1/a.png',name:'a'},'c1','u1').path,'course-forums/c1/u1/a.png');
  assert.throws(()=>image.validateForumImage({url,path:'course-forums/c1/u2/a.png',name:'a'},'c1','u1'),/ليست مرفوعة/);
  assert.throws(()=>image.validateForumImage({url:'https://evil.test/course-forums/c1/u1/a.png',path:'course-forums/c1/u1/a.png',name:'a'},'c1','u1'),/غير صالح/);
});

test('Next image optimizer accepts the Blob host and still rejects arbitrary hosts', () => {
  const config=require('../next.config.js');
  const {matchRemotePattern}=require('next/dist/shared/lib/match-remote-pattern');
  assert.ok(config.images.remotePatterns.some(p=>matchRemotePattern(p,new URL('https://abc.public.blob.vercel-storage.com/courses/c/images/a.png'))));
  assert.ok(!config.images.remotePatterns.some(p=>matchRemotePattern(p,new URL('https://unknown.invalid/a.png'))));
});

test('upload errors explain the Blob failures that actually happen', () => {
  assert.match(errors.uploadErrorMessage({name:'BlobStoreNotFoundError'}),/Blob/);
  assert.match(errors.uploadErrorMessage({name:'BlobContentTypeNotAllowedError'}),/نوع الملف غير مسموح/);
  assert.match(errors.uploadErrorMessage({name:'BlobAccessError'}),/صلاحية/);
  assert.match(errors.uploadErrorMessage({code:'no-token'}),/BLOB_READ_WRITE_TOKEN|Blob/);
});

test('the app no longer initialises Firebase Storage at all', () => {
  const config=fs.readFileSync('src/lib/firebase/config.ts','utf8');
  assert.ok(!/getStorage|maxUploadRetryTime/.test(config));
  // Nothing in the client tree may still import the removed uploader module.
  const files=[];
  (function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=`${dir}/${entry.name}`;if(entry.isDirectory())walk(full);else if(/\.(ts|tsx)$/.test(entry.name))files.push(full);}})('src');
  for(const file of files){
    const source=fs.readFileSync(file,'utf8');
    assert.ok(!source.includes('firebase/storage-upload'),file);
  }
});
