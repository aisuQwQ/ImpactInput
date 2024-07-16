import * as tf from "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/+esm";

let tappingSettings = {};
// デフォルトの閾値
tappingSettings.defaultTappingThreshold = 1;
// ユーザがキャリブレーションした閾値
tappingSettings.tappingThreshold = 1;
// 閾値の前の時間
tappingSettings.beforeThresholdTimeRange = 200; // 0.2秒
// 閾値の後の時間
tappingSettings.afterThresholdTimeRange = 50; // 0.05秒
// 叩きの最低間隔(連続で叩きイベントが発行されないようにする)
tappingSettings.tappingMinimumInterval = 500; //0.5秒
// TensorFlor.jsモデルのパス
tappingSettings.modelUrl = "tfjs/model.json";
// キャリブレーションページのパス
tappingSettings.calibrationUrl = "https://tataki-server.fun/calibration";
// キャリブレーション結果を取得する頁のパス
tappingSettings.calibrationGetUrl = "https://tataki-server.fun";
// 向き
tappingSettings.deviceOrientation = "vertical";
// 機種
tappingSettings.deviceKinds = "others";

//強弱の判断 0 ->弱い叩き　1 ->強い叩き
let tappingStrength = 0;

//強弱の閾値
let strength_border = 5.0;

let TappingModel = class {
    constructor() {
        this.model;
        let modelUrl = tappingSettings.modelUrl;
        this.model_load(modelUrl);

        let event0 = new CustomEvent("tappingTopRight");
        let event1 = new CustomEvent("tappingBottomRight");
        let event2 = new CustomEvent("tappingTopLeft");
        let event3 = new CustomEvent("tappingBottomLeft");
        let event4 = new CustomEvent("tappingMisDetectioin");

        let event5 = new CustomEvent("tappingHorizontallyRight");
        let event6 = new CustomEvent("tappingHorizontallyLeft");
        let event7 = new CustomEvent("tappingHorizontallyMisDetectioin");

        let event8 = new CustomEvent("tappingHorizontallyRightStrong");
        let event9 = new CustomEvent("tappingHorizontallyLeftStrong");

        this.eventDict = { 0: event0, 1: event1, 2: event2, 3: event3, 4: event4, 5: event5, 6: event6, 7: event7, 8: event8, 9: event9 };
    }

    // モデルの読み込み
    async model_load(modelUrl) {
        try {
            this.model = await tf.loadLayersModel(modelUrl);
            console.log("TensorFlow.js model is loaded.");
        } catch (e) {
            try {
                this.model = await tf.loadLayersModel("https://tataki-server.fun/tfjs/model.json");
                console.log("TensorFlow.js model is loaded.");
            } catch (e2) {
                console.log("TensorFlow.js model could not be loaded.");
                console.error(e);
                console.error(e2);
            }
        }
    }

    // 予測（と叩きイベントの発行）
    async model_predict(array) {
        // console.log(array);
        if (this.model) {
            let result = tf.tidy(() => {
                let orientation_arr;
                if (tappingSettings.deviceOrientation == "horizontal") {
                    orientation_arr = [0, 1];
                } else {
                    orientation_arr = [1, 0];
                }

                let kinds_arr;
                if (tappingSettings.deviceKinds == "SE3") {
                    kinds_arr = [1, 0, 0];
                } else if (tappingSettings.deviceKinds == "Nexus9") {
                    kinds_arr = [0, 1, 0];
                } else if (tappingSettings.deviceKinds == "FireHD10") {
                    kinds_arr = [0, 0, 1];
                } else {
                    kinds_arr = [1, 1, 0];
                }

                let wavefome_tf = tf.tensor([array]);
                let orientation_tf = tf.tensor([orientation_arr]);
                let kinds_tf = tf.tensor([kinds_arr]);
                // console.log(wavefome_tf.dataSync());
                // console.log(wavefome_tf.arraySync());

                let arr = [wavefome_tf, orientation_tf, kinds_tf];
                // console.log(arr);
                // console.log(wavefome_tf.arraySync());

                // 予測
                let y_pred = this.model.predict(arr).dataSync();
                // console.log(y_pred);

                // 何番目の確率が一番高いか
                let nummber = tf.argMax(y_pred).arraySync();

                // console.log(y_pred3);

                // 叩きイベントの発行
                this.tappingdDispatchEvent(nummber);

                return nummber;
            });
            return result;
        } else {
            return -1;
        }
    }

    // 叩きイベントの発行
    //　横方向の叩きイベントに対して強弱の判断をする
    tappingdDispatchEvent(n) {
        let s = n.toFixed();
        let act = -1;
        if (s == 5) {
            if (tappingStrength == 1) {
                act = 8;
                tappingStrength = 0;
            } else if (tappingStrength == 0) {
                act = 5;
            }
        } else if (s == 6) {
            if (tappingStrength == 1) {
                act = 9;
                tappingStrength = 0;
            } else if (tappingStrength == 0) {
                act = 6;
            }
        } else {
            act = s;
        }

        if (this.eventDict[act]) {
            window.dispatchEvent(this.eventDict[act]);
            // console.log(this.eventDict[act]);
        }
    }
};

