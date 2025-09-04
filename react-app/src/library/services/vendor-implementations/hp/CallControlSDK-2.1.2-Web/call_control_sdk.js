var initPlatform = (() => {
  var _scriptName = import.meta.url;
  
  return (
async function(moduleArg = {}) {
  var moduleRtn;

var l=moduleArg,aa,ba,ca=new Promise((a,b)=>{aa=a;ba=b;}),da="object"==typeof window,m="undefined"!=typeof WorkerGlobalScope,ea="object"==typeof process&&"object"==typeof process.G&&"string"==typeof process.G.node&&"renderer"!=process.type,fa=!da&&!ea&&!m;
function ha(a,b,e,c,d){ void 0==e[a].lastReportData&&(e[a].lastReportData=[]);let g=0;for(const p of e[a].reportItems)if(0!=p.reportCount&&0!=p.reportSize&&0!=p.usages.length)for(let k=0;k<p.usages.length;k++){var f=0;k+1<p.usages.length?f=p.reportSize:f=p.reportSize*(p.reportCount-k);var h=p.usages[k];if(h in c){h=c[h];let q=Math.trunc((f+7)/8),t=new Uint8Array(q);for(let C=0;C<f;C++)1==(b[Math.trunc(g/8)]>>g%8&1)&&(t[Math.trunc(C/8)]|=1<<C%8),g++;if(7==h||2==d||void 0==e[a].lastReportData[h]||e[a].lastReportData[h]!=
t.toString())f=n.g._malloc(q),n.g.HEAPU8.set(t,f),r(n,`calling input callback for ccsdk_usage ${h} with data ${t}`),ia(h,f,q,p.isAbsolute),n.g._free(f),e[a].lastReportData[h]=t.toString();}else g+=f;}}function ja(a,b,e,c){for(const d of a)for(const g of d.items)for(const f of g.usages)f in b&&(e[b[f]]={reportId:d.reportId,usage:f},c[d.reportId]={reportItems:d.items,lastReportData:void 0});}function r(a,b){u(a,0,b);}
async function ka(a,b){b.device==a.device&&(u(a,1,"Device disconnected"),void 0!=v&&(a.l=a.device.productName,v(0)),a.device=null);}async function la(a,b){r(a,`REQUEST FEATURE REPORT ${b}`);const e=await a.device.receiveFeatureReport(b);r(a,e);if(1<e.byteLength&&e.getUint8(0)==b){const c=new Uint8Array(e.byteLength-1);for(let d=1;d<e.byteLength;++d)c[d-1]=e.getUint8(d);b in a.u&&ha(b,c,a.u,n.l,2);}}
async function ma(a,b){u(a,1,"platformConnectHeadset");if(!b)v=void 0;else if("number"==typeof b)v=w(b);else if("function"!=typeof b){u(a,3,"Invalid callback type");return}a.device&&(a.device.close(),u(a,2,"Open called while a device is opened, calling close."));b=await navigator.hid.getDevices();var e=new CustomEvent("ccsdkSelectDeviceEvent",{cancelable:true,detail:{isSelectedDevice:false}});for(var c of b)if(c.dispatchEvent(e),e.detail.isSelectedDevice){a.device=c;break}if(a.device)if(await a.device.open(),
a.device.opened){a.device.addEventListener("inputreport",a.C);u(a,1,a.device);a.l=null;c=0;for(const d of a.device.collections){let g=true;b=a;e=`----\nDevice collection\nUsage page ${"0x"+d.usagePage.toString(16).padStart(4,"0")}\nUsage: ${"0x"+d.usage.toString(16).padStart(4,"0")}\nType: ${"0x"+d.type.toString(16).padStart(4,"0")}`;u(b,1,e);11==d.usagePage?(c|=1,r(a,"hasTelephonyDevice")):65440==d.usagePage?(c|=16,r(a,"hasHIDLegacy")):65442==d.usagePage?(c|=2,r(a,"hasHID2")):65307==d.usagePage?(c|=
4,r(a,"hasTelephonyReplicant")):g=false;1==g&&(ja(d.inputReports,n.m,a.D,a.v),ja(d.outputReports,n.s,a.m,a.g),ja(d.featureReports,n.l,a.s,a.u));}r(a,a.D);r(a,a.m);r(a,a.s);18==(c&18)&&(c&=-17);v(c);}else v(0);else v(0);}
async function na(){var a=x;u(a,1,"platformRetryConnectHeadset");setTimeout(async()=>{if(a.l){u(a,1,`Trying to reconnect to last device ${a.l}`);let b=null,e=await navigator.hid.getDevices();for(const c of e)if(null==a.device&&0==c.productName.localeCompare(a.l))if(r(a,c),null==b)b=c;else {u(a,2,"Multiple devices with same name found cannot reconnect.");b=null;break}null!=b&&(b.addEventListener("ccsdkSelectDeviceEvent",c=>{c.preventDefault();c instanceof CustomEvent&&c.detail&&(c.detail.isSelectedDevice=
true);},{capture:true,once:true,passive:false}),ma(a,v));}},1500);return  true}
function oa(a,b,e){r(a,`platformSendReportImp: ${e}`);if(b in a.m){const f=a.m[b].reportId;if(void 0==a.g[f].lastReportData){var c=0;for(var d of a.g[f].reportItems)c+=d.reportCount*d.reportSize;c=new Uint8Array(Math.trunc((c+7)/8));}else c=a.g[f].lastReportData;let h=d=0;for(const p of a.g[f].reportItems)for(let k=0;k<p.usages.length;k++){var g=0;k+1<p.usages.length?g=p.reportSize:g=p.reportSize*(p.reportCount-k);if(a.m[b].usage==p.usages[k]){g=d+g;for(let q=d;q<g;q++)c[Math.trunc(d/8)]=0==(e[Math.trunc(h/
8)]>>h%8&1)?c[Math.trunc(d/8)]&~(1<<d%8):c[Math.trunc(d/8)]|1<<d%8,h++,d++;}else d+=g;}a.g[f].lastReportData=c;r(a,`setOutReport: ${f} ${c}`);a.device.sendReport(f,c);}else b in a.s&&(b=a.s[b].reportId,r(a,`featureReportreq: ${b}`),la(a,b));}function u(a,b,e){b<a.B||(3==b?console.error(e):2==b?console.warn(e):1==b?console.info(e):console.log(e));}
function pa(a,b,e,c,d){var g=x;b=new Uint8Array(n.g.HEAPU8.buffer,b,e);const f=new Uint8Array(b);setTimeout(()=>{d&&w(d)();r(g,`platformSendReportDelayed: usage:${a} reportData:${f}`);oa(g,a,f);},c);}
class n{static g=l;static m={720928:0,720943:1,720929:2,720932:4,589831:5,4288676023:20,4288676019:21,4288807055:8,4288807095:9,4288807068:11,4288807091:13,4288807133:15,4279959745:7};static s={524311:0,524297:1,524312:3,524320:6,4288807132:17,4288807093:10,4288807070:14,4288806946:16,4288806996:18,4279959745:7};static l={4288807093:12,4288807055:19};constructor(){this.C=this.C.bind(this);this.l=this.device=null;this.D={};this.m={};this.s={};this.v={};this.g={};this.u={};this.B=0;navigator.hid.addEventListener("disconnect",
a=>{ka(this,a);});}C(a){let b=a.reportId;a=a.data;const e=new Uint8Array(a.byteLength);for(let c=0;c<a.byteLength;++c)e[c]=a.getUint8(c);b in this.v&&(r(this,`onInputReport id:${b} data:${e}`),ha(b,e,this.v,n.m,0));}}var v,ia;const x=new n;var qa=Object.assign({},l),y="",ra,sa;
if(fa){if("object"==typeof process&&"function"===typeof require||"object"==typeof window||"undefined"!=typeof WorkerGlobalScope)throw Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");}else if(da||m){m?y=self.location.href:"undefined"!=typeof document&&document.currentScript&&(y=document.currentScript.src);_scriptName&&(y=_scriptName);y.startsWith("blob:")?
y="":y=y.slice(0,y.replace(/[?#].*/,"").lastIndexOf("/")+1);if("object"!=typeof window&&"undefined"==typeof WorkerGlobalScope)throw Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");m&&(sa=a=>{var b=new XMLHttpRequest;b.open("GET",a,false);b.responseType="arraybuffer";b.send(null);return new Uint8Array(b.response)});ra=async a=>{if(ta(a))return new Promise((e,
c)=>{var d=new XMLHttpRequest;d.open("GET",a,true);d.responseType="arraybuffer";d.onload=()=>{200==d.status||0==d.status&&d.response?e(d.response):c(d.status);};d.onerror=c;d.send(null);});var b=await fetch(a,{credentials:"same-origin"});if(b.ok)return b.arrayBuffer();throw Error(b.status+" : "+b.url);};}else throw Error("environment detection error");var ua=console.log.bind(console),z=console.error.bind(console);Object.assign(l,qa);qa=null;A("ENVIRONMENT");A("GL_MAX_TEXTURE_IMAGE_UNITS");A("SDL_canPlayWithWebAudio");
A("SDL_numSimultaneouslyQueuedBuffers");A("INITIAL_MEMORY");A("wasmMemory");A("arguments");A("buffer");A("canvas");A("doNotCaptureKeyboard");A("dynamicLibraries");A("elementPointerLock");A("extraStackTrace");A("forcedAspectRatio");A("instantiateWasm");A("keyboardListeningElement");A("freePreloadedMediaOnUse");A("loadSplitModule");A("locateFile");A("logReadFiles");A("mainScriptUrlOrBlob");A("mem");A("monitorRunDependencies");A("noExitRuntime");A("noInitialRun");A("onAbort");A("onCustomMessage");A("onExit");
A("onFree");A("onFullScreen");A("onMalloc");A("onRealloc");A("onRuntimeInitialized");A("postMainLoop");A("postRun");A("preInit");A("preMainLoop");A("preRun");A("preinitializedWebGLContext");A("preloadPlugins");A("print");A("printErr");A("setStatus");A("statusMessage");A("stderr");A("stdin");A("stdout");A("thisProgram");A("wasm");A("wasmBinary");A("websocket");A("fetchSettings");B("arguments","arguments_");B("thisProgram","thisProgram");D("undefined"==typeof l.memoryInitializerPrefixURL,"Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");
D("undefined"==typeof l.pthreadMainPrefixURL,"Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");D("undefined"==typeof l.cdInitializerPrefixURL,"Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");D("undefined"==typeof l.filePackagePrefixURL,"Module.filePackagePrefixURL option was removed, use Module.locateFile instead");D("undefined"==typeof l.read,"Module.read option was removed");D("undefined"==typeof l.readAsync,"Module.readAsync option was removed (modify readAsync in JS)");
D("undefined"==typeof l.readBinary,"Module.readBinary option was removed (modify readBinary in JS)");D("undefined"==typeof l.setWindowTitle,"Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)");D("undefined"==typeof l.TOTAL_MEMORY,"Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");B("asm","wasmExports");B("readAsync","readAsync");B("readBinary","readBinary");B("setWindowTitle","setWindowTitle");D(!ea,"node environment detected but not enabled at build time.  Add `node` to `-sENVIRONMENT` to enable.");
D(!fa,"shell environment detected but not enabled at build time.  Add `shell` to `-sENVIRONMENT` to enable.");B("wasmBinary","wasmBinary");"object"!=typeof WebAssembly&&z("no native wasm support detected");var va,wa=false;function D(a,b){a||E("Assertion failed"+(b?": "+b:""));}var xa,F,G,ya,H,I,za,Aa,Ba,Ca,Da=false,Ea=a=>a.startsWith("data:application/octet-stream;base64,"),ta=a=>a.startsWith("file://");
function Fa(){if(!wa){var a=Ga();0==a&&(a+=4);var b=I[a>>2],e=I[a+4>>2];34821223==b&&2310721022==e||E(`Stack overflow! Stack cookie has been overwritten at ${J(a)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${J(e)} ${J(b)}`);1668509029!=I[0]&&E("Runtime error: The application has corrupted its heap memory area (address zero)!");}}var Ha=new Int16Array(1),Ia=new Int8Array(Ha.buffer);Ha[0]=25459;
if(115!==Ia[0]||99!==Ia[1])throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)";if(l.ENVIRONMENT)throw Error("Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)");
function B(a,b){Object.getOwnPropertyDescriptor(l,a)||Object.defineProperty(l,a,{configurable:true,get(){E(`\`Module.${a}\` has been replaced by \`${b}\``+" (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)");}});}function A(a){Object.getOwnPropertyDescriptor(l,a)&&E(`\`Module.${a}\` was supplied but \`${a}\` not included in INCOMING_MODULE_JS_API`);}
function Ja(a){return "FS_createPath"===a||"FS_createDataFile"===a||"FS_createPreloadedFile"===a||"FS_unlink"===a||"addRunDependency"===a||"FS_createLazyFile"===a||"FS_createDevice"===a||"removeRunDependency"===a}function Ka(a,b){"undefined"==typeof globalThis||Object.getOwnPropertyDescriptor(globalThis,a)||Object.defineProperty(globalThis,a,{configurable:true,get(){b();}});}function La(a,b){Ka(a,()=>{K(`\`${a}\` is not longer defined by emscripten. ${b}`);});}La("buffer","Please use HEAP8.buffer or wasmMemory.buffer");
La("asm","Please use wasmExports instead");function Ma(a){Object.getOwnPropertyDescriptor(l,a)||Object.defineProperty(l,a,{configurable:true,get(){var b=`'${a}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;Ja(a)&&(b+=". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you");E(b);}});}D(!l.STACK_SIZE,"STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time");
D("undefined"!=typeof Int32Array&&"undefined"!==typeof Float64Array&&void 0!=Int32Array.prototype.subarray&&void 0!=Int32Array.prototype.set,"JS engine does not provide full typed array support");D(!l.wasmMemory,"Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally");D(!l.INITIAL_MEMORY,"Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically");var Na=[],Oa=[],Pa=[],L=0,M=null,N={},O=null;
function Qa(){L++;D(!N["wasm-instantiate"]);N["wasm-instantiate"]=1;null===O&&"undefined"!=typeof setInterval&&(O=setInterval(()=>{if(wa)clearInterval(O),O=null;else {var a=false,b;for(b in N)a||(a=true,z("still waiting on run dependencies:")),z(`dependency: ${b}`);a&&z("(end of list)");}},1E4));}function E(a){a="Aborted("+a+")";z(a);wa=true;a=new WebAssembly.RuntimeError(a);ba(a);throw a;}
function Ra(){E("Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with -sFORCE_FILESYSTEM");}l.FS_createDataFile=function(){Ra();};l.FS_createPreloadedFile=function(){Ra();};
function P(a,b){return (...e)=>{D(Da,`native function \`${a}\` called before runtime initialization`);var c=Q[a];D(c,`exported native function \`${a}\` not found`);D(e.length<=b,`native function \`${a}\` called with ${e.length} args but expects ${b}`);return c(...e)}}var Sa;async function Ta(a){try{var b=await ra(a);return new Uint8Array(b)}catch{}if(sa)a=sa(a);else throw "both async and sync fetching of the wasm failed";return a}
async function Ua(a,b){try{var e=await Ta(a);return await WebAssembly.instantiate(e,b)}catch(c){z(`failed to asynchronously prepare wasm: ${c}`),ta(Sa)&&z(`warning: Loading from a file URI (${Sa}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`),E(c);}}
async function Va(a){var b=Sa;if("function"==typeof WebAssembly.instantiateStreaming&&!Ea(b)&&!ta(b))try{var e=fetch(b,{credentials:"same-origin"});return await WebAssembly.instantiateStreaming(e,a)}catch(c){z(`wasm streaming compile failed: ${c}`),z("falling back to ArrayBuffer instantiation");}return Ua(b,a)}
var J=a=>{D("number"===typeof a);return "0x"+(a>>>0).toString(16).padStart(8,"0")},K=a=>{K.A||(K.A={});K.A[a]||(K.A[a]=1,z(a));},R=a=>{if(null===a)return "null";var b=typeof a;return "object"===b||"array"===b||"function"===b?a.toString():""+a},Wa,S=a=>{for(var b="";F[a];)b+=Wa[F[a++]];return b},Xa={},Ya={},T;
function $a(a,b,e={}){var c=b.name;if(!a)throw new T(`type "${c}" must have a positive integer typeid pointer`);if(Ya.hasOwnProperty(a)){if(e.F)return;throw new T(`Cannot register type '${c}' twice`);}Ya[a]=b;Xa.hasOwnProperty(a)&&(b=Xa[a],delete Xa[a],b.forEach(d=>d()));}function U(a,b,e={}){if(void 0===b.h)throw new TypeError("registerType registeredInstance requires argPackAdvance");return $a(a,b,e)}
var ab=(a,b,e)=>{switch(b){case 1:return e?c=>xa[c]:c=>F[c];case 2:return e?c=>G[c>>1]:c=>ya[c>>1];case 4:return e?c=>H[c>>2]:c=>I[c>>2];case 8:return e?c=>Aa[c>>3]:c=>Ba[c>>3];default:throw new TypeError(`invalid integer width (${b}): ${a}`);}},bb=[],V=[],cb=a=>{switch(a){case void 0:return 2;case null:return 4;case true:return 6;case false:return 8;default:const b=bb.pop()||V.length;V[b]=a;V[b+1]=1;return b}};function db(a){return this.fromWireType(I[a>>2])}
for(var eb={name:"emscripten::val",fromWireType:a=>{if(!a)throw new T("Cannot use deleted val. handle = "+a);D(2===a||void 0!==V[a]&&0===a%2,`invalid handle: ${a}`);var b=V[a];9<a&&0===--V[a+1]&&(D(void 0!==V[a],"Decref for unallocated handle."),V[a]=void 0,bb.push(a));return b},toWireType:(a,b)=>cb(b),h:8,readValueFromPointer:db,o:null},fb=(a,b)=>{switch(b){case 4:return function(e){return this.fromWireType(za[e>>2])};case 8:return function(e){return this.fromWireType(Ca[e>>3])};default:throw new TypeError(`invalid float width (${b}): ${a}`);
}},gb="undefined"!=typeof TextDecoder?new TextDecoder:void 0,hb=(a,b=0,e=NaN)=>{var c=b+e;for(e=b;a[e]&&!(e>=c);)++e;if(16<e-b&&a.buffer&&gb)return gb.decode(a.subarray(b,e));for(c="";b<e;){var d=a[b++];if(d&128){var g=a[b++]&63;if(192==(d&224))c+=String.fromCharCode((d&31)<<6|g);else {var f=a[b++]&63;224==(d&240)?d=(d&15)<<12|g<<6|f:(240!=(d&248)&&K("Invalid UTF-8 leading byte "+J(d)+" encountered when deserializing a UTF-8 string in wasm memory to a JS string!"),d=(d&7)<<18|g<<12|f<<6|a[b++]&63);
65536>d?c+=String.fromCharCode(d):(d-=65536,c+=String.fromCharCode(55296|d>>10,56320|d&1023));}}else c+=String.fromCharCode(d);}return c},ib="undefined"!=typeof TextDecoder?new TextDecoder("utf-16le"):void 0,jb=(a,b)=>{D(0==a%2,"Pointer passed to UTF16ToString must be aligned to two bytes!");var e=a>>1;for(var c=e+b/2;!(e>=c)&&ya[e];)++e;e<<=1;if(32<e-a&&ib)return ib.decode(F.subarray(a,e));e="";for(c=0;!(c>=b/2);++c){var d=G[a+2*c>>1];if(0==d)break;e+=String.fromCharCode(d);}return e},kb=(a,b,e)=>{D(0==
b%2,"Pointer passed to stringToUTF16 must be aligned to two bytes!");D("number"==typeof e,"stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");e??=2147483647;if(2>e)return 0;e-=2;var c=b;e=e<2*a.length?e/2:a.length;for(var d=0;d<e;++d)G[b>>1]=a.charCodeAt(d),b+=2;G[b>>1]=0;return b-c},lb=a=>2*a.length,mb=(a,b)=>{D(0==a%4,"Pointer passed to UTF32ToString must be aligned to four bytes!");for(var e=0,c="";!(e>=b/4);){var d=H[a+
4*e>>2];if(0==d)break;++e;65536<=d?(d-=65536,c+=String.fromCharCode(55296|d>>10,56320|d&1023)):c+=String.fromCharCode(d);}return c},nb=(a,b,e)=>{D(0==b%4,"Pointer passed to stringToUTF32 must be aligned to four bytes!");D("number"==typeof e,"stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");e??=2147483647;if(4>e)return 0;var c=b;e=c+e-4;for(var d=0;d<a.length;++d){var g=a.charCodeAt(d);if(55296<=g&&57343>=g){var f=a.charCodeAt(++d);
g=65536+((g&1023)<<10)|f&1023;}H[b>>2]=g;b+=4;if(b+4>e)break}H[b>>2]=0;return b-c},ob=a=>{for(var b=0,e=0;e<a.length;++e){var c=a.charCodeAt(e);55296<=c&&57343>=c&&++e;b+=4;}return b},pb=[null,[],[]],W=[],X,w=a=>{var b=W[a];b||(a>=W.length&&(W.length=a+1),W[a]=b=X.get(a));D(X.get(a)==b,"JavaScript-side Wasm function table mirror is out of date!");return b},Y,qb=[],rb=Array(256),sb=0;256>sb;++sb)rb[sb]=String.fromCharCode(sb);Wa=rb;
T=l.BindingError=class extends Error{constructor(a){super(a);this.name="BindingError";}};l.InternalError=class extends Error{constructor(a){super(a);this.name="InternalError";}};V.push(0,1,void 0,1,null,1,true,1,false,1);D(10===V.length);l.count_emval_handles=()=>V.length/2-5-bb.length;
var ub={_abort_js:()=>E("native code called abort()"),_embind_register_bigint:(a,b,e,c,d)=>{b=S(b);var g=-1!=b.indexOf("u");g&&(d=(1n<<64n)-1n);U(a,{name:b,fromWireType:f=>f,toWireType:function(f,h){if("bigint"!=typeof h&&"number"!=typeof h)throw new TypeError(`Cannot convert "${R(h)}" to ${this.name}`);"number"==typeof h&&(h=BigInt(h));if(h<c||h>d)throw new TypeError(`Passing a number "${R(h)}" from JS side to C/C++ side to an argument of type "${b}", which is outside the valid range [${c}, ${d}]!`);
return h},h:8,readValueFromPointer:ab(b,e,!g),o:null});},_embind_register_bool:(a,b,e,c)=>{b=S(b);U(a,{name:b,fromWireType:function(d){return !!d},toWireType:function(d,g){return g?e:c},h:8,readValueFromPointer:function(d){return this.fromWireType(F[d])},o:null});},_embind_register_emval:a=>U(a,eb),_embind_register_float:(a,b,e)=>{b=S(b);U(a,{name:b,fromWireType:c=>c,toWireType:(c,d)=>{if("number"!=typeof d&&"boolean"!=typeof d)throw new TypeError(`Cannot convert ${R(d)} to ${this.name}`);return d},
h:8,readValueFromPointer:fb(b,e),o:null});},_embind_register_integer:(a,b,e,c,d)=>{b=S(b);-1===d&&(d=4294967295);var g=k=>k;if(0===c){var f=32-8*e;g=k=>k<<f>>>f;}var h=(k,q)=>{if("number"!=typeof k&&"boolean"!=typeof k)throw new TypeError(`Cannot convert "${R(k)}" to ${q}`);if(k<c||k>d)throw new TypeError(`Passing a number "${R(k)}" from JS side to C/C++ side to an argument of type "${b}", which is outside the valid range [${c}, ${d}]!`);};var p=b.includes("unsigned")?function(k,q){h(q,this.name);return q>>>
0}:function(k,q){h(q,this.name);return q};U(a,{name:b,fromWireType:g,toWireType:p,h:8,readValueFromPointer:ab(b,e,0!==c),o:null});},_embind_register_memory_view:(a,b,e)=>{function c(g){return new d(xa.buffer,I[g+4>>2],I[g>>2])}var d=[Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array][b];e=S(e);U(a,{name:e,fromWireType:c,h:8,readValueFromPointer:c},{F:true});},_embind_register_std_string:(a,b)=>{b=S(b);U(a,{name:b,fromWireType:function(e){for(var c=
I[e>>2],d=e+4,g,f=d,h=0;h<=c;++h){var p=d+h;if(h==c||0==F[p]){var k=f;f=p-f;D("number"==typeof k,`UTF8ToString expects a number (got ${typeof k})`);k=k?hb(F,k,f):"";void 0===g?g=k:(g+=String.fromCharCode(0),g+=k);f=p+1;}}Z(e);return g},toWireType:function(e,c){c instanceof ArrayBuffer&&(c=new Uint8Array(c));var d="string"==typeof c;if(!(d||c instanceof Uint8Array||c instanceof Uint8ClampedArray||c instanceof Int8Array))throw new T("Cannot pass non-string to std::string");var g;if(d)for(var f=g=0;f<
c.length;++f){var h=c.charCodeAt(f);127>=h?g++:2047>=h?g+=2:55296<=h&&57343>=h?(g+=4,++f):g+=3;}else g=c.length;h=g;g=tb(4+h+1);f=g+4;I[g>>2]=h;if(d){if(h+=1,D("number"==typeof h,"stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!"),d=f,f=F,D("string"===typeof c,`stringToUTF8Array expects a string (got ${typeof c})`),0<h){h=d+h-1;for(var p=0;p<c.length;++p){var k=c.charCodeAt(p);if(55296<=k&&57343>=k){var q=c.charCodeAt(++p);k=
65536+((k&1023)<<10)|q&1023;}if(127>=k){if(d>=h)break;f[d++]=k;}else {if(2047>=k){if(d+1>=h)break;f[d++]=192|k>>6;}else {if(65535>=k){if(d+2>=h)break;f[d++]=224|k>>12;}else {if(d+3>=h)break;1114111<k&&K("Invalid Unicode code point "+J(k)+" encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).");f[d++]=240|k>>18;f[d++]=128|k>>12&63;}f[d++]=128|k>>6&63;}f[d++]=128|k&63;}}f[d]=0;}}else if(d)for(d=0;d<h;++d){p=c.charCodeAt(d);if(255<
p)throw Z(g),new T("String has UTF-16 code units that do not fit in 8 bits");F[f+d]=p;}else for(d=0;d<h;++d)F[f+d]=c[d];null!==e&&e.push(Z,g);return g},h:8,readValueFromPointer:db,o(e){Z(e);}});},_embind_register_std_wstring:(a,b,e)=>{e=S(e);if(2===b){var c=jb;var d=kb;var g=lb;var f=h=>ya[h>>1];}else 4===b&&(c=mb,d=nb,g=ob,f=h=>I[h>>2]);U(a,{name:e,fromWireType:h=>{for(var p=I[h>>2],k,q=h+4,t=0;t<=p;++t){var C=h+4+t*b;if(t==p||0==f(C))q=c(q,C-q),void 0===k?k=q:(k+=String.fromCharCode(0),k+=q),q=C+b;}Z(h);
return k},toWireType:(h,p)=>{if("string"!=typeof p)throw new T(`Cannot pass non-string to C++ string type ${e}`);var k=g(p),q=tb(4+k+b);I[q>>2]=k/b;d(p,q+4,k+b);null!==h&&h.push(Z,q);return q},h:8,readValueFromPointer:db,o(h){Z(h);}});},_embind_register_void:(a,b)=>{b=S(b);U(a,{H:true,name:b,h:0,fromWireType:()=>{},toWireType:()=>{}});},emscripten_resize_heap:a=>{E(`Cannot enlarge memory arrays to size ${a>>>0} bytes (OOM). Either (1) compile with -sINITIAL_MEMORY=X with X higher than the current value ${xa.length}, (2) compile with -sALLOW_MEMORY_GROWTH which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with -sABORTING_MALLOC=0`);},
fd_close:()=>{E("fd_close called without SYSCALLS_REQUIRE_FILESYSTEM");},fd_seek:function(){return 70},fd_write:(a,b,e,c)=>{for(var d=0,g=0;g<e;g++){var f=I[b>>2],h=I[b+4>>2];b+=8;for(var p=0;p<h;p++){var k=a,q=F[f+p],t=pb[k];D(t);0===q||10===q?((1===k?ua:z)(hb(t)),t.length=0):t.push(q);}d+=h;}I[c>>2]=d;return 0},platform_connect_headset:function(a){ma(x,a);},platform_disconnect_headset:function(){var a=x;v=void 0;a.device?(u(a,1,"Disconnecting Headset"),a.device.close(),a.device=null,a=true):a=false;return a},
platform_log_msg:function(a,b,e){var c=x;b=new Uint8Array(n.g.HEAPU8.buffer,b,e);let d="";for(var g=0;g<e;g++)d+=String.fromCharCode(b[g]);a<c.B||(3==a?console.error(d):2==a?console.warn(d):1==a?console.info(d):console.log(d));},platform_rand:function(){return Math.floor(4294967295*Math.random())},platform_register_input_report_cb:function(a){u(x,1,`registerInputReportCb: ${a}`);a?ia=w(a):ia=void 0;},platform_retry_connect_headset:function(){return na()},platform_send_report:function(a,b,e){var c=x;
b=new Uint8Array(n.g.HEAPU8.buffer,b,e);oa(c,a,b);},platform_send_report_delayed:function(a,b,e,c,d){pa(a,b,e,c,d);},platform_set_log_level:function(a){x.B=a;}},Q;
(async function(){Qa();var a={env:ub,wasi_snapshot_preview1:ub};Sa??=l.locateFile?Ea("call_control_sdk.wasm")?"call_control_sdk.wasm":y+"call_control_sdk.wasm":(new URL("call_control_sdk.wasm",import.meta.url)).href;try{var b=await Va(a);D(l===l,"the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");Q=b.instance.exports;va=Q.memory;D(va,"memory not found in wasm exports");var e=va.buffer;l.HEAP8=xa=new Int8Array(e);l.HEAP16=G=
new Int16Array(e);l.HEAPU8=F=new Uint8Array(e);l.HEAPU16=ya=new Uint16Array(e);l.HEAP32=H=new Int32Array(e);l.HEAPU32=I=new Uint32Array(e);l.HEAPF32=za=new Float32Array(e);l.HEAPF64=Ca=new Float64Array(e);l.HEAP64=Aa=new BigInt64Array(e);l.HEAPU64=Ba=new BigUint64Array(e);X=Q.__indirect_function_table;D(X,"table not found in wasm exports");Oa.unshift(Q.__wasm_call_ctors);L--;D(N["wasm-instantiate"]);delete N["wasm-instantiate"];0==L&&(null!==O&&(clearInterval(O),O=null),M&&(a=M,M=null,a()));return Q}catch(c){return ba(c),
Promise.reject(c)}})();l._connect_headset=P("connect_headset",1);l._disconnect_headset=P("disconnect_headset",0);l._set_call_state=P("set_call_state",1);l._set_mute_state=P("set_mute_state",1);l._register_event_handler=P("register_event_handler",1);var tb=l._malloc=P("malloc",1),Z=l._free=P("free",1),vb=()=>(vb=Q.emscripten_stack_init)(),Ga=()=>(Ga=Q.emscripten_stack_get_end)();
l.addFunction=(a,b)=>{D("undefined"!=typeof a);if(!Y){Y=new WeakMap;var e=X.length;if(Y)for(var c=0;c<0+e;c++){var d=w(c);d&&Y.set(d,c);}}if(e=Y.get(a)||0)return e;if(qb.length)e=qb.pop();else {try{X.grow(1);}catch(h){if(!(h instanceof RangeError))throw h;throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";}e=X.length-1;}try{c=e,X.set(c,a),W[c]=X.get(c);}catch(h){if(!(h instanceof TypeError))throw h;D("undefined"!=typeof b,"Missing signature argument to addFunction: "+a);if("function"==typeof WebAssembly.Function){c=
WebAssembly.Function;d={i:"i32",j:"i64",f:"f32",d:"f64",e:"externref",p:"i32"};for(var g={parameters:[],results:"v"==b[0]?[]:[d[b[0]]]},f=1;f<b.length;++f)D(b[f]in d,"invalid signature char: "+b[f]),g.parameters.push(d[b[f]]);b=new c(g,a);}else {c=[1];d=b.slice(0,1);b=b.slice(1);g={i:127,p:127,j:126,f:125,d:124,e:111};c.push(96);f=b.length;D(16384>f);128>f?c.push(f):c.push(f%128|128,f>>7);for(f=0;f<b.length;++f)D(b[f]in g,"invalid signature char: "+b[f]),c.push(g[b[f]]);"v"==d?c.push(0):c.push(1,g[d]);
b=[0,97,115,109,1,0,0,0,1];d=c.length;D(16384>d);128>d?b.push(d):b.push(d%128|128,d>>7);b.push(...c);b.push(2,7,1,1,101,1,102,0,0,7,5,1,1,102,0,0);b=new WebAssembly.Module(new Uint8Array(b));b=(new WebAssembly.Instance(b,{e:{f:a}})).exports.f;}c=e;X.set(c,b);W[c]=X.get(c);}Y.set(a,e);return e};l.removeFunction=a=>{Y.delete(w(a));X.set(a,null);W[a]=X.get(a);qb.push(a);};
"writeI53ToI64 writeI53ToI64Clamped writeI53ToI64Signaling writeI53ToU64Clamped writeI53ToU64Signaling readI53FromI64 readI53FromU64 convertI32PairToI53 convertI32PairToI53Checked convertU32PairToI53 stackSave stackRestore stackAlloc getTempRet0 setTempRet0 zeroMemory exitJS growMemory strError inetPton4 inetNtop4 inetPton6 inetNtop6 readSockaddr writeSockaddr emscriptenLog readEmAsmArgs jstoi_q getExecutableName listenOnce autoResumeAudioContext getDynCaller dynCall handleException keepRuntimeAlive runtimeKeepalivePush runtimeKeepalivePop callUserCallback maybeExit asmjsMangle asyncLoad mmapAlloc HandleAllocator getNativeTypeSize STACK_SIZE STACK_ALIGN POINTER_SIZE ASSERTIONS getCFunc ccall cwrap reallyNegative unSign strLen reSign formatString intArrayFromString intArrayToString AsciiToString stringToAscii stringToNewUTF8 stringToUTF8OnStack writeArrayToMemory registerKeyEventCallback maybeCStringToJsString findEventTarget getBoundingClientRect fillMouseEventData registerMouseEventCallback registerWheelEventCallback registerUiEventCallback registerFocusEventCallback fillDeviceOrientationEventData registerDeviceOrientationEventCallback fillDeviceMotionEventData registerDeviceMotionEventCallback screenOrientation fillOrientationChangeEventData registerOrientationChangeEventCallback fillFullscreenChangeEventData registerFullscreenChangeEventCallback JSEvents_requestFullscreen JSEvents_resizeCanvasForFullscreen registerRestoreOldStyle hideEverythingExceptGivenElement restoreHiddenElements setLetterbox softFullscreenResizeWebGLRenderTarget doRequestFullscreen fillPointerlockChangeEventData registerPointerlockChangeEventCallback registerPointerlockErrorEventCallback requestPointerLock fillVisibilityChangeEventData registerVisibilityChangeEventCallback registerTouchEventCallback fillGamepadEventData registerGamepadEventCallback registerBeforeUnloadEventCallback fillBatteryEventData battery registerBatteryEventCallback setCanvasElementSize getCanvasElementSize jsStackTrace getCallstack convertPCtoSourceLocation getEnvStrings checkWasiClock wasiRightsToMuslOFlags wasiOFlagsToMuslOFlags initRandomFill randomFill safeSetTimeout setImmediateWrapped safeRequestAnimationFrame clearImmediateWrapped registerPostMainLoop registerPreMainLoop getPromise makePromise idsToPromises makePromiseCallback ExceptionInfo findMatchingCatch Browser_asyncPrepareDataCounter isLeapYear ydayFromDate arraySum addDays getSocketFromFD getSocketAddress ALLOC_NORMAL ALLOC_STACK allocate writeStringToMemory writeAsciiToMemory setErrNo demangle stackTrace getTypeName getFunctionName getFunctionArgsName heap32VectorToArray requireRegisteredType usesDestructorStack createJsInvokerSignature checkArgCount getRequiredArgCount createJsInvoker throwUnboundTypeError ensureOverloadTable exposePublicSymbol replacePublicSymbol extendError createNamedFunction getBasestPointer registerInheritedInstance unregisterInheritedInstance getInheritedInstance getInheritedInstanceCount getLiveInheritedInstances enumReadValueFromPointer runDestructors craftInvokerFunction embind__requireFunction genericPointerToWireType constNoSmartPtrRawPointerToWireType nonConstNoSmartPtrRawPointerToWireType init_RegisteredPointer RegisteredPointer RegisteredPointer_fromWireType runDestructor releaseClassHandle detachFinalizer attachFinalizer makeClassHandle init_ClassHandle ClassHandle throwInstanceAlreadyDeleted flushPendingDeletes setDelayFunction RegisteredClass shallowCopyInternalPointer downcastPointer upcastPointer validateThis char_0 char_9 makeLegalFunctionName getStringOrSymbol emval_get_global emval_returnValue emval_lookupTypes emval_addMethodCaller".split(" ").forEach(function(a){Ka(a,()=>
{var b=`\`${a}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`,e=a;e.startsWith("_")||(e="$"+a);b+=` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${e}')`;Ja(a)&&(b+=". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you");K(b);});Ma(a);});"run addOnPreRun addOnInit addOnPreMain addOnExit addOnPostRun addRunDependency removeRunDependency out err callMain abort wasmMemory wasmExports writeStackCookie checkStackCookie INT53_MAX INT53_MIN bigintToI53Checked ptrToString getHeapMax abortOnCannotGrowMemory ENV ERRNO_CODES DNS Protocols Sockets timers warnOnce readEmAsmArgsArray jstoi_s alignMemory wasmTable noExitRuntime uleb128Encode sigToWasmTypes generateFuncType convertJsFunctionToWasm freeTableIndexes functionsInTableMap getEmptyTableSlot updateTableMap getFunctionAddress setValue getValue PATH PATH_FS UTF8Decoder UTF8ArrayToString UTF8ToString stringToUTF8Array stringToUTF8 lengthBytesUTF8 UTF16Decoder UTF16ToString stringToUTF16 lengthBytesUTF16 UTF32ToString stringToUTF32 lengthBytesUTF32 JSEvents specialHTMLTargets findCanvasEventTarget currentFullscreenStrategy restoreOldWindowedStyle UNWIND_CACHE ExitStatus flush_NO_FILESYSTEM emSetImmediate emClearImmediate_deps emClearImmediate promiseMap uncaughtExceptionCount exceptionLast exceptionCaught Browser getPreloadedImageData__data wget MONTH_DAYS_REGULAR MONTH_DAYS_LEAP MONTH_DAYS_REGULAR_CUMULATIVE MONTH_DAYS_LEAP_CUMULATIVE SYSCALLS allocateUTF8 allocateUTF8OnStack print printErr InternalError BindingError throwInternalError throwBindingError registeredTypes awaitingDependencies typeDependencies tupleRegistrations structRegistrations sharedRegisterType whenDependentTypesAreResolved embind_charCodes embind_init_charCodes readLatin1String UnboundTypeError PureVirtualError GenericWireTypeSize EmValType EmValOptionalType embindRepr registeredInstances registeredPointers registerType integerReadValueFromPointer floatReadValueFromPointer readPointer finalizationRegistry detachFinalizer_deps deletionQueue delayFunction emval_freelist emval_handles emval_symbols init_emval count_emval_handles Emval emval_methodCallers reflectConstruct".split(" ").forEach(Ma);
var wb;function xb(){if(0<L)M=xb;else {vb();var a=Ga();D(0==(a&3));0==a&&(a+=4);I[a>>2]=34821223;I[a+4>>2]=2310721022;for(I[0]=1668509029;0<Na.length;)Na.shift()(l);if(0<L)M=xb;else {D(!wb);wb=true;l.calledRun=true;if(!wa){D(!Da);Da=true;for(Fa();0<Oa.length;)Oa.shift()(l);aa(l);D(!l._main,'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');for(Fa();0<Pa.length;)Pa.shift()(l);}Fa();}}}xb();moduleRtn=ca;
for(const a of Object.keys(l))a in moduleArg||Object.defineProperty(moduleArg,a,{configurable:true,get(){E(`Access to module property ('${a}') is no longer possible via the module constructor argument; Instead, use the result of the module constructor.`);}});


  return moduleRtn;
}
);
})();
(() => {
  // Create a small, never-async wrapper around initPlatform which
  // checks for callers incorrectly using it with `new`.
  var real_initPlatform = initPlatform;
  initPlatform = function(arg) {
    if (new.target) throw new Error("initPlatform() should not be called with `new initPlatform()`");
    return real_initPlatform(arg);
  };
})();

