var initPlatform = (() => {
  var _scriptName = import.meta.url;
  
  return (
async function(moduleArg = {}) {
  var moduleRtn;

var l=moduleArg,aa,ba,ca=new Promise((a,b)=>{aa=a;ba=b;}),da="object"==typeof window,ea="undefined"!=typeof WorkerGlobalScope,fa="object"==typeof process&&"object"==typeof process.V&&"string"==typeof process.V.node&&"renderer"!=process.type,ha=!da&&!fa&&!ea;function ia(a){m(a.g,"bt_device: cleanupConnection called");a.l.removeEventListener("gattserverdisconnected",a.P);a.o=null;a.K=null;a.u=null;a.G=null;a.opened=false;a.B=Promise.resolve();a.g.bt_device_disconnect(a);}
class ja{constructor(a){this.l=window.__ccsdkBluetoothDevice;this.g=a;this.K=this.o=this.G=this.u=null;this.B=Promise.resolve();this.J=null;this.L=this.T.bind(this);this.P=this.S.bind(this);this.collections=[];this.vendorId=0;null==this.l.name?this.vendorId=1008:this.l.name.includes("Poly ")?this.vendorId=1151:this.vendorId=1008;this.productName=this.l.name||"Bluetooth Device";this.opened=false;}async open(){m(this.g,"bt_device: open called");let a=false;if(this.l.gatt instanceof BluetoothRemoteGATTServer)try{this.l.addEventListener("gattserverdisconnected",
this.P);const b=async(c,d,e)=>{let f;const g=new Promise((h,n)=>{f=setTimeout(()=>n(Error(`${e} timed out after ${d}ms`)),d);});try{return await Promise.race([c,g])}finally{clearTimeout(f);}};if(this.l.gatt.connected)this.u=this.l.gatt;else {let c=false;try{this.u=await this.l.gatt.connect(),this.l.gatt.connected||(c=true);}catch(d){c=true,p(this.g,"Bluetooth device.gatt.connect() failed: "+d);}if(c)try{this.l.watchingAdvertisements||await this.l.watchAdvertisements();const d=new Promise(e=>{const f=()=>{this.l.removeEventListener("advertisementreceived",
f);e();};this.l.addEventListener("advertisementreceived",f);});await b(d,1E4,"advertisementreceived");this.u=await this.l.gatt.connect();}finally{try{this.l.watchingAdvertisements&&this.l.unwatchAdvertisements();}catch(d){}}}this.G=await b(this.u.getPrimaryService("23c1b9c0-4e04-4a93-91c3-b85e32a5f7b7"),1E4,"getPrimaryService");this.o=await b(this.G.getCharacteristic("23c1b9c0-4e04-4a93-91c3-b85e32a5f7d7"),1E4,"getCharacteristic(RX)");this.K=await b(this.G.getCharacteristic("23c1b9c0-4e04-4a93-91c3-b85e32a5f7c7"),
1E4,"getCharacteristic(TX)");this.G&&(this.collections=[{usagePage:65307,usage:1,type:1,inputReports:[{reportId:1,items:[{usages:[4279959745],reportSize:8,reportCount:3,isAbsolute:true}]}],outputReports:[{reportId:1,items:[{usages:[4279959745],reportSize:8,reportCount:3,isAbsolute:true}]}],featureReports:[]}],a=true);null!=this.J&&(await this.o.startNotifications(),this.o.addEventListener("characteristicvaluechanged",this.L));}catch(b){p(this.g,"Error during Bluetooth device connection: "+b),ia(this),a=
false;}else p(this.g,"Bluetooth device does not have a valid GATT server");this.opened=a;m(this.g,"bt_device: open completed with opened="+this.opened);return Promise.resolve()}S(){m(this.g,"bt_device: gatt disconnected called");ia(this);}async close(){m(this.g,"bt_device: close called");try{if(this.u&&this.u.connected){if(this.o&&(await this.o.stopNotifications(),this.o.removeEventListener("characteristicvaluechanged",this.L)),this.B)try{const a=new Promise(b=>setTimeout(b,5E3));await Promise.race([this.B.catch(()=>
{}),a]);}catch(a){p(this.g,"Error waiting for write queue to drain: "+a);}}else m(this.g,"Bluetooth device already disconnected");ia(this);}catch(a){p(this.g,"Error during Bluetooth device disconnection: "+a),ia(this);}this.opened=false;return Promise.resolve()}async receiveFeatureReport(){p(this.g,"receiveFeatureReport called and not supported in Bluetooth");return Promise.resolve(new DataView(new ArrayBuffer(0)))}async sendReport(a,b){const c=new Uint8Array(b);this.g.h(`bt_device: sendReport called data ${c[0]} ${c[1]} ${c[2]}`);
if(!this.K)return  false;this.B=this.B.then(async()=>{for(var d=0;;)try{await this.K.writeValueWithResponse(c);break}catch(e){if(/already in progress/i.test(e?.message||"")&&20>d)d++,this.g.h(`Write in progress, retrying... (${d})`),await new Promise(f=>setTimeout(f,100));else throw e;}});try{await this.B,this.g.h("write complete");}catch(d){p(this.g,"BLECallControlSdk write error");}return Promise.resolve()}async addEventListener(a,b){m(this.g,`bt_device: addEventListener called for type ${a}`);this.opened&&
this.o?(await this.o.startNotifications(),this.J=b,this.o.addEventListener("characteristicvaluechanged",this.L)):p(this.g,"Cannot add event listener: device not opened or notify characteristic not available");}async T(a){try{this.J&&this.J({reportId:1,data:a.target.value});}catch(b){p(this.g,"Error in notification handler: "+b);}}removeEventListener(a){m(this.g,`bt_device: removeEventListener called for type ${a}`);}}
function ka(a,b,c,d){if(a)for(const e of a)if(e.items)for(const f of e.items)if(f.usages&&0!==f.usages.length)for(const g of f.usages)g in b&&(c[b[g]]={reportId:e.reportId,usage:g},d[e.reportId]={reportItems:e.items,lastReportData:void 0});}function m(a,b){r(a,la,b);}function p(a,b){r(a,ma,b);}
async function na(a,b){b.device==a.device&&(m(a,"Device disconnected"),a.g&&(clearTimeout(a.g),a.g=null),"function"===typeof t?(a.F=a.device.productName,t(u,0)):void 0!=t&&a.m(`_connectHeadsetCb loc 1 is not a function: ${typeof t}`),a.device=null);}
function oa(a,b,c,d,e){ void 0==c[a].lastReportData&&(c[a].lastReportData=[]);if(c[a].reportItems){var f=0;for(const n of c[a].reportItems)if(0!=n.reportCount&&0!=n.reportSize&&n.usages&&0!=n.usages.length)for(let k=0;k<n.usages.length;k++){var g=0;k+1<n.usages.length?g=n.reportSize:g=n.reportSize*(n.reportCount-k);var h=n.usages[k];if(h in d){h=d[h];let q=Math.trunc((g+7)/8),v=new Uint8Array(q);for(let E=0;E<g;E++)1==(b[Math.trunc(f/8)]>>f%8&1)&&(v[Math.trunc(E/8)]|=1<<E%8),f++;if(h==pa||e==qa||void 0==
c[a].lastReportData[h]||c[a].lastReportData[h]!=v.toString())g=w._malloc(q),w.HEAPU8.set(v,g),ra(`calling input callback for ccsdk_usage ${h} with data ${v}`),"function"===typeof x?x(u,h,g,q,n.isAbsolute):void 0!==x&&sa(`_inputReportCb is not a function: ${typeof x}`),w._free(g),c[a].lastReportData[h]=v.toString();}else f+=g;}}}
async function ta(a,b){a.h(`Requesting feature report ${b}`);const c=await a.device.receiveFeatureReport(b);a.h(c);if(1<c.byteLength&&c.getUint8(0)==b){const d=new Uint8Array(c.byteLength-1);for(let e=1;e<c.byteLength;++e)d[e-1]=c.getUint8(e);b in a.H&&oa(b,d,a.H,ua,qa);}}
function va(a,b,c,d,e){m(a,"platformConnectHeadset");if(b)if("number"==typeof b)t=y(b),"function"!==typeof t&&a.m(`getWasmTableEntry(${b}) returned non-function: ${t}`);else if("function"==typeof b)t=b;else return p(a,"Invalid callback type"),false;else t=void 0;if(c)if("number"==typeof c)x=y(c),"function"!==typeof x&&a.m(`getWasmTableEntry(${c}) returned non-function for inputCb: ${x}`);else if("function"==typeof c)x=c;else return p(a,"Invalid input callback type"),false;else x=void 0;void 0!==e&&w.setValue(e,
u,"i32");a.g&&(clearTimeout(a.g),a.g=null);(async function(){this.device&&(await this.device.close(),this.m("Open called while a device is opened, calling close."));if(d!==wa&&window.__ccsdkBluetoothDevice)this.device=new ja(this),window.__ccsdkBluetoothDevice=void 0;else {var f=await navigator.hid.getDevices(),g=new CustomEvent("ccsdkSelectDeviceEvent",{cancelable:true,detail:{isSelectedDevice:false}});for(const n of f)if(n.dispatchEvent(g),g.detail.isSelectedDevice){this.device=n;break}}if(this.device){this.M=
{};this.C={};this.D={};this.I={};this.v={};this.H={};if(1151!==this.device.vendorId&&2397!==this.device.vendorId&&1008!==this.device.vendorId)return p(this,`Device vendor ID 0x${this.device.vendorId.toString(16).padStart(4,"0")} not supported`),this.device=null,0;await this.device.open();if(!this.device||!this.device.opened)return 0;this.device.addEventListener("inputreport",this.N);m(this,this.device);this.F=null;f=0;for(var h of this.device.collections)g=true,m(this,`----\nDevice collection\nUsage page ${"0x"+
h.usagePage.toString(16).padStart(4,"0")}\nUsage: ${"0x"+h.usage.toString(16).padStart(4,"0")}\nType: ${"0x"+h.type.toString(16).padStart(4,"0")}`),11==h.usagePage?(f|=xa,this.h("hasTelephonyDevice")):65440==h.usagePage?(f|=ya,this.h("hasHIDLegacy")):65442==h.usagePage?(f|=za,this.h("hasHID2")):65307==h.usagePage?(f|=Aa,this.h("hasTelephonyReplicant")):g=false,1==g&&(ka(h.inputReports,Ba,this.M,this.I),ka(h.outputReports,Ca,this.C,this.v),ka(h.featureReports,ua,this.D,this.H));this.h(this.M);this.h(this.C);
this.h(this.D);h=za|ya;(f&h)==h&&(f&=~ya);return f}p(this,"Unable to find selected device");"function"===typeof t?t(u,0):void 0!==t&&this.m(`_connectHeadsetCb loc 3 is not a function: ${typeof t}`);}).call(a).then(f=>{0!==f&&a.device&&(a.g=setTimeout(()=>{p(a,"Connection confirmation timeout.");a.g=null;a.device&&(a.device.close(),a.device=null);"function"===typeof t?t(u,0):void 0!==t&&a.m(`_connectHeadsetCb loc 4 is not a function: ${typeof t}`);},1E4));"function"===typeof t?t(u,f):void 0!==t&&a.m(`_connectHeadsetCb loc 5 is not a function: ${typeof t}`);});
return  true}
function Da(){var a=z;m(a,"platformRetryConnectHeadset");let b=t,c=x;setTimeout(async function(){if(this.F){m(this,`Trying to reconnect to last device ${this.F}`);let d=null,e=await navigator.hid.getDevices();for(const f of e)if(null==this.device&&0==f.productName.localeCompare(this.F))if(this.h(f),null==d)d=f;else {this.m("Multiple devices with same name found cannot reconnect.");d=null;break}null!=d&&(d.addEventListener("ccsdkSelectDeviceEvent",f=>{f.preventDefault();f instanceof CustomEvent&&f.detail&&
(f.detail.isSelectedDevice=true);},{capture:true,once:true,passive:false}),va(this,b,c));}}.bind(a),1500);return  true}function r(a,b,c){b<a.R||(b==ma?console.error(c):b==Ea?console.warn(c):b==la?console.info(c):console.log(c));}
function Fa(a,b,c){a.h(`platformSendReportImp: ${c}`);if(b in a.C){const g=a.C[b].reportId;if(void 0==a.v[g].lastReportData){var d=0;for(var e of a.v[g].reportItems)d+=e.reportCount*e.reportSize;d=new Uint8Array(Math.trunc((d+7)/8));}else d=a.v[g].lastReportData;let h=e=0;for(const n of a.v[g].reportItems)for(let k=0;k<n.usages.length;k++){var f=0;k+1<n.usages.length?f=n.reportSize:f=n.reportSize*(n.reportCount-k);if(a.C[b].usage==n.usages[k]){f=e+f;for(let q=e;q<f;q++)d[Math.trunc(e/8)]=0==(c[Math.trunc(h/
8)]>>h%8&1)?d[Math.trunc(e/8)]&~(1<<e%8):d[Math.trunc(e/8)]|1<<e%8,h++,e++;}else e+=f;}a.v[g].lastReportData=d;a.h(`setOutReport: ${g} ${d}`);a.device.sendReport(g,d);}else b in a.D&&(b=a.D[b].reportId,a.h(`featureReportreq: ${b}`),ta(a,b));}
function Ga(a,b,c,d,e,f){var g=z;g.h("platformSendReportDelayed");b=new Uint8Array(w.HEAPU8.buffer,b,c);const h=new Uint8Array(b);setTimeout(()=>{if(e){let n=y(e);"function"===typeof n?n(f):g.m(`WASM callback ${e} is no longer valid.`);}g.h(`platformSendReportDelayed: usage:${a} reportData:${h}`);Fa(g,a,h);},d);}
class Platform{constructor(){this.N=this.N.bind(this);ra=this.h.bind(this);sa=this.m.bind(this);this.g=this.F=this.device=null;this.M={};this.C={};this.D={};this.I={};this.v={};this.H={};this.R=0;navigator.hid.addEventListener("disconnect",a=>{na(this,a);});}bt_device_disconnect(a){this.device==a&&(m(this,"Device disconnected"),this.g&&(clearTimeout(this.g),this.g=null),"function"===typeof t?t(u,0):void 0!=t&&this.m(`_connectHeadsetCb loc 2 is not a function: ${typeof t}`),this.device=null);}N(a){let b=
a.reportId;a=a.data;const c=new Uint8Array(a.byteLength);for(let d=0;d<a.byteLength;++d)c[d]=a.getUint8(d);b in this.I&&(this.h(`onInputReport id:${b} data:${c}`),oa(b,c,this.I,Ba,Ha));}h(a){r(this,Ia,a);}m(a){r(this,Ea,a);}}
var ra,sa,w=l,x=void 0,t=void 0,u=65535,pa=7,Ia=0,la=1,Ea=2,ma=3,Ha=0,qa=2,wa=0,xa=1,za=2,Aa=4,ya=16,Ba={720928:0,720943:1,720929:2,720932:4,720903:5,589831:5,4288676023:20,4288676019:21,4288807055:8,4288807095:9,4288807009:9,4288807068:11,4288807091:13,4288807133:15,4279959745:7},Ca={524311:0,524297:1,524312:3,524320:6,4288807132:17,4288807093:10,4288807070:14,4288806946:16,4288806996:18,4279959745:7},ua={4288807093:12,4288807055:19};const z=new Platform;var Ja=Object.assign({},l),A="",Ka,La;
if(ha){if("object"==typeof process&&"function"===typeof require||"object"==typeof window||"undefined"!=typeof WorkerGlobalScope)throw Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");}else if(da||ea){ea?A=self.location.href:"undefined"!=typeof document&&document.currentScript&&(A=document.currentScript.src);_scriptName&&(A=_scriptName);A.startsWith("blob:")?
A="":A=A.slice(0,A.replace(/[?#].*/,"").lastIndexOf("/")+1);if("object"!=typeof window&&"undefined"==typeof WorkerGlobalScope)throw Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");ea&&(La=a=>{var b=new XMLHttpRequest;b.open("GET",a,false);b.responseType="arraybuffer";b.send(null);return new Uint8Array(b.response)});Ka=async a=>{if(Ma(a))return new Promise((c,
d)=>{var e=new XMLHttpRequest;e.open("GET",a,true);e.responseType="arraybuffer";e.onload=()=>{200==e.status||0==e.status&&e.response?c(e.response):d(e.status);};e.onerror=d;e.send(null);});var b=await fetch(a,{credentials:"same-origin"});if(b.ok)return b.arrayBuffer();throw Error(b.status+" : "+b.url);};}else throw Error("environment detection error");var Na=console.log.bind(console),B=console.error.bind(console);Object.assign(l,Ja);Ja=null;C("ENVIRONMENT");C("GL_MAX_TEXTURE_IMAGE_UNITS");C("SDL_canPlayWithWebAudio");
C("SDL_numSimultaneouslyQueuedBuffers");C("INITIAL_MEMORY");C("wasmMemory");C("arguments");C("buffer");C("canvas");C("doNotCaptureKeyboard");C("dynamicLibraries");C("elementPointerLock");C("extraStackTrace");C("forcedAspectRatio");C("instantiateWasm");C("keyboardListeningElement");C("freePreloadedMediaOnUse");C("loadSplitModule");C("locateFile");C("logReadFiles");C("mainScriptUrlOrBlob");C("mem");C("monitorRunDependencies");C("noExitRuntime");C("noInitialRun");C("onAbort");C("onCustomMessage");C("onExit");
C("onFree");C("onFullScreen");C("onMalloc");C("onRealloc");C("onRuntimeInitialized");C("postMainLoop");C("postRun");C("preInit");C("preMainLoop");C("preRun");C("preinitializedWebGLContext");C("preloadPlugins");C("print");C("printErr");C("setStatus");C("statusMessage");C("stderr");C("stdin");C("stdout");C("thisProgram");C("wasm");C("wasmBinary");C("websocket");C("fetchSettings");D("arguments","arguments_");D("thisProgram","thisProgram");F("undefined"==typeof l.memoryInitializerPrefixURL,"Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");
F("undefined"==typeof l.pthreadMainPrefixURL,"Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");F("undefined"==typeof l.cdInitializerPrefixURL,"Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");F("undefined"==typeof l.filePackagePrefixURL,"Module.filePackagePrefixURL option was removed, use Module.locateFile instead");F("undefined"==typeof l.read,"Module.read option was removed");F("undefined"==typeof l.readAsync,"Module.readAsync option was removed (modify readAsync in JS)");
F("undefined"==typeof l.readBinary,"Module.readBinary option was removed (modify readBinary in JS)");F("undefined"==typeof l.setWindowTitle,"Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)");F("undefined"==typeof l.TOTAL_MEMORY,"Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");D("asm","wasmExports");D("readAsync","readAsync");D("readBinary","readBinary");D("setWindowTitle","setWindowTitle");F(!fa,"node environment detected but not enabled at build time.  Add `node` to `-sENVIRONMENT` to enable.");
F(!ha,"shell environment detected but not enabled at build time.  Add `shell` to `-sENVIRONMENT` to enable.");D("wasmBinary","wasmBinary");"object"!=typeof WebAssembly&&B("no native wasm support detected");var Oa,Pa=false;function F(a,b){a||G("Assertion failed"+(b?": "+b:""));}var H,I,J,Qa,K,L,Ra,Sa,Ta,Ua,Va=false,Wa=a=>a.startsWith("data:application/octet-stream;base64,"),Ma=a=>a.startsWith("file://");
function Xa(){if(!Pa){var a=Ya();0==a&&(a+=4);var b=L[a>>2],c=L[a+4>>2];34821223==b&&2310721022==c||G(`Stack overflow! Stack cookie has been overwritten at ${M(a)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${M(c)} ${M(b)}`);1668509029!=L[0]&&G("Runtime error: The application has corrupted its heap memory area (address zero)!");}}var Za=new Int16Array(1),$a=new Int8Array(Za.buffer);Za[0]=25459;
if(115!==$a[0]||99!==$a[1])throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)";if(l.ENVIRONMENT)throw Error("Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)");
function D(a,b){Object.getOwnPropertyDescriptor(l,a)||Object.defineProperty(l,a,{configurable:true,get(){G(`\`Module.${a}\` has been replaced by \`${b}\``+" (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)");}});}function C(a){Object.getOwnPropertyDescriptor(l,a)&&G(`\`Module.${a}\` was supplied but \`${a}\` not included in INCOMING_MODULE_JS_API`);}
function ab(a){return "FS_createPath"===a||"FS_createDataFile"===a||"FS_createPreloadedFile"===a||"FS_unlink"===a||"addRunDependency"===a||"FS_createLazyFile"===a||"FS_createDevice"===a||"removeRunDependency"===a}function bb(a,b){"undefined"==typeof globalThis||Object.getOwnPropertyDescriptor(globalThis,a)||Object.defineProperty(globalThis,a,{configurable:true,get(){b();}});}function cb(a,b){bb(a,()=>{N(`\`${a}\` is not longer defined by emscripten. ${b}`);});}cb("buffer","Please use HEAP8.buffer or wasmMemory.buffer");
cb("asm","Please use wasmExports instead");function db(a){Object.getOwnPropertyDescriptor(l,a)||Object.defineProperty(l,a,{configurable:true,get(){var b=`'${a}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;ab(a)&&(b+=". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you");G(b);}});}F(!l.STACK_SIZE,"STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time");
F("undefined"!=typeof Int32Array&&"undefined"!==typeof Float64Array&&void 0!=Int32Array.prototype.subarray&&void 0!=Int32Array.prototype.set,"JS engine does not provide full typed array support");F(!l.wasmMemory,"Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally");F(!l.INITIAL_MEMORY,"Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically");var eb=[],fb=[],gb=[],O=0,hb=null,ib={},P=null;
function jb(){O++;F(!ib["wasm-instantiate"]);ib["wasm-instantiate"]=1;null===P&&"undefined"!=typeof setInterval&&(P=setInterval(()=>{if(Pa)clearInterval(P),P=null;else {var a=false,b;for(b in ib)a||(a=true,B("still waiting on run dependencies:")),B(`dependency: ${b}`);a&&B("(end of list)");}},1E4));}function G(a){a="Aborted("+a+")";B(a);Pa=true;a=new WebAssembly.RuntimeError(a);ba(a);throw a;}
function kb(){G("Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with -sFORCE_FILESYSTEM");}l.FS_createDataFile=function(){kb();};l.FS_createPreloadedFile=function(){kb();};
function Q(a,b){return (...c)=>{F(Va,`native function \`${a}\` called before runtime initialization`);var d=R[a];F(d,`exported native function \`${a}\` not found`);F(c.length<=b,`native function \`${a}\` called with ${c.length} args but expects ${b}`);return d(...c)}}var lb;async function mb(a){try{var b=await Ka(a);return new Uint8Array(b)}catch{}if(La)a=La(a);else throw "both async and sync fetching of the wasm failed";return a}
async function nb(a,b){try{var c=await mb(a);return await WebAssembly.instantiate(c,b)}catch(d){B(`failed to asynchronously prepare wasm: ${d}`),Ma(lb)&&B(`warning: Loading from a file URI (${lb}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`),G(d);}}
async function ob(a){var b=lb;if("function"==typeof WebAssembly.instantiateStreaming&&!Wa(b)&&!Ma(b))try{var c=fetch(b,{credentials:"same-origin"});return await WebAssembly.instantiateStreaming(c,a)}catch(d){B(`wasm streaming compile failed: ${d}`),B("falling back to ArrayBuffer instantiation");}return nb(b,a)}
var M=a=>{F("number"===typeof a);return "0x"+(a>>>0).toString(16).padStart(8,"0")},N=a=>{N.O||(N.O={});N.O[a]||(N.O[a]=1,B(a));},pb=a=>{if(null===a)return "null";var b=typeof a;return "object"===b||"array"===b||"function"===b?a.toString():""+a},qb,S=a=>{for(var b="";I[a];)b+=qb[I[a++]];return b},rb={},sb={},T;
function ub(a,b,c={}){var d=b.name;if(!a)throw new T(`type "${d}" must have a positive integer typeid pointer`);if(sb.hasOwnProperty(a)){if(c.U)return;throw new T(`Cannot register type '${d}' twice`);}sb[a]=b;rb.hasOwnProperty(a)&&(b=rb[a],delete rb[a],b.forEach(e=>e()));}function U(a,b,c={}){if(void 0===b.s)throw new TypeError("registerType registeredInstance requires argPackAdvance");return ub(a,b,c)}
var vb=(a,b,c)=>{switch(b){case 1:return c?d=>H[d]:d=>I[d];case 2:return c?d=>J[d>>1]:d=>Qa[d>>1];case 4:return c?d=>K[d>>2]:d=>L[d>>2];case 8:return c?d=>Sa[d>>3]:d=>Ta[d>>3];default:throw new TypeError(`invalid integer width (${b}): ${a}`);}},wb=[],V=[],xb=a=>{switch(a){case void 0:return 2;case null:return 4;case true:return 6;case false:return 8;default:const b=wb.pop()||V.length;V[b]=a;V[b+1]=1;return b}};function yb(a){return this.fromWireType(L[a>>2])}
for(var zb={name:"emscripten::val",fromWireType:a=>{if(!a)throw new T("Cannot use deleted val. handle = "+a);F(2===a||void 0!==V[a]&&0===a%2,`invalid handle: ${a}`);var b=V[a];9<a&&0===--V[a+1]&&(F(void 0!==V[a],"Decref for unallocated handle."),V[a]=void 0,wb.push(a));return b},toWireType:(a,b)=>xb(b),s:8,readValueFromPointer:yb,A:null},Ab=(a,b)=>{switch(b){case 4:return function(c){return this.fromWireType(Ra[c>>2])};case 8:return function(c){return this.fromWireType(Ua[c>>3])};default:throw new TypeError(`invalid float width (${b}): ${a}`);
}},Bb="undefined"!=typeof TextDecoder?new TextDecoder:void 0,Cb=(a,b=0,c=NaN)=>{var d=b+c;for(c=b;a[c]&&!(c>=d);)++c;if(16<c-b&&a.buffer&&Bb)return Bb.decode(a.subarray(b,c));for(d="";b<c;){var e=a[b++];if(e&128){var f=a[b++]&63;if(192==(e&224))d+=String.fromCharCode((e&31)<<6|f);else {var g=a[b++]&63;224==(e&240)?e=(e&15)<<12|f<<6|g:(240!=(e&248)&&N("Invalid UTF-8 leading byte "+M(e)+" encountered when deserializing a UTF-8 string in wasm memory to a JS string!"),e=(e&7)<<18|f<<12|g<<6|a[b++]&63);
65536>e?d+=String.fromCharCode(e):(e-=65536,d+=String.fromCharCode(55296|e>>10,56320|e&1023));}}else d+=String.fromCharCode(e);}return d},Db="undefined"!=typeof TextDecoder?new TextDecoder("utf-16le"):void 0,Eb=(a,b)=>{F(0==a%2,"Pointer passed to UTF16ToString must be aligned to two bytes!");var c=a>>1;for(var d=c+b/2;!(c>=d)&&Qa[c];)++c;c<<=1;if(32<c-a&&Db)return Db.decode(I.subarray(a,c));c="";for(d=0;!(d>=b/2);++d){var e=J[a+2*d>>1];if(0==e)break;c+=String.fromCharCode(e);}return c},Fb=(a,b,c)=>{F(0==
b%2,"Pointer passed to stringToUTF16 must be aligned to two bytes!");F("number"==typeof c,"stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");c??(c=2147483647);if(2>c)return 0;c-=2;var d=b;c=c<2*a.length?c/2:a.length;for(var e=0;e<c;++e)J[b>>1]=a.charCodeAt(e),b+=2;J[b>>1]=0;return b-d},Gb=a=>2*a.length,Hb=(a,b)=>{F(0==a%4,"Pointer passed to UTF32ToString must be aligned to four bytes!");for(var c=0,d="";!(c>=b/4);){var e=K[a+
4*c>>2];if(0==e)break;++c;65536<=e?(e-=65536,d+=String.fromCharCode(55296|e>>10,56320|e&1023)):d+=String.fromCharCode(e);}return d},Ib=(a,b,c)=>{F(0==b%4,"Pointer passed to stringToUTF32 must be aligned to four bytes!");F("number"==typeof c,"stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");c??(c=2147483647);if(4>c)return 0;var d=b;c=d+c-4;for(var e=0;e<a.length;++e){var f=a.charCodeAt(e);if(55296<=f&&57343>=f){var g=a.charCodeAt(++e);
f=65536+((f&1023)<<10)|g&1023;}K[b>>2]=f;b+=4;if(b+4>c)break}K[b>>2]=0;return b-d},Jb=a=>{for(var b=0,c=0;c<a.length;++c){var d=a.charCodeAt(c);55296<=d&&57343>=d&&++c;b+=4;}return b},Kb=[null,[],[]],W=[],X,y=a=>{var b=W[a];b||(a>=W.length&&(W.length=a+1),W[a]=b=X.get(a));F(X.get(a)==b,"JavaScript-side Wasm function table mirror is out of date!");return b},Y,Lb=[],Mb=Array(256),Nb=0;256>Nb;++Nb)Mb[Nb]=String.fromCharCode(Nb);qb=Mb;
T=l.BindingError=class extends Error{constructor(a){super(a);this.name="BindingError";}};l.InternalError=class extends Error{constructor(a){super(a);this.name="InternalError";}};V.push(0,1,void 0,1,null,1,true,1,false,1);F(10===V.length);l.count_emval_handles=()=>V.length/2-5-wb.length;
var Pb={_abort_js:()=>G("native code called abort()"),_embind_register_bigint:(a,b,c,d,e)=>{b=S(b);var f=-1!=b.indexOf("u");f&&(e=(1n<<64n)-1n);U(a,{name:b,fromWireType:g=>g,toWireType:function(g,h){if("bigint"!=typeof h&&"number"!=typeof h)throw new TypeError(`Cannot convert "${pb(h)}" to ${this.name}`);"number"==typeof h&&(h=BigInt(h));if(h<d||h>e)throw new TypeError(`Passing a number "${pb(h)}" from JS side to C/C++ side to an argument of type "${b}", which is outside the valid range [${d}, ${e}]!`);
return h},s:8,readValueFromPointer:vb(b,c,!f),A:null});},_embind_register_bool:(a,b,c,d)=>{b=S(b);U(a,{name:b,fromWireType:function(e){return !!e},toWireType:function(e,f){return f?c:d},s:8,readValueFromPointer:function(e){return this.fromWireType(I[e])},A:null});},_embind_register_emval:a=>U(a,zb),_embind_register_float:(a,b,c)=>{b=S(b);U(a,{name:b,fromWireType:d=>d,toWireType:(d,e)=>{if("number"!=typeof e&&"boolean"!=typeof e)throw new TypeError(`Cannot convert ${pb(e)} to ${this.name}`);return e},
s:8,readValueFromPointer:Ab(b,c),A:null});},_embind_register_integer:(a,b,c,d,e)=>{b=S(b);-1===e&&(e=4294967295);var f=k=>k;if(0===d){var g=32-8*c;f=k=>k<<g>>>g;}var h=(k,q)=>{if("number"!=typeof k&&"boolean"!=typeof k)throw new TypeError(`Cannot convert "${pb(k)}" to ${q}`);if(k<d||k>e)throw new TypeError(`Passing a number "${pb(k)}" from JS side to C/C++ side to an argument of type "${b}", which is outside the valid range [${d}, ${e}]!`);};var n=b.includes("unsigned")?function(k,q){h(q,this.name);
return q>>>0}:function(k,q){h(q,this.name);return q};U(a,{name:b,fromWireType:f,toWireType:n,s:8,readValueFromPointer:vb(b,c,0!==d),A:null});},_embind_register_memory_view:(a,b,c)=>{function d(f){return new e(H.buffer,L[f+4>>2],L[f>>2])}var e=[Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array][b];c=S(c);U(a,{name:c,fromWireType:d,s:8,readValueFromPointer:d},{U:true});},_embind_register_std_string:(a,b)=>{b=S(b);U(a,{name:b,fromWireType:function(c){for(var d=
L[c>>2],e=c+4,f,g=e,h=0;h<=d;++h){var n=e+h;if(h==d||0==I[n]){var k=g;g=n-g;F("number"==typeof k,`UTF8ToString expects a number (got ${typeof k})`);k=k?Cb(I,k,g):"";void 0===f?f=k:(f+=String.fromCharCode(0),f+=k);g=n+1;}}Z(c);return f},toWireType:function(c,d){d instanceof ArrayBuffer&&(d=new Uint8Array(d));var e="string"==typeof d;if(!(e||d instanceof Uint8Array||d instanceof Uint8ClampedArray||d instanceof Int8Array))throw new T("Cannot pass non-string to std::string");var f;if(e)for(var g=f=0;g<
d.length;++g){var h=d.charCodeAt(g);127>=h?f++:2047>=h?f+=2:55296<=h&&57343>=h?(f+=4,++g):f+=3;}else f=d.length;h=f;f=Ob(4+h+1);g=f+4;L[f>>2]=h;if(e){if(h+=1,F("number"==typeof h,"stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!"),e=g,g=I,F("string"===typeof d,`stringToUTF8Array expects a string (got ${typeof d})`),0<h){h=e+h-1;for(var n=0;n<d.length;++n){var k=d.charCodeAt(n);if(55296<=k&&57343>=k){var q=d.charCodeAt(++n);k=
65536+((k&1023)<<10)|q&1023;}if(127>=k){if(e>=h)break;g[e++]=k;}else {if(2047>=k){if(e+1>=h)break;g[e++]=192|k>>6;}else {if(65535>=k){if(e+2>=h)break;g[e++]=224|k>>12;}else {if(e+3>=h)break;1114111<k&&N("Invalid Unicode code point "+M(k)+" encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).");g[e++]=240|k>>18;g[e++]=128|k>>12&63;}g[e++]=128|k>>6&63;}g[e++]=128|k&63;}}g[e]=0;}}else if(e)for(e=0;e<h;++e){n=d.charCodeAt(e);if(255<
n)throw Z(f),new T("String has UTF-16 code units that do not fit in 8 bits");I[g+e]=n;}else for(e=0;e<h;++e)I[g+e]=d[e];null!==c&&c.push(Z,f);return f},s:8,readValueFromPointer:yb,A(c){Z(c);}});},_embind_register_std_wstring:(a,b,c)=>{c=S(c);if(2===b){var d=Eb;var e=Fb;var f=Gb;var g=h=>Qa[h>>1];}else 4===b&&(d=Hb,e=Ib,f=Jb,g=h=>L[h>>2]);U(a,{name:c,fromWireType:h=>{for(var n=L[h>>2],k,q=h+4,v=0;v<=n;++v){var E=h+4+v*b;if(v==n||0==g(E))q=d(q,E-q),void 0===k?k=q:(k+=String.fromCharCode(0),k+=q),q=E+b;}Z(h);
return k},toWireType:(h,n)=>{if("string"!=typeof n)throw new T(`Cannot pass non-string to C++ string type ${c}`);var k=f(n),q=Ob(4+k+b);L[q>>2]=k/b;e(n,q+4,k+b);null!==h&&h.push(Z,q);return q},s:8,readValueFromPointer:yb,A(h){Z(h);}});},_embind_register_void:(a,b)=>{b=S(b);U(a,{W:true,name:b,s:0,fromWireType:()=>{},toWireType:()=>{}});},emscripten_resize_heap:a=>{G(`Cannot enlarge memory arrays to size ${a>>>0} bytes (OOM). Either (1) compile with -sINITIAL_MEMORY=X with X higher than the current value ${H.length}, (2) compile with -sALLOW_MEMORY_GROWTH which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with -sABORTING_MALLOC=0`);},
fd_close:()=>{G("fd_close called without SYSCALLS_REQUIRE_FILESYSTEM");},fd_seek:function(){return 70},fd_write:(a,b,c,d)=>{for(var e=0,f=0;f<c;f++){var g=L[b>>2],h=L[b+4>>2];b+=8;for(var n=0;n<h;n++){var k=a,q=I[g+n],v=Kb[k];F(v);0===q||10===q?((1===k?Na:B)(Cb(v)),v.length=0):v.push(q);}e+=h;}L[d>>2]=e;return 0},platform_connect_confirm:function(){var a=z;m(a,"platformConnectConfirm");a.g&&(clearTimeout(a.g),a.g=null);},platform_connect_headset:function(a,b,c,d,e){return va(z,a,b,d,e)},platform_disconnect_headset:function(){var a=
z;a.g&&(clearTimeout(a.g),a.g=null);x=t=void 0;a.device?(m(a,"Disconnecting Headset"),a.device.close(),a.device=null,a=true):a=false;return a},platform_get_device_id:function(){return null},platform_log_msg:function(a,b,c){var d=z;b=new Uint8Array(w.HEAPU8.buffer,b,c);let e="";for(var f=0;f<c;f++)e+=String.fromCharCode(b[f]);r(d,a,e);},platform_rand:function(){return Math.floor(4294967295*Math.random())},platform_retry_connect_headset:function(){return Da()},platform_send_report:function(a,b,c,d){a=z;c=
new Uint8Array(w.HEAPU8.buffer,c,d);Fa(a,b,c);},platform_send_report_delayed:function(a,b,c,d,e,f,g){Ga(b,c,d,e,f,g);},platform_set_log_level:function(a){z.R=a;}},R;
(async function(){jb();var a={env:Pb,wasi_snapshot_preview1:Pb};lb??(lb=l.locateFile?Wa("call_control_sdk.wasm")?"call_control_sdk.wasm":A+"call_control_sdk.wasm":(new URL("call_control_sdk.wasm",import.meta.url)).href);try{var b=await ob(a);F(l===l,"the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");R=b.instance.exports;Oa=R.memory;F(Oa,"memory not found in wasm exports");var c=Oa.buffer;l.HEAP8=H=new Int8Array(c);l.HEAP16=
J=new Int16Array(c);l.HEAPU8=I=new Uint8Array(c);l.HEAPU16=Qa=new Uint16Array(c);l.HEAP32=K=new Int32Array(c);l.HEAPU32=L=new Uint32Array(c);l.HEAPF32=Ra=new Float32Array(c);l.HEAPF64=Ua=new Float64Array(c);l.HEAP64=Sa=new BigInt64Array(c);l.HEAPU64=Ta=new BigUint64Array(c);X=R.__indirect_function_table;F(X,"table not found in wasm exports");fb.unshift(R.__wasm_call_ctors);O--;F(ib["wasm-instantiate"]);delete ib["wasm-instantiate"];0==O&&(null!==P&&(clearInterval(P),P=null),hb&&(a=hb,hb=null,a()));
return R}catch(d){return ba(d),Promise.reject(d)}})();var Z=l._free=Q("free",1);l._connect_headset=Q("connect_headset",1);l._connect_bt_headset=Q("connect_bt_headset",1);l._connect_bt_headset_by_name=Q("connect_bt_headset_by_name",1);l._disconnect_headset=Q("disconnect_headset",0);l._get_device_id=Q("get_device_id",0);l._set_call_state=Q("set_call_state",1);l._set_mute_state=Q("set_mute_state",1);l._register_event_handler=Q("register_event_handler",1);
var Ob=l._malloc=Q("malloc",1),Qb=()=>(Qb=R.emscripten_stack_init)(),Ya=()=>(Ya=R.emscripten_stack_get_end)();
l.addFunction=(a,b)=>{F("undefined"!=typeof a);if(!Y){Y=new WeakMap;var c=X.length;if(Y)for(var d=0;d<0+c;d++){var e=y(d);e&&Y.set(e,d);}}if(c=Y.get(a)||0)return c;if(Lb.length)c=Lb.pop();else {try{X.grow(1);}catch(h){if(!(h instanceof RangeError))throw h;throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";}c=X.length-1;}try{d=c,X.set(d,a),W[d]=X.get(d);}catch(h){if(!(h instanceof TypeError))throw h;F("undefined"!=typeof b,"Missing signature argument to addFunction: "+a);if("function"==typeof WebAssembly.Function){d=
WebAssembly.Function;e={i:"i32",j:"i64",f:"f32",d:"f64",e:"externref",p:"i32"};for(var f={parameters:[],results:"v"==b[0]?[]:[e[b[0]]]},g=1;g<b.length;++g)F(b[g]in e,"invalid signature char: "+b[g]),f.parameters.push(e[b[g]]);b=new d(f,a);}else {d=[1];e=b.slice(0,1);b=b.slice(1);f={i:127,p:127,j:126,f:125,d:124,e:111};d.push(96);g=b.length;F(16384>g);128>g?d.push(g):d.push(g%128|128,g>>7);for(g=0;g<b.length;++g)F(b[g]in f,"invalid signature char: "+b[g]),d.push(f[b[g]]);"v"==e?d.push(0):d.push(1,f[e]);
b=[0,97,115,109,1,0,0,0,1];e=d.length;F(16384>e);128>e?b.push(e):b.push(e%128|128,e>>7);b.push(...d);b.push(2,7,1,1,101,1,102,0,0,7,5,1,1,102,0,0);b=new WebAssembly.Module(new Uint8Array(b));b=(new WebAssembly.Instance(b,{e:{f:a}})).exports.f;}d=c;X.set(d,b);W[d]=X.get(d);}Y.set(a,c);return c};l.removeFunction=a=>{Y.delete(y(a));X.set(a,null);W[a]=X.get(a);Lb.push(a);};
l.setValue=function(a,b,c="i8"){c.endsWith("*")&&(c="*");switch(c){case "i1":H[a]=b;break;case "i8":H[a]=b;break;case "i16":J[a>>1]=b;break;case "i32":K[a>>2]=b;break;case "i64":Sa[a>>3]=BigInt(b);break;case "float":Ra[a>>2]=b;break;case "double":Ua[a>>3]=b;break;case "*":L[a>>2]=b;break;default:G(`invalid type for setValue: ${c}`);}};
"writeI53ToI64 writeI53ToI64Clamped writeI53ToI64Signaling writeI53ToU64Clamped writeI53ToU64Signaling readI53FromI64 readI53FromU64 convertI32PairToI53 convertI32PairToI53Checked convertU32PairToI53 stackSave stackRestore stackAlloc getTempRet0 setTempRet0 zeroMemory exitJS growMemory strError inetPton4 inetNtop4 inetPton6 inetNtop6 readSockaddr writeSockaddr emscriptenLog readEmAsmArgs jstoi_q getExecutableName listenOnce autoResumeAudioContext getDynCaller dynCall handleException keepRuntimeAlive runtimeKeepalivePush runtimeKeepalivePop callUserCallback maybeExit asmjsMangle asyncLoad mmapAlloc HandleAllocator getNativeTypeSize STACK_SIZE STACK_ALIGN POINTER_SIZE ASSERTIONS getCFunc ccall cwrap reallyNegative unSign strLen reSign formatString intArrayFromString intArrayToString AsciiToString stringToAscii stringToNewUTF8 stringToUTF8OnStack writeArrayToMemory registerKeyEventCallback maybeCStringToJsString findEventTarget getBoundingClientRect fillMouseEventData registerMouseEventCallback registerWheelEventCallback registerUiEventCallback registerFocusEventCallback fillDeviceOrientationEventData registerDeviceOrientationEventCallback fillDeviceMotionEventData registerDeviceMotionEventCallback screenOrientation fillOrientationChangeEventData registerOrientationChangeEventCallback fillFullscreenChangeEventData registerFullscreenChangeEventCallback JSEvents_requestFullscreen JSEvents_resizeCanvasForFullscreen registerRestoreOldStyle hideEverythingExceptGivenElement restoreHiddenElements setLetterbox softFullscreenResizeWebGLRenderTarget doRequestFullscreen fillPointerlockChangeEventData registerPointerlockChangeEventCallback registerPointerlockErrorEventCallback requestPointerLock fillVisibilityChangeEventData registerVisibilityChangeEventCallback registerTouchEventCallback fillGamepadEventData registerGamepadEventCallback registerBeforeUnloadEventCallback fillBatteryEventData battery registerBatteryEventCallback setCanvasElementSize getCanvasElementSize jsStackTrace getCallstack convertPCtoSourceLocation getEnvStrings checkWasiClock wasiRightsToMuslOFlags wasiOFlagsToMuslOFlags initRandomFill randomFill safeSetTimeout setImmediateWrapped safeRequestAnimationFrame clearImmediateWrapped registerPostMainLoop registerPreMainLoop getPromise makePromise idsToPromises makePromiseCallback ExceptionInfo findMatchingCatch Browser_asyncPrepareDataCounter isLeapYear ydayFromDate arraySum addDays getSocketFromFD getSocketAddress ALLOC_NORMAL ALLOC_STACK allocate writeStringToMemory writeAsciiToMemory setErrNo demangle stackTrace getTypeName getFunctionName getFunctionArgsName heap32VectorToArray requireRegisteredType usesDestructorStack createJsInvokerSignature checkArgCount getRequiredArgCount createJsInvoker throwUnboundTypeError ensureOverloadTable exposePublicSymbol replacePublicSymbol extendError createNamedFunction getBasestPointer registerInheritedInstance unregisterInheritedInstance getInheritedInstance getInheritedInstanceCount getLiveInheritedInstances enumReadValueFromPointer runDestructors craftInvokerFunction embind__requireFunction genericPointerToWireType constNoSmartPtrRawPointerToWireType nonConstNoSmartPtrRawPointerToWireType init_RegisteredPointer RegisteredPointer RegisteredPointer_fromWireType runDestructor releaseClassHandle detachFinalizer attachFinalizer makeClassHandle init_ClassHandle ClassHandle throwInstanceAlreadyDeleted flushPendingDeletes setDelayFunction RegisteredClass shallowCopyInternalPointer downcastPointer upcastPointer validateThis char_0 char_9 makeLegalFunctionName getStringOrSymbol emval_get_global emval_returnValue emval_lookupTypes emval_addMethodCaller".split(" ").forEach(function(a){bb(a,()=>
{var b=`\`${a}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`,c=a;c.startsWith("_")||(c="$"+a);b+=` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${c}')`;ab(a)&&(b+=". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you");N(b);});db(a);});"run addOnPreRun addOnInit addOnPreMain addOnExit addOnPostRun addRunDependency removeRunDependency out err callMain abort wasmMemory wasmExports writeStackCookie checkStackCookie INT53_MAX INT53_MIN bigintToI53Checked ptrToString getHeapMax abortOnCannotGrowMemory ENV ERRNO_CODES DNS Protocols Sockets timers warnOnce readEmAsmArgsArray jstoi_s alignMemory wasmTable noExitRuntime uleb128Encode sigToWasmTypes generateFuncType convertJsFunctionToWasm freeTableIndexes functionsInTableMap getEmptyTableSlot updateTableMap getFunctionAddress getValue PATH PATH_FS UTF8Decoder UTF8ArrayToString UTF8ToString stringToUTF8Array stringToUTF8 lengthBytesUTF8 UTF16Decoder UTF16ToString stringToUTF16 lengthBytesUTF16 UTF32ToString stringToUTF32 lengthBytesUTF32 JSEvents specialHTMLTargets findCanvasEventTarget currentFullscreenStrategy restoreOldWindowedStyle UNWIND_CACHE ExitStatus flush_NO_FILESYSTEM emSetImmediate emClearImmediate_deps emClearImmediate promiseMap uncaughtExceptionCount exceptionLast exceptionCaught Browser getPreloadedImageData__data wget MONTH_DAYS_REGULAR MONTH_DAYS_LEAP MONTH_DAYS_REGULAR_CUMULATIVE MONTH_DAYS_LEAP_CUMULATIVE SYSCALLS allocateUTF8 allocateUTF8OnStack print printErr InternalError BindingError throwInternalError throwBindingError registeredTypes awaitingDependencies typeDependencies tupleRegistrations structRegistrations sharedRegisterType whenDependentTypesAreResolved embind_charCodes embind_init_charCodes readLatin1String UnboundTypeError PureVirtualError GenericWireTypeSize EmValType EmValOptionalType embindRepr registeredInstances registeredPointers registerType integerReadValueFromPointer floatReadValueFromPointer readPointer finalizationRegistry detachFinalizer_deps deletionQueue delayFunction emval_freelist emval_handles emval_symbols init_emval count_emval_handles Emval emval_methodCallers reflectConstruct".split(" ").forEach(db);
var Rb;function Sb(){if(0<O)hb=Sb;else {Qb();var a=Ya();F(0==(a&3));0==a&&(a+=4);L[a>>2]=34821223;L[a+4>>2]=2310721022;for(L[0]=1668509029;0<eb.length;)eb.shift()(l);if(0<O)hb=Sb;else {F(!Rb);Rb=true;l.calledRun=true;if(!Pa){F(!Va);Va=true;for(Xa();0<fb.length;)fb.shift()(l);aa(l);F(!l._main,'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');for(Xa();0<gb.length;)gb.shift()(l);}Xa();}}}Sb();moduleRtn=ca;
for(const a of Object.keys(l))a in moduleArg||Object.defineProperty(moduleArg,a,{configurable:true,get(){G(`Access to module property ('${a}') is no longer possible via the module constructor argument; Instead, use the result of the module constructor.`);}});


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
const GATT_SERVICE_UUID = '23c1b9c0-4e04-4a93-91c3-b85e32a5f7b7';
/**
 * The default export from the module.
 * Making extra instances of this class is not useful,
 * all instances will talk to the same headset.
 */
class CallControlSdk {
    static async load() {
        if (!navigator.hid) {
            console.error("CCSDK: WebHID is not supported in this browser. Unable to load SDK.");
            return;
        }
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
        if (!this.module) {
            console.error("CCSDK: Module not loaded.");
            return false;
        }
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
        else if (headset && headset.gatt != undefined && typeof headset.id === 'string' && headset.id.length > 0) {
            // Store reference so platform.js can dispatch event to it
            window.__ccsdkBluetoothDevice = headset;
            result = this.module?._connect_bt_headset(0) == 0 ? false : true;
        }
        else {
            console.warn("CCSDK: Unable to open a headset when one is not selected / defined.");
            return result;
        }
        return result;
    }
    async connectBtHeadset(headset) {
        let result = false;
        if (!headset) {
            headset = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [GATT_SERVICE_UUID]
            });
        }
        if (headset) {
            return this.connectHeadset(headset);
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
        if (!this.module) {
            console.error("CCSDK: Module not loaded.");
            return false;
        }
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
CallControlSdk.ccSdkModule = undefined;
CallControlSdk.callbacks = new WeakMap();

export { CallControlSdk, CallState, SdkEvent, CallControlSdk as default };
