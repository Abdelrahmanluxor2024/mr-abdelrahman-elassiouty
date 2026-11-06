const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(path,mocks={},extra={}){
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:id=>{if(id in mocks)return mocks[id];if(id==='../upload-step')return load('src/lib/upload-step.ts',mocks,extra);throw Error(id);},console,URL,Uint8Array,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout,queueMicrotask,...extra});return exports;
}
const errors=load('src/lib/upload-errors.ts');
function fixture({fail,metadataSize=4,anonymous=false,corrupt=false}={}){
 const calls=[],timers=new Map();let canceled=false,n=0;
 const storage={ref:(_,path)=>({path}),uploadBytesResumable:(target,file,meta)=>{calls.push(['upload',target.path,file.size,meta.contentType]);return{cancel:()=>{canceled=true;},on:(_event,progress,error,complete)=>{if(fail==='stall')return;queueMicrotask(()=>{if(fail){error({code:fail});return;}progress({bytesTransferred:4,totalBytes:4});complete();});}};},getMetadata:async()=>{calls.push(['metadata']);return{size:metadataSize,contentType:'image/png'};},getBytes:async()=>{calls.push(['bytes']);return new Uint8Array(corrupt?[9,2,3,4]:[1,2,3,4]).buffer;},getDownloadURL:async()=>{calls.push(['url']);return 'https://storage.test/image.png';},deleteObject:async()=>{}};
 const auth={authStateReady:async()=>{},currentUser:anonymous?null:{getIdToken:async()=>{calls.push(['token']);return'token';}}};
 const api=load('src/lib/firebase/storage-upload.ts',{'firebase/storage':storage,'./config':{auth,storage:{}},'../upload-errors':errors},{setTimeout:fn=>{timers.set(++n,fn);return n;},clearTimeout:id=>timers.delete(id)});
 return {api,calls,timers,canceled:()=>canceled};
}
test('successful upload verifies remote metadata BEFORE returning URL and 100%',async()=>{
 const s=fixture(),progress=[];const r=await s.api.uploadStoredFile('images/a.png',{size:4,arrayBuffer:async()=>new Uint8Array([1,2,3,4]).buffer},'image/png',v=>progress.push(v));
 assert.equal(r.url,'https://storage.test/image.png');assert.equal(s.calls.map(x=>x[0]).join(','),'token,upload,metadata,bytes,url');assert.equal(progress.at(-1),100);assert.equal(s.timers.size,0);
});
test('unauthorized/quota failures and mismatching remote files never fabricate success',async()=>{
 for(const fail of ['storage/unauthorized','storage/quota-exceeded']){const s=fixture({fail});await assert.rejects(s.api.uploadStoredFile('a',{size:4,arrayBuffer:async()=>new Uint8Array([1,2,3,4]).buffer},'image/png'),new RegExp(fail));assert.equal(s.calls.some(c=>c[0]==='url'),false);assert.equal(s.timers.size,0);}
 const s=fixture({metadataSize:2});await assert.rejects(s.api.uploadStoredFile('a',{size:4,arrayBuffer:async()=>new Uint8Array([1,2,3,4]).buffer},'image/png'));assert.equal(s.calls.some(c=>c[0]==='url'),false);
});
test('anonymous upload does not touch Storage; stalled upload cancels and returns an actionable error',async()=>{
 const a=fixture({anonymous:true});await assert.rejects(a.api.uploadStoredFile('a',{size:4,arrayBuffer:async()=>new Uint8Array([1,2,3,4]).buffer},'image/png'));assert.equal(a.calls.length,0);
 const s=fixture({fail:'stall'}),pending=s.api.uploadStoredFile('a',{size:4,arrayBuffer:async()=>new Uint8Array([1,2,3,4]).buffer},'image/png');await new Promise(setImmediate);for(const fn of [...s.timers.values()])fn();await assert.rejects(pending,/٤٥/);assert.equal(s.canceled(),true);
});
function imageFixture(role='admin',decodeFailure=false){
 const calls=[];const image=load('src/lib/image-attachments.ts');const config={auth:{authStateReady:async()=>{},currentUser:{uid:'u',getIdToken:async()=>'token'}},db:{}};
 const store={uploadStoredFile:async(path,file,type,progress)=>{calls.push({path,type,size:file.size});progress?.(100);return{url:'https://storage.test/'+path};}};
 const mocks={'./storage-upload':store,'./config':config,'firebase/firestore':{doc:()=>({}),getDoc:async()=>({data:()=>({role})})},'@/lib/image-attachments':image,'@/app/actions/student-learning':{authorizeForumImageUpload:async course=>{calls.push({authorize:course});}}};
 return{calls,mocks,api:load('src/lib/firebase/image-upload.ts',mocks,{Image:class {set src(value){queueMicrotask(()=>decodeFailure?this.onerror?.():this.onload?.());}}})};
}
function file(type,bytes){return{name:'file',type,size:bytes.length,slice:()=>({arrayBuffer:async()=>new Uint8Array(bytes).buffer})};}
test('all image upload destinations use verified storage, safe UUID names and admin checks',async()=>{
 const s=imageFixture(),f=file('image/png',[137,80,78,71,13,10,26,10]);
 await s.api.uploadCourseImage('c',f);await s.api.uploadLessonImage('c','l',f);await s.api.uploadAdminImage('community',f);await s.api.uploadAdminImage('notifications',f);await s.api.uploadAvatarImage(f);await s.api.uploadExamImage(f,'e');await s.api.uploadForumImage('c',f);
 for(const prefix of ['courses/c/images/','courses/c/lessons/l/images/','admin/community/images/','admin/notifications/images/','avatars/u/','questions/e/','course-forums/c/u/'])assert.ok(s.calls.some(c=>c.path?.startsWith(prefix)),prefix);
 assert.ok(s.calls.find(c=>c.authorize==='c'));assert.ok(s.calls.filter(c=>c.path).every(c=>c.type==='image/png'));
 const denied=imageFixture('student');await assert.rejects(denied.api.uploadCourseImage('c',f));assert.equal(denied.calls.length,0);
});
test('PDF upload validates signature and uses verified storage with progress',async()=>{
 const s=imageFixture();s.mocks['../course-builder']={};s.mocks['./services']={};
 s.mocks['firebase/firestore'].getDoc=async()=>({exists:()=>true,data:()=>({role:'admin'})});
 const api=load('src/lib/firebase/course-builder-service.ts',s.mocks);
 await api.uploadLessonPdf('c',file('application/octet-stream',[37,80,68,70,45]));assert.equal(s.calls[0].type,'application/pdf');assert.ok(s.calls[0].path.startsWith('courses/c/pdf/'));
 await assert.rejects(api.uploadLessonPdf('c',file('application/pdf',[60,104,116,109,108])));
});
test('active community, notification and avatar uploads no longer persist base64 previews',()=>{
 for(const path of ['src/app/admin/community/page.tsx','src/app/admin/notifications/page.tsx','src/components/student/student-avatar-uploader.tsx']){const s=fs.readFileSync(path,'utf8');assert.ok(!s.includes('readAsDataURL'),path);}
 const avatar=fs.readFileSync('src/components/student/student-avatar-uploader.tsx','utf8');assert.ok(avatar.includes('updateDoc'));assert.ok(!avatar.includes('updateStudentAvatar'));
 const course=fs.readFileSync('src/app/admin/courses/page.tsx','utf8');assert.ok(course.includes('uploadCourseImage'));assert.ok(course.includes('UploadDiagnostics'));
});
test('an uploaded object that cannot render as an image is not accepted as a successful image',async()=>{
 const s=imageFixture('admin',true);await assert.rejects(s.api.uploadCourseImage('c',file('image/png',[137,80,78,71,13,10,26,10])));assert.equal(s.calls.length,1);
});
test('diagnostic image is a valid PNG with CRC-correct chunks and a decodable one-pixel scanline',()=>{
 const source=fs.readFileSync('src/components/common/upload-diagnostics.tsx','utf8');
 const b=Buffer.from(source.match(/atob\(\s*["']([^"']+)/)[1],'base64');
 function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
 let i=8;for(;i<b.length;){const n=b.readUInt32BE(i),kind=b.toString('ascii',i+4,i+8),data=b.subarray(i+8,i+8+n);assert.equal(crc32(b.subarray(i+4,i+8+n)),b.readUInt32BE(i+8+n));if(kind==='IDAT')assert.equal(require('node:zlib').inflateSync(data).length,4);i+=12+n;}assert.equal(i,b.length);
});

test('a byte-corrupted download fails verification even when metadata matches',async()=>{
 const s=fixture({corrupt:true}),progress=[];
 await assert.rejects(s.api.uploadStoredFile('a',{size:4,arrayBuffer:async()=>new Uint8Array([1,2,3,4]).buffer},'image/png',v=>progress.push(v)),/لا يطابق/);
 assert.equal(s.calls.some(c=>c[0]==='url'),false);assert.ok(!progress.includes(100));
});
test('Next image optimizer explicitly accepts Firebase Storage covers but not arbitrary hosts',()=>{
 const config=require('../next.config.js');
 const {matchRemotePattern}=require('next/dist/shared/lib/match-remote-pattern');
 const good=new URL('https://firebasestorage.googleapis.com/v0/b/bucket/o/courses%2Fc%2Fimages%2Fcover.png?alt=media&token=test');
 assert.ok(config.images.remotePatterns.some(p=>matchRemotePattern(p,good)));
 assert.ok(!config.images.remotePatterns.some(p=>matchRemotePattern(p,new URL('https://unknown.invalid/cover.png'))));
});

test('a stalled auth prerequisite fails promptly and a late auth success never starts an upload',async()=>{
 const timers=new Map();let n=0,resolveAuth,uploads=0;
 const stage=load('src/lib/upload-step.ts',{}, {setTimeout:fn=>{timers.set(++n,fn);return n;},clearTimeout:id=>timers.delete(id)});
 const auth={authStateReady:()=>new Promise(resolve=>{resolveAuth=resolve;}),currentUser:{getIdToken:async()=>'token'}};
 const api=load('src/lib/firebase/storage-upload.ts',{'../upload-step':stage,'./config':{auth,storage:{}},'../upload-errors':errors,'firebase/storage':{ref:()=>({}),uploadBytesResumable:()=>{uploads++;throw Error('should not start');}}});
 const pending=api.uploadStoredFile('test',{size:1},'image/png');
 await new Promise(setImmediate);for(const fn of [...timers.values()])fn();
 await assert.rejects(pending,/التحقق من جلسة Firebase.*upload\/step-timeout/);
 resolveAuth();await new Promise(setImmediate);assert.equal(uploads,0);assert.equal(timers.size,0);
});
test('admin profile lookup has a deadline before course/lesson/exam upload, not just the transfer',async()=>{
 const s=imageFixture(),timers=new Map();let n=0;
 s.mocks['firebase/firestore'].getDoc=()=>new Promise(()=>{});
 const stage=load('src/lib/upload-step.ts',{}, {setTimeout:fn=>{timers.set(++n,fn);return n;},clearTimeout:id=>timers.delete(id)});
 s.mocks['../upload-step']=stage;
 const api=load('src/lib/firebase/image-upload.ts',s.mocks);
 const pending=api.uploadCourseImage('c',file('image/png',[137,80,78,71,13,10,26,10]));
 await new Promise(setImmediate);for(const fn of [...timers.values()])fn();
 await assert.rejects(pending,/صلاحية الأدمن/);assert.equal(s.calls.length,0);assert.equal(timers.size,0);
});
test('post-upload metadata verification also has a deadline and never reports 100 percent on timeout',async()=>{
 const timers=new Map();let n=0;
 const stage=load('src/lib/upload-step.ts',{}, {setTimeout:fn=>{timers.set(++n,fn);return n;},clearTimeout:id=>timers.delete(id)});
 const progress=[];
 const api=load('src/lib/firebase/storage-upload.ts',{'../upload-step':stage,'./config':{auth:{authStateReady:async()=>{},currentUser:{getIdToken:async()=>'token'}},storage:{}},'../upload-errors':errors,'firebase/storage':{ref:()=>({}),uploadBytesResumable:()=>({on:(_e,p,_x,done)=>queueMicrotask(()=>{p({bytesTransferred:1,totalBytes:1});done();}),cancel:()=>{} }),getMetadata:()=>new Promise(()=>{})}});
 const pending=api.uploadStoredFile('test',{size:1},'image/png',p=>progress.push(p));
 await new Promise(setImmediate);for(const fn of [...timers.values()])fn();
 await assert.rejects(pending,/قراءة بيانات الملف/);assert.ok(!progress.includes(100));
});