/**
 * The state of the call to be sent to the headset.
 */
var CallState;
(function (CallState) {
    CallState[CallState["IDLE"] = 0] = "IDLE";
    CallState[CallState["INCOMING"] = 1] = "INCOMING";
    CallState[CallState["OUTGOING"] = 2] = "OUTGOING";
    CallState[CallState["ACTIVE"] = 3] = "ACTIVE";
    CallState[CallState["ACTIVE_AND_INCOMING"] = 4] = "ACTIVE_AND_INCOMING";
    CallState[CallState["ACTIVE_AND_HELD"] = 5] = "ACTIVE_AND_HELD";
    CallState[CallState["HELD"] = 6] = "HELD";
})(CallState || (CallState = {}));
/**
 * Events from the headset, such as commands from user interaction.
 */
var SdkEvent;
(function (SdkEvent) {
    SdkEvent[SdkEvent["ANSWER"] = 0] = "ANSWER";
    SdkEvent[SdkEvent["TERMINATE"] = 1] = "TERMINATE";
    SdkEvent[SdkEvent["REJECT"] = 2] = "REJECT";
    SdkEvent[SdkEvent["HOLD"] = 3] = "HOLD";
    SdkEvent[SdkEvent["RESUME"] = 4] = "RESUME";
    SdkEvent[SdkEvent["REDIAL"] = 5] = "REDIAL";
    SdkEvent[SdkEvent["FLASH"] = 6] = "FLASH";
    SdkEvent[SdkEvent["MUTE"] = 7] = "MUTE";
    SdkEvent[SdkEvent["UNMUTE"] = 8] = "UNMUTE";
    SdkEvent[SdkEvent["DISCONNECT"] = 9] = "DISCONNECT";
    SdkEvent[SdkEvent["CONNECT_SUCCESS"] = 10] = "CONNECT_SUCCESS";
    SdkEvent[SdkEvent["CONNECT_FAILED"] = 11] = "CONNECT_FAILED";
})(SdkEvent || (SdkEvent = {}));
/**
 * The default export from the module.
 * Making extra instances of this class is not useful,
 * all instances will talk to the same headset.
 */
