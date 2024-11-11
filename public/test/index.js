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
document.addEventListener("click", () => {
    globalThis.dispatchEvent(new Event("tappingHorizontallyRight"));
});
logfetch("test");

// globalThis.addEventListener("devicemotion", (e)=>{
//     const msg = document.querySelector("#msg");
//     // msg.innerHTML = `
//     // ${e.accelerationIncludingGravity.x}<br>${e.accelerationIncludingGravity.y}<br>${e.accelerationIncludingGravity.z}
//     // <br>${e.acceleration.x}<br>${e.acceleration.y}<br>${e.acceleration.z}
//     // `
//     const max=Math.max(parseInt(msg.innerHTML)||0, Math.sqrt(e.acceleration.x**2+e.acceleration.y**2+e.acceleration.z**2))
//     msg.innerHTML=max;
// });

globalThis.addEventListener("tappingAdvanced", (e) => {
    const msg = document.querySelector("#msg");
    msg.innerHTML = `${typeof e.corner} & ${typeof e.strength} & ${typeof e
        .tf_out}`;
});
