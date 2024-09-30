// import { init } from "./tapping.js";
import { TAPPING } from "./tapping.js";
// import { tappingjsInit } from "https://cdn.jsdelivr.net/gh/aisuQwQ/ImpactInput/public/test/tapping.js";
// import { TAPPING } from "https://cdn.jsdelivr.net/gh/aisuQwQ/ImpactInput@0.9.1/public/test/tapping.js";

const btn = document.querySelector("#start-btn");
function deny() {
    const msg = document.querySelector("#msg");
    msg.innerHTML = "拒絶されました";
}
function grant() {
    const msg = document.querySelector("#msg");
    msg.innerHTML = "付与されました";
}
// tappingjsInit(btn, grant, deny);

globalThis.addEventListener("tappingTopRight", () => {
    logfetch("tappingTopRight");
});
globalThis.addEventListener("tappingTopLeft", () => {
    logfetch("tappingTopLeft");
});

//通常の強さで叩いた場合のプロセス
globalThis.addEventListener("tappingHorizontallyRight", funcRight);
globalThis.addEventListener("tappingHorizontallyLeft", funcLeft);
//強く叩いた場合のプロセス
globalThis.addEventListener("tappingHorizontallyRightStrong", funcRightStrong);
globalThis.addEventListener("tappingHorizontallyLeftStrong", funcLeftStrong);

function funcRight() {
    logfetch("funcRight");
}
function funcLeft() {
    logfetch("funcLeft");
}
function funcRightStrong() {
    logfetch("funcRightStrong");
}
function funcLeftStrong() {
    logfetch("funcLeftStrong");
}

function logfetch(s) {
    const json = { content: s };
    fetch("/log", { method: "POST", body: JSON.stringify(json) });
}

new TAPPING(btn, grant, deny);
document.addEventListener("click", ()=>{
    globalThis.dispatchEvent(new Event("tappingHorizontallyRight"));
})
logfetch("test");