class CallControlSdk {
    static ccSdkModule = undefined;
    static callbacks = new WeakMap();
    static async load() {
        if (!CallControlSdk.ccSdkModule) {
            CallControlSdk.ccSdkModule = await initPlatform();
        }
    }
    get module() {
        return CallControlSdk.ccSdkModule;
    }
    async connectHeadset(headset) {
        let result = false;
        await CallControlSdk.load();
        if (!headset) {
            // If the device is not provided, prompt the user to select one.
            // VID PLT, Poly comm, HP
            const deviceFilters = [{ "vendorId": 0x047f }, { "vendorId": 0x095d }, { "vendorId": 0x03f0 }];
            let devices = await navigator.hid.requestDevice({ filters: deviceFilters });
            headset = devices[0];
        }
        if (headset instanceof HIDDevice) {
            // If we're provided with a device, then we add the internal custom event listener
            // so that the actual implementation can identify it correctly.
            headset.addEventListener("ccsdkSelectDeviceEvent", (event) => {
                event.preventDefault();
                if (event instanceof CustomEvent && event.detail) {
                    event.detail.isSelectedDevice = true;
                }
            }, {
                capture: true,
                once: true,
                passive: false
            });
            result = this.module?._connect_headset(0) == 0 ? false : true;
        }
        else {
            console.warn("CCSDK: Unable to open a headset when one is not selected / defined.");
            return result;
        }
        return result;
    }
    /**
     * Disconnect the current headset and free SDK memory.
     *
     * @returns Promise<boolean> true on success
    */
    async disconnectHeadset() {
        if (!this.module)
            return false;
        let success = this.module?._disconnect_headset();
        return success ? true : false;
    }
    /**
     * Register handler for SDK Events. This must be done before calling connect.
     *
     * @param event_handler A callback to receive the events from the headset.
     * @returns Promise<boolean> true on success.
     */
    async registerEventHandler(handler) {
        await CallControlSdk.load();
        const wrapper = function (sdkEvent) {
            return handler(sdkEvent);
        };
        const wrapperPtr = this.module?.addFunction(wrapper, "vi");
        CallControlSdk.callbacks.set(handler, wrapperPtr);
        let success = this.module?._register_event_handler(wrapperPtr);
        return success ? true : false;
    }
    /**
     * Informs the headset of the client app's current call state. This needs to be set even if the new state is a result of a SDK Event.
     *
     * @param call_state current call state.
     * @returns Promise<boolean> true on success
    */
    async setCallState(callState) {
        if (!this.module)
            return false;
        let success = this.module?._set_call_state(callState);
        return success ? true : false;
    }
    /**
    * Informs the headset of the client app's current mute state. This needs to be set even if the new state is a result of a SDK Event.
    *
    * @param mute_state current mute state.
    * @returns Promise<boolean> true on success
    */
    async setMuteState(muteState) {
        if (!this.module)
            return false;
        let success = this.module?._set_mute_state(muteState ? 1 : 0);
        return success ? true : false;
    }
}

export { CallControlSdk, CallState, SdkEvent, CallControlSdk as default };
