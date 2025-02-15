import * as tf from "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/+esm";

class TappingModel {
    constructor() {
        this.model;
        const modelUrl = TAPPING.config.modelUrl;

        this.model_load(modelUrl);

        const event5 = new CustomEvent("tappingHorizontallyRight");
        const event6 = new CustomEvent("tappingHorizontallyLeft");
        const event7 = new CustomEvent("tappingHorizontallyMisDetectioin");

        const event8 = new CustomEvent("tappingHorizontallyRightStrong");
        const event9 = new CustomEvent("tappingHorizontallyLeftStrong");

        this.eventAdvanced = new CustomEvent("tappingAdvanced");

        this.eventDict = {
            5: event5,
            6: event6,
            7: event7,
            8: event8,
            9: event9,
        };
    }

    // モデルの読み込み
    async model_load(modelUrl) {
        try {
            this.model = await tf.loadLayersModel(modelUrl);
            console.log("TensorFlow.js model is loaded.");
        } catch (e) {
            console.log("TensorFlow.js model could not be loaded.");
            console.error(e);
        }
    }

    // 予測（と叩きイベントの発行）
    model_predict(array, strength = 0) {
        // console.log(array);
        if (!this.model) {
            return -1;
        }

        const result = tf.tidy(() => {
            const orientation_arr = [0, 1]; //横画面

            let kinds_arr;
            if (TAPPING.config.deviceKinds == "SE3") {
                kinds_arr = [1, 0, 0];
            } else if (TAPPING.config.deviceKinds == "Nexus9") {
                kinds_arr = [0, 1, 0];
            } else if (TAPPING.config.deviceKinds == "FireHD10") {
                kinds_arr = [0, 0, 1];
            } else {
                kinds_arr = [1, 1, 0];
            }

            const wavefome_tf = tf.tensor([array]);
            const orientation_tf = tf.tensor([orientation_arr]);
            const kinds_tf = tf.tensor([kinds_arr]);

            const arr = [wavefome_tf, orientation_tf, kinds_tf];

            // 予測
            const y_pred = this.model.predict(arr).dataSync();
            console.log("❦=y_pred=========================❦");
            console.log("5:", y_pred[5].toFixed(40));
            console.log("6:", y_pred[6].toFixed(40));
            console.log("7:", y_pred[7].toFixed(40));
            const tf_out = {};
            tf_out["right"] = y_pred[5];
            tf_out["left"] = y_pred[6];
            tf_out["miss"] = y_pred[7];

            // 何番目の確率が一番高いか
            const number = tf.argMax(y_pred).arraySync();

            console.log("ans:", number, strength);

            // 叩きイベントの発行
            this.tappingdDispatchEvent(number, strength, tf_out);

            return number;
        });
        return result;
    }

