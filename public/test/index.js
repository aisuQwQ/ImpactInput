//通常の強さで叩いた場合のプロセス
window.addEventListener("tappingHorizontallyRight", funcRight);
window.addEventListener("tappingHorizontallyLeft", funcLeft);

//強く叩いた場合のプロセス
window.addEventListener("tappingHorizontallyRightStrong", funcRightStrong);
window.addEventListener("tappingHorizontallyLeftStrong", funcLeftStrong);

function funcRight() {
    document.body.innerHTML = "funcRight";
    console.log("@@@@");
}
function funcLeft() {
    document.body.innerHTML = "funcLeft";
    console.log("####");
}
function funcRightStrong() {
    document.body.innerHTML = "funcRightStrong";
    console.log("@@@@@@@@");
}
function funcLeftStrong() {
    document.body.innerHTML = "funcLeftStrong";
    console.log("########");
}
