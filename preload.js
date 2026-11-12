const { ipcRenderer } = require("electron");

const CHROME_MAJOR = (/Chrome\/(\d+)/.exec(navigator.userAgent) || [null, "120"])[1];
const BROWSER_UA =
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_MAJOR}.0.0.0 Safari/537.36`;
const BROWSER_PLATFORM = "Win32";

const OriginalNotification = window.Notification;

function playNotificationSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            return;
        }
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, context.currentTime);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.15,
            context.currentTime + 0.01
        );
        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            context.currentTime + 0.2
        );
        oscillator.connect(gain);
        gain.connect(context.destination);
        const play = () => {
            oscillator.start();
            oscillator.stop(context.currentTime + 0.22);
        };
        if (context.state === "suspended") {
            context.resume().then(play).catch(() => undefined);
        } else {
            play();
        }
    } catch (error) {
        // Ignore audio playback errors
    }
}

function sendNotification(title, options = {}) {
    ipcRenderer.send("notify", { title, options });
    playNotificationSound();
}

class ElectronNotification {
    constructor(title, options = {}) {
        sendNotification(title, options);
    }

    static requestPermission(callback) {
        const permission = "granted";
        if (typeof callback === "function") {
            callback(permission);
        }
        return Promise.resolve(permission);
    }

    static get permission() {
        return "granted";
    }
}

if (typeof OriginalNotification !== "undefined") {
    ElectronNotification.maxActions = OriginalNotification.maxActions;
}

window.Notification = ElectronNotification;

try {
    if (navigator && typeof navigator === "object") {
        Object.defineProperty(navigator, "platform", {
            get: () => BROWSER_PLATFORM,
            configurable: true,
        });
        Object.defineProperty(navigator, "userAgent", {
            get: () => BROWSER_UA,
            configurable: true,
        });
        const userAgentData = {
            brands: [
                { brand: "Not_A Brand", version: "8" },
                { brand: "Chromium", version: CHROME_MAJOR },
                { brand: "Google Chrome", version: CHROME_MAJOR },
            ],
            mobile: false,
            platform: "Windows",
            platformVersion: "10.0.0",
            getHighEntropyValues(hints) {
                return Promise.resolve({
                    architecture: "x86",
                    bitness: "64",
                    brands: this.brands,
                    fullVersionList: this.brands.map((b) => ({
                        brand: b.brand,
                        version: `${CHROME_MAJOR}.0.0.0`,
                    })),
                    mobile: false,
                    model: "",
                    platform: "Windows",
                    platformVersion: "10.0.0",
                    uaFullVersion: `${CHROME_MAJOR}.0.0.0`,
                });
            },
            toJSON() {
                return { brands: this.brands, mobile: false, platform: "Windows" };
            },
        };
        Object.defineProperty(navigator, "userAgentData", {
            get: () => userAgentData,
            configurable: true,
        });
    }
} catch (error) {
    // Ignore platform spoofing errors
}

if ("serviceWorker" in navigator && window.ServiceWorkerRegistration) {
    const originalShowNotification =
        window.ServiceWorkerRegistration.prototype.showNotification;
    window.ServiceWorkerRegistration.prototype.showNotification = function (
        title,
        options
    ) {
        sendNotification(title, options);
        if (typeof originalShowNotification === "function") {
            return Promise.resolve();
        }
        return Promise.resolve();
    };
}