class TappingSensor {
    constructor() {
        this.handleDeviceMotion = this.handleDeviceMotion.bind(this);

        this.tappingModel = new TappingModel();

        this.arrAX = [];
        this.arrAY = [];
        this.arrAZ = [];
        this.arrRX = [];
        this.arrRY = [];
        this.arrRZ = [];
        this.arrTime = [];

        this.threshold;
        this.isTapping = false;

        this.shikiitiTime = Date.now(); // ミリ秒単位
    }

    // センサデータを取得した時
    handleDeviceMotion(e) {
        // 通常の処理を無効にする
        // e.preventDefault();

        let now = Date.now();

        // 加速度と角速度を取得
        let ax = e.acceleration.x;
        let ay = e.acceleration.y;
        let az = e.acceleration.z;
        let rx = e.rotationRate.alpha;
        let ry = e.rotationRate.beta;
        let rz = e.rotationRate.gamma;
        if (!rx) {
            rx = 0;
        }
        if (!ry) {
            ry = 0;
        }
        if (!rz) {
            rz = 0;
        }

        // センサの向きがiOSとAndroidで違うため、Android流に統一する
        let ua = navigator.userAgent;
        if (ua.indexOf("iPhone") >= 0 || ua.indexOf("iPad") >= 0 || navigator.userAgent.indexOf("iPod") >= 0) {
            ax = -1 * ax;
            ay = -1 * ay;
            az = -1 * az;
        }

        // データを更新
        this.updateData(ax, ay, az, rx, ry, rz, now);

        // 叩きの始まりを検知
        if (!this.isTapping) {
            this.checkTappingStart(ax, ay, az, now);
            // 叩きの終わりを検知
        } else {
            this.checkTappingEnd(ax, ay, az, now);
        }
    }

    // データを更新
    updateData(ax, ay, az, rx, ry, rz, now) {
        // データを追加
        this.arrAX.push(ax);
        this.arrAY.push(ay);
        this.arrAZ.push(az);
        this.arrRX.push(rx);
        this.arrRY.push(ry);
        this.arrRZ.push(rz);
        this.arrTime.push(now);

        // 古いデータを削除
        while (this.arrTime[0] < now - tappingSettings.beforeThresholdTimeRange && this.isTapping == false) {
            this.arrAX.shift();
            this.arrAY.shift();
            this.arrAZ.shift();
            this.arrRX.shift();
            this.arrRY.shift();
            this.arrRZ.shift();
            this.arrTime.shift();
        }
    }

    // 叩きの始まりを検知
    async checkTappingStart(ax, ay, az, now) {
        if (now > this.shikiitiTime + tappingSettings.tappingMinimumInterval) {
            if (Math.abs(ax) > tappingSettings.tappingThreshold || Math.abs(ay) > tappingSettings.tappingThreshold || Math.abs(az) > tappingSettings.tappingThreshold) {
                this.isTapping = true;
                this.shikiitiTime = now;
            }
        }
    }

    // 叩きの終わりを検知
    async checkTappingEnd(ax, ay, az, now) {
        if (this.isTapping == true) {
            if (now > this.shikiitiTime + tappingSettings.afterThresholdTimeRange) {
                this.isTapping = false;

                // // 前処理
                let arr = this.preprocessing();

                // 予測と叩きイベントの発行
                this.tappingModel.model_predict(arr);
            }
        }
    }

    // 前処理
    preprocessing() {
        let _ax = this.getArrayLengsChange(this.arrAX, 16);
        let _ay = this.getArrayLengsChange(this.arrAY, 16);
        let _az = this.getArrayLengsChange(this.arrAZ, 16);
        let _rx = this.getArrayLengsChange(this.arrRX, 16);
        let _ry = this.getArrayLengsChange(this.arrRY, 16);
        let _rz = this.getArrayLengsChange(this.arrRZ, 16);

        let _a = _ax.concat(_ay, _az);
        let _r = _rx.concat(_ry, _rz);

        _a = this.getHyoujunka(_a);
        _r = this.getHyoujunka(_r);

        _ax = _a.slice(0, 16);
        _ay = _a.slice(16, 32);
        _az = _a.slice(32);
        _rx = _r.slice(0, 16);
        _ry = _r.slice(16, 32);
        _rz = _r.slice(32);

        //叩きの強弱を検証するための配列を作製
        let strength_arry = [];

        for (let i = 0; i < _ax.length; i++) {
            strength_arry[i] = _ax[i] ** 2 + _ay[i] ** 2 + _az[i] ** 2;
        }

        let maxIndex = strength_arry.indexOf(Math.max(...strength_arry));

        //叩きの強弱を評価
        if (Math.sqrt(strength_arry[maxIndex]) > strength_border) {
            tappingStrength = 1;
        } else {
            tappingStrength = 0;
        }

        let _array = [_ax, _ay, _az, _rx, _ry, _rz];

        _array = this.getTenti(_array);

        return _array;
    }

