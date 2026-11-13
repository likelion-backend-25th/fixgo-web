const SCRIPT_URL = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
let loading = null;
function readDaum() {
    return window.daum;
}
// 카카오 우편번호 스크립트는 페이지에 한 번만 붙인다.
export function loadDaumPostcode() {
    const existing = readDaum()?.Postcode;
    if (existing !== undefined) {
        return Promise.resolve(existing);
    }
    if (loading !== null) {
        return loading;
    }
    loading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = SCRIPT_URL;
        script.async = true;
        script.onload = () => {
            const Postcode = readDaum()?.Postcode;
            if (Postcode === undefined) {
                loading = null;
                reject(new Error("카카오 우편번호 서비스를 불러오지 못했습니다."));
                return;
            }
            resolve(Postcode);
        };
        script.onerror = () => {
            loading = null;
            reject(new Error("카카오 우편번호 서비스를 불러오지 못했습니다."));
        };
        document.head.appendChild(script);
    });
    return loading;
}
const INSECURE_SEARCH_ORIGIN = "http://postcode.map.kakao.com";
function secureSearchUrl(src) {
    if (!src.startsWith(INSECURE_SEARCH_ORIGIN)) {
        return null;
    }
    return `https://postcode.map.kakao.com${src.slice(INSECURE_SEARCH_ORIGIN.length)}`;
}
// 페이지가 http여도 localhost는 보안 컨텍스트라, 스크립트가 고른 http 검색 프레임은 브라우저가 막는다.
function upgradePostcodeFrames(root) {
    root.querySelectorAll("iframe").forEach((iframe) => {
        const next = secureSearchUrl(iframe.getAttribute("src") ?? "");
        if (next !== null) {
            iframe.src = next;
        }
        try {
            const doc = iframe.contentDocument;
            if (doc !== null) {
                upgradePostcodeFrames(doc);
            }
        }
        catch {
            // 이미 https로 열린 검색 프레임은 다른 출처다.
        }
    });
}
export function embedDaumPostcode(element, options) {
    return loadDaumPostcode().then((Postcode) => {
        if (!element.isConnected) {
            return;
        }
        element.replaceChildren();
        new Postcode(options).embed(element);
        upgradePostcodeFrames(element);
        const observer = new MutationObserver(() => upgradePostcodeFrames(element));
        observer.observe(element, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["src"],
        });
        element.querySelectorAll("iframe").forEach((iframe) => {
            try {
                const doc = iframe.contentDocument;
                if (doc !== null) {
                    observer.observe(doc, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ["src"],
                    });
                }
            }
            catch {
                // 검색 프레임 문서는 관찰하지 않는다.
            }
        });
        window.setTimeout(() => observer.disconnect(), 4000);
    });
}
export function selectedAddress(data) {
    const base = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
    if (data.userSelectedType !== "R") {
        return base;
    }
    const extras = [];
    if (data.bname !== "" && /[동로가]$/.test(data.bname)) {
        extras.push(data.bname);
    }
    if (data.buildingName !== "" && data.apartment === "Y") {
        extras.push(data.buildingName);
    }
    return extras.length === 0 ? base : `${base} (${extras.join(", ")})`;
}