    // 叩きイベントの発行
    tappingdDispatchEvent(number, strength, tf_out) {
        // 横方向の叩きイベントに対して強弱の判断をする
        let act = number;
        if (strength > TAPPING.config.strength_border) {
            act += 3;
        }
        if (this.eventDict[act]) {
            globalThis.dispatchEvent(this.eventDict[act]);
        }
        //上級者用イベント発行
        this.eventAdvanced.corner = number;
        this.eventAdvanced.strength = strength;
        this.eventAdvanced.tf_out = tf_out;
        globalThis.dispatchEvent(this.eventAdvanced);
    }
}

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

        const now = Date.now();

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
        const ua = navigator.userAgent;
        if (
            ua.indexOf("iPhone") >= 0 || ua.indexOf("iPad") >= 0 ||
            navigator.userAgent.indexOf("iPod") >= 0
        ) {
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
            this.checkTappingEnd(now);
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
        while (
            this.arrTime[0] < now - TAPPING.config.beforeThresholdTimeRange &&
            this.isTapping == false
        ) {
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
    checkTappingStart(ax, ay, az, now) {
        if (now > this.shikiitiTime + TAPPING.config.tappingMinimumInterval) {
            if (
                Math.abs(ax) > TAPPING.config.tappingThreshold ||
                Math.abs(ay) > TAPPING.config.tappingThreshold ||
                Math.abs(az) > TAPPING.config.tappingThreshold
            ) {
                this.isTapping = true;
                this.shikiitiTime = now;
            }
        }
    }

    // 叩きの終わりを検知
    checkTappingEnd(now) {
        if (this.isTapping == true) {
            if (
                now > this.shikiitiTime + TAPPING.config.afterThresholdTimeRange
            ) {
                this.isTapping = false;

                // // 前処理
                const [arr, strength] = this.preprocessing();

                // 予測と叩きイベントの発行
                this.tappingModel.model_predict(arr, strength);
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
        const strength_arry = [];

        for (let i = 0; i < _ax.length; i++) {
            strength_arry[i] = _ax[i] ** 2 + _ay[i] ** 2 + _az[i] ** 2;
        }

        const maxIndex = strength_arry.indexOf(Math.max(...strength_arry));

        //叩きの強度を計算
        const strength = Math.sqrt(strength_arry[maxIndex]);

        let _array = [_ax, _ay, _az, _rx, _ry, _rz];

        _array = this.getTenti(_array);

        return [_array, strength];
    }

    // array(1次元)をtargetLengsの長さにする
    getArrayLengsChange(array, targetLengs) {
        const targetArray = [];
        if (array.length == targetLengs) {
            return array;
            // 長さ100を長さ3にするとしたら、25, 50, 75番目を選んでる
        } else if (array.length > targetLengs) {
            const targetIndexTips = array.length / (targetLengs + 1);
            let k = 1;
            let targetIndex = parseInt(targetIndexTips * k);
            for (let i = 0; i < targetLengs; i++) {
                targetArray[i] = array[targetIndex];
                k++;
                targetIndex = parseInt(targetIndexTips * k);
            }
            // 長さ13から長さ16への変換でデータを3個追加するとしたら、13を(3+1)等分した箇所にデータを追加する
        } else if (array.length < targetLengs) {
            const diff = targetLengs - array.length;
            const targetIndexTips = targetLengs / (diff + 1);
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
        const heikin = sum / array.length;

        // 偏差を求める
        const hensaArray = array.map((value) => {
            return value - heikin;
        });

        // 偏差を2乗する
        const hensa2Array = hensaArray.map((value) => {
            return value * value;
        });

        // 偏差の2乗の合計
        let hensa2Goukei = 0;
        for (let i = 0; i < hensa2Array.length; i++) {
            hensa2Goukei += hensa2Array[i];
        }

        // 偏差の合計をデータの総数で割って分散を求める
        const bunsan = hensa2Goukei / hensa2Array.length;

        // 分散の正の平方根を求めて標準偏差を算出する
        const hyoujunhensa = Math.sqrt(bunsan);

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
        const transpose = (a) => a[0].map((_, c) => a.map((r) => r[c]));
        return transpose(array);
    }
}

export class TAPPING {
    static config = {
        // デフォルトの閾値
        defaultTappingThreshold: 1,
        // ユーザがキャリブレーションした閾値
        tappingThreshold: 1,
        // 閾値の前の時間
        beforeThresholdTimeRange: 200, // 0.2秒
        // 閾値の後の時間
        afterThresholdTimeRange: 50, // 0.05秒
        // 叩きの最低間隔(連続で叩きイベントが発行されないようにする)
        tappingMinimumInterval: 500, //0.5秒
        // TensorFlor.jsモデルのパス
        modelUrl:
            "https://cdn.jsdelivr.net/gh/aisuQwQ/ImpactInput/src/tfjs/model.json",
        // 向き
        deviceOrientation: "portrait",
        // 機種
        deviceKinds: "others",
        //強弱の閾値
        strength_border: 5.0,
    };
    /**
     * to initialize tapping.js. also contain DeviceMotionEvent request permission
     * @param {HTMLElement} dom - dom for binding user action to request permission
     * @param {Function} grantedFunc - function called after permission granted
     * @param {Function} deniedFunc - function called after permission denied
     */
    constructor(dom, grantedFunc = null, deniedFunc = null) {
        this.tappingjsInit(dom, grantedFunc, deniedFunc);

        //resize時の処理バインド
        globalThis.addEventListener(
            "load",
            () => {
                this.windowResize();
                globalThis.addEventListener("resize", this.windowResize);
            },
            { once: true },
        );
    }

    /**
     * func to save device's orientation
     */
    windowResize() {
        if (globalThis.innerWidth > globalThis.innerHeight) {
            TAPPING.config.deviceOrientation = "landscape";
        } else {
            TAPPING.config.deviceOrientation = "portrait";
        }
    }

    /**
     * to initialize tapping.js. also contain DeviceMotionEvent request permission
     * @param {HTMLElement} dom - dom for binding user action to request permission
     * @param {Function} grantedFunc - function called after permission granted
     * @param {Function} deniedFunc - function called after permission denied
     */
    tappingjsInit(dom, grantedFunc = null, deniedFunc = null) {
        dom.addEventListener(
            "click",
            async () => {
                const success = await this.reqPermission();
                if (success == true && grantedFunc != null) {
                    grantedFunc();
                }
                if (success == false && deniedFunc != null) {
                    deniedFunc();
                }
            },
            { once: true },
        );
    }

    /**
     * to DeviceMotionEvent request permission
     * @return {boolean} DeviceMotion granted or not
     * @see TappingSensor
     */
    async reqPermission() {
        const TS = new TappingSensor();

        // DeviceMotionEventがない時
        if (!globalThis.DeviceMotionEvent) {
            console.log("globalThis.DeviceMotionEventがありません");
            alert("このデバイスはDeviceMotionEventに対応していません");
            return false;
        }
        // DeviceMotionEventがある時
        console.log(globalThis.DeviceMotionEvent);

        // ios13以上の時
        if (
            DeviceMotionEvent.requestPermission &&
            typeof DeviceMotionEvent.requestPermission === "function"
        ) {
            console.log("ios13+");
            // ユーザーに許可を求めるダイアログを表示
            const dme = await DeviceMotionEvent.requestPermission();
            if (dme == "denied") return false;
            if (dme == "granted") {
                globalThis.addEventListener(
                    "devicemotion",
                    TS.handleDeviceMotion,
                );
                return true;
            }

            // ios13以上でない時
        } else {
            console.log("non ios13+");
            globalThis.addEventListener("devicemotion", TS.handleDeviceMotion);
            return true;
        }
    }
}