    // array(1次元)をtargetLengsの長さにする
    getArrayLengsChange(array, targetLengs) {
        let targetArray = [];
        if (array.length == targetLengs) {
            return array;
            // 長さ100を長さ3にするとしたら、25, 50, 75番目を選んでる
        } else if (array.length > targetLengs) {
            let targetIndexTips = array.length / (targetLengs + 1);
            let k = 1;
            let targetIndex = parseInt(targetIndexTips * k);
            for (let i = 0; i < targetLengs; i++) {
                targetArray[i] = array[targetIndex];
                k++;
                targetIndex = parseInt(targetIndexTips * k);
            }
            // 長さ13から長さ16への変換でデータを3個追加するとしたら、13を(3+1)等分した箇所にデータを追加する
        } else if (array.length < targetLengs) {
            let diff = targetLengs - array.length;
            let targetIndexTips = targetLengs / (diff + 1);
            let k = 1;
            let targetIndex = parseInt(targetIndexTips * k);
            let j = 0;
            for (let i = 0; i < targetLengs; i++) {
                if (i == targetIndex) {
                    if (j == 0) {
                        targetArray[i] = array[j];
                    } else {
                        targetArray[i] = (array[j - 1] + array[j]) / 2;
                    }
                    k++;
                    targetIndex = parseInt(targetIndexTips * k);
                } else {
                    targetArray[i] = array[j];
                    j++;
                }
            }
        }
        return targetArray;
    }

    // 標準化
    getHyoujunka(array) {
        // 平均を求める
        let sum = 0;
        for (let i = 0; i < array.length; i++) {
            sum += array[i];
        }
        let heikin = sum / array.length;

        // 偏差を求める
        let hensaArray = array.map((value) => {
            return value - heikin;
        });

        // 偏差を2乗する
        let hensa2Array = hensaArray.map((value) => {
            return value * value;
        });

        // 偏差の2乗の合計
        let hensa2Goukei = 0;
        for (let i = 0; i < hensa2Array.length; i++) {
            hensa2Goukei += hensa2Array[i];
        }

        // 偏差の合計をデータの総数で割って分散を求める
        let bunsan = hensa2Goukei / hensa2Array.length;

        // 分散の正の平方根を求めて標準偏差を算出する
        let hyoujunhensa = Math.sqrt(bunsan);

        // 標準化した配列
        let hyoujunkaArray = [];
        if (hyoujunhensa != 0) {
            hyoujunkaArray = array.map((value) => {
                return (value - heikin) / hyoujunhensa;
            });
        } else {
            for (let i = 0; i < array.length; i++) {
                hyoujunkaArray[i] = 0;
            }
        }

        return hyoujunkaArray;
    }

    // 2次元行列の転置
    getTenti(array) {
        let transpose = (a) => a[0].map((_, c) => a.map((r) => r[c]));
        return transpose(array);
    }
}

let handleTappingRemove = () => {
    document.getElementById("tappingChild").remove();
};

/**
 * to initialize tapping.js. also contain DeviceMotionEvent request permission
 * @param {HTMLElement} dom - dom for binding user action to request permission
 * @param {Function} grantedFunc - function called after permission granted
 * @param {Function} deniedFunc - function called after permission denied
 */
export function tappingjsInit(dom, grantedFunc = null, deniedFunc = null) {
    dom.addEventListener(
        "click",
        async () => {
            const success = await reqPermission();
            if (success == true && grantedFunc != null) {
                grantedFunc();
            }
            if (success == false && deniedFunc != null) {
                deniedFunc();
            }
        },
        { once: true }
    );
}

/**
 * to DeviceMotionEvent request permission
 * @return {boolean} DeviceMotion granted or not
 */
export async function reqPermission() {
    const TS = new TappingSensor();

    // DeviceMotionEventがない時
    if (!window.DeviceMotionEvent) {
        console.log("window.DeviceMotionEventがありません");
        alert("このデバイスはDeviceMotionEventに対応していません");
        return false;
    }
    // DeviceMotionEventがある時
    console.log(window.DeviceMotionEvent);

    // ios13以上の時
    if (DeviceMotionEvent.requestPermission && typeof DeviceMotionEvent.requestPermission === "function") {
        console.log("ios13+");
        // ユーザーに許可を求めるダイアログを表示
        const dme = await DeviceMotionEvent.requestPermission();
        if (dme == "denied") return false;
        if (dme == "granted") {
            window.addEventListener("devicemotion", TS.handleDeviceMotion);
            return true;
        }

        // ios13以上でない時
    } else {
        console.log("non ios13+");
        window.addEventListener("devicemotion", TS.handleDeviceMotion);
        return true;
    }
}

window.addEventListener("load", () => {
    // 向き
    let tappingWindowResize = () => {
        if (window.innerWidth > window.innerHeight) {
            tappingSettings.deviceOrientation = "horizontal";
        } else {
            tappingSettings.deviceOrientation = "vertical";
        }
        // console.log(tappingSettings.deviceOrientation);
    };
    tappingWindowResize();
    window.addEventListener("resize", tappingWindowResize);
});
