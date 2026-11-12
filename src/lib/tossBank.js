// 토스 응답은 은행 이름 없이 두 자리 코드 또는 금융결제원 세 자리 코드만 준다.
// https://docs.tosspayments.com/codes/org-codes#은행-코드
const TOSS_BANKS = [
    { name: "경남은행", codes: ["039", "39", "경남", "KYONGNAMBANK"] },
    { name: "광주은행", codes: ["034", "34", "광주", "GWANGJUBANK"] },
    { name: "단위농협(지역농축협)", codes: ["012", "12", "단위농협", "LOCALNONGHYEOP"] },
    { name: "부산은행", codes: ["032", "32", "부산", "BUSANBANK"] },
    { name: "새마을금고", codes: ["045", "45", "새마을", "SAEMAUL"] },
    { name: "산림조합", codes: ["064", "64", "산림", "SANLIM"] },
    { name: "신한은행", codes: ["088", "88", "신한", "SHINHAN"] },
    { name: "신협", codes: ["048", "48", "신협", "SHINHYEOP"] },
    { name: "씨티은행", codes: ["027", "27", "씨티", "CITI"] },
    { name: "우리은행", codes: ["020", "20", "우리", "WOORI"] },
    { name: "우체국예금보험", codes: ["071", "71", "우체국", "POST"] },
    { name: "저축은행중앙회", codes: ["050", "50", "저축", "SAVINGBANK"] },
    { name: "전북은행", codes: ["037", "37", "전북", "JEONBUKBANK"] },
    { name: "제주은행", codes: ["035", "35", "제주", "JEJUBANK"] },
    { name: "카카오뱅크", codes: ["090", "90", "카카오", "KAKAOBANK"] },
    { name: "케이뱅크", codes: ["089", "89", "케이", "KBANK"] },
    { name: "토스뱅크", codes: ["092", "92", "토스", "TOSSBANK"] },
    { name: "하나은행", codes: ["081", "81", "하나", "HANA"] },
    { name: "홍콩상하이은행", codes: ["054", "54", "HSBC"] },
    { name: "Bank of America", codes: ["060", "60", "BOA"] },
    { name: "IBK기업은행", codes: ["003", "03", "기업", "IBK"] },
    { name: "KB국민은행", codes: ["004", "06", "국민", "KOOKMIN"] },
    { name: "iM뱅크(대구)", codes: ["031", "31", "대구", "DAEGUBANK"] },
    { name: "한국산업은행", codes: ["002", "02", "산업", "KDBBANK"] },
    { name: "NH농협은행", codes: ["011", "11", "농협", "NONGHYEOP"] },
    { name: "SC제일은행", codes: ["023", "23", "SC제일", "SC"] },
    { name: "Sh수협은행", codes: ["007", "07", "수협", "SUHYEOP"] },
    { name: "수협중앙회", codes: ["030", "30", "수협중앙회", "SUHYEOPLOCALBANK"] },
];
const bankNameByCode = new Map(TOSS_BANKS.flatMap((bank) => bank.codes.map((code) => [code.toUpperCase(), bank.name])));
export function tossBankName(code) {
    if (code === null || code === undefined) {
        return null;
    }
    const trimmed = code.trim();
    if (trimmed === "") {
        return null;
    }
    const matched = bankNameByCode.get(trimmed.toUpperCase());
    if (matched !== undefined) {
        return matched;
    }
    if (/^\d+$/.test(trimmed)) {
        const twoDigit = bankNameByCode.get(trimmed.padStart(2, "0"));
        if (twoDigit !== undefined) {
            return twoDigit;
        }
        const official = bankNameByCode.get(trimmed.padStart(3, "0"));
        if (official !== undefined) {
            return official;
        }
    }
    return trimmed;
}
