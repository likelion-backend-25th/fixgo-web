const SCRIPT_URL = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

export interface DaumPostcodeResult {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: string;
  bname: string;
  buildingName: string;
  apartment: string;
}

interface DaumPostcodeOptions {
  oncomplete: (data: DaumPostcodeResult) => void;
  width?: string;
  height?: string;
}

interface DaumPostcodeInstance {
  embed: (element: HTMLElement) => void;
}

interface DaumNamespace {
  Postcode: new (options: DaumPostcodeOptions) => DaumPostcodeInstance;
}

let loading: Promise<DaumNamespace["Postcode"]> | null = null;

function readDaum(): DaumNamespace | undefined {
  return (window as Window & { daum?: DaumNamespace }).daum;
}

// 카카오 우편번호 스크립트는 페이지에 한 번만 붙인다.
export function loadDaumPostcode(): Promise<DaumNamespace["Postcode"]> {
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

export function selectedAddress(data: DaumPostcodeResult): string {
  const base = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
  if (data.userSelectedType !== "R") {
    return base;
  }
  const extras: string[] = [];
  if (data.bname !== "" && /[동로가]$/.test(data.bname)) {
    extras.push(data.bname);
  }
  if (data.buildingName !== "" && data.apartment === "Y") {
    extras.push(data.buildingName);
  }
  return extras.length === 0 ? base : `${base} (${extras.join(", ")})`;
}
