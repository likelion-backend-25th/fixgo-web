import type {
  AsRecord,
  CustomerRecord,
  HistoryRow,
  MemberRecord,
  CostRecord,
  PartRecord,
  PaymentRecord,
  PresetRecord,
  ProductRecord,
  RepairLine,
  ShipmentRecord,
  EmailRecord,
} from "@/types/screen";

export const asRecords: AsRecord[] = [
  {
    id: "AS-2026-1112",
    customerName: "한소희",
    phone: "010-5555-1212",
    email: "user@gmail.com",
    postalCode: "12345",
    address: "서울특별시 강남구 테헤란로 00",
    addressDetail: "00아파트 00동 00호",
    productGroup: "스마트폰",
    modelName: "SZ-P24",
    serial: "SZP24-22018-51542",
    purchasedAt: "2025-05-14",
    symptom: "스피커 불량",
    symptomDetail: "스피커가 지지직 거리고 소리가 잘 안 들립니다.",
    memo: "-",
    receiveMethod: "방문",
    receptionist: "최미소",
    technician: "김철수",
    status: "접수",
    receivedAt: "2026-10-23",
    assignedAt: "2026-10-23",
    portalToken: "sahd123dh128ds23w4a1",
  },
  {
    id: "AS-2026-1108",
    customerName: "김민수",
    phone: "010-2222-1818",
    email: "minsu@example.com",
    postalCode: "06236",
    address: "서울특별시 강남구 테헤란로 123",
    addressDetail: "선경타워 501호",
    productGroup: "스마트폰",
    modelName: "SZ-P24",
    serial: "SZP24-10021",
    purchasedAt: "2025-11-02",
    symptom: "충전 안됨",
    symptomDetail: "충전선을 연결해도 인식을 못함",
    memo: "급하게 확인 요청",
    receiveMethod: "택배",
    receptionist: "최미소",
    technician: "김철수",
    status: "점검 중",
    receivedAt: "2026-10-23",
    assignedAt: "2026-10-24",
    portalToken: "fixgo1108token24",
  },
  {
    id: "AS-2026-1094",
    customerName: "이서연",
    phone: "010-3333-9090",
    email: "seoyeon@example.com",
    postalCode: "04524",
    address: "서울특별시 중구 세종대로 110",
    addressDetail: "3층",
    productGroup: "노트북",
    modelName: "SZ-N16",
    serial: "SZN16-33011",
    purchasedAt: "2024-08-01",
    symptom: "키보드 불량",
    symptomDetail: "일부 키가 입력되지 않습니다.",
    memo: "-",
    receiveMethod: "방문",
    receptionist: "최미소",
    technician: "김철수",
    status: "수리 중",
    receivedAt: "2026-10-20",
    assignedAt: "2026-10-21",
    portalToken: "fixgo1094token24",
  },
  {
    id: "AS-2026-1081",
    customerName: "박준호",
    phone: "010-7777-4040",
    email: "junho@example.com",
    postalCode: "13529",
    address: "경기도 성남시 분당구 판교역로 166",
    addressDetail: "101동",
    productGroup: "스마트폰",
    modelName: "SZ-P23",
    serial: "SZP23-18002",
    purchasedAt: "2024-03-11",
    symptom: "배터리 방전",
    symptomDetail: "완충 후에도 금세 배터리가 닳습니다.",
    memo: "-",
    receiveMethod: "택배",
    receptionist: "최미소",
    technician: "김철수",
    status: "견적 승인 대기",
    receivedAt: "2026-10-18",
    assignedAt: "2026-10-19",
    portalToken: "fixgo1081token24",
  },
  {
    id: "AS-2026-1076",
    customerName: "최유진",
    phone: "010-8888-3030",
    email: "yujin@example.com",
    postalCode: "48058",
    address: "부산광역시 해운대구 센텀서로 30",
    addressDetail: "1204호",
    productGroup: "노트북",
    modelName: "SZ-N14",
    serial: "SZN14-77120",
    purchasedAt: "2023-12-02",
    symptom: "액정 불량",
    symptomDetail: "화면에 줄이 갑니다.",
    memo: "-",
    receiveMethod: "택배",
    receptionist: "최미소",
    technician: "김철수",
    status: "완료",
    receivedAt: "2026-10-12",
    assignedAt: "2026-10-13",
    portalToken: "fixgo1076token24",
  },
  {
    id: "AS-2026-1062",
    customerName: "정하늘",
    phone: "010-4444-2020",
    email: "haneul@example.com",
    postalCode: "21986",
    address: "인천광역시 연수구 송도과학로 32",
    addressDetail: "B동",
    productGroup: "스마트폰",
    modelName: "SZ-P24",
    serial: "SZP24-55210",
    purchasedAt: "2025-01-20",
    symptom: "침수",
    symptomDetail: "물에 빠진 뒤 전원이 들어오지 않습니다.",
    memo: "-",
    receiveMethod: "방문",
    receptionist: "최미소",
    technician: "김철수",
    status: "점검 중",
    receivedAt: "2026-10-11",
    assignedAt: "2026-10-11",
    portalToken: "fixgo1062token24",
  },
  {
    id: "AS-2026-1044",
    customerName: "오세훈",
    phone: "010-6666-1010",
    email: "sehun@example.com",
    postalCode: "34126",
    address: "대전광역시 유성구 대학로 99",
    addressDetail: "기숙사 2동",
    productGroup: "스마트폰",
    modelName: "SZ-P23",
    serial: "SZP23-90991",
    purchasedAt: "2022-06-18",
    symptom: "전원 불량",
    symptomDetail: "전원 버튼이 반응하지 않습니다.",
    memo: "견적 거부",
    receiveMethod: "택배",
    receptionist: "최미소",
    technician: "김철수",
    status: "수리 거부",
    receivedAt: "2026-10-02",
    assignedAt: "2026-10-03",
    portalToken: "fixgo1044token24",
  },
];

export const customers: CustomerRecord[] = [
  { id: "c-hansohee", name: "한소희", phone: "010-5555-1212", email: "user@gmail.com", postalCode: "12345", address: "서울특별시 강남구 테헤란로 00 00아파트 00동 00호", registeredAt: "2026-05-14" },
  { id: "c-kimminsoo", name: "김민수", phone: "010-2222-1818", email: "minsu@example.com", postalCode: "06236", address: "서울특별시 강남구 테헤란로 123 선경타워 501호", registeredAt: "2025-11-02" },
  { id: "c-leeseoyeon", name: "이서연", phone: "010-3333-9090", email: "seoyeon@example.com", postalCode: "04524", address: "서울특별시 중구 세종대로 110 3층", registeredAt: "2024-08-01" },
  { id: "c-parkjunho", name: "박준호", phone: "010-7777-4040", email: "junho@example.com", postalCode: "13529", address: "경기도 성남시 분당구 판교역로 166 101동", registeredAt: "2024-03-11" },
  { id: "c-choiyujin", name: "최유진", phone: "010-8888-3030", email: "yujin@example.com", postalCode: "48058", address: "부산광역시 해운대구 센텀서로 30 1204호", registeredAt: "2023-12-02" },
  { id: "c-junghaneul", name: "정하늘", phone: "010-4444-2020", email: "haneul@example.com", postalCode: "21986", address: "인천광역시 연수구 송도과학로 32 B동", registeredAt: "2025-01-20" },
  { id: "c-ohsehun", name: "오세훈", phone: "010-6666-1010", email: "sehun@example.com", postalCode: "34126", address: "대전광역시 유성구 대학로 99 기숙사 2동", registeredAt: "2022-06-18" },
];

export const members: MemberRecord[] = [
  { id: "reception1", name: "최미소", email: "miso@fixgo.kr", phone: "010-2000-0002", role: "접수담당자", status: "사용", address: "서울특별시 강남구 테헤란로 123 선경타워 5층" },
  { id: "reception2", name: "박지윤", email: "jiyoon@fixgo.kr", phone: "010-2000-0003", role: "접수담당자", status: "사용", address: "서울특별시 강남구 테헤란로 123 선경타워 5층" },
  { id: "tech1", name: "김철수", email: "as123@naver.com", phone: "010-1234-4321", role: "수리기사", status: "사용", address: "서울특별시 강남구 테헤란로 123 선경타워 5층 501호" },
  { id: "tech2", name: "박철수", email: "park@fixgo.kr", phone: "010-1234-5678", role: "수리기사", status: "사용", address: "서울특별시 강남구 테헤란로 200 수리동 2층" },
  { id: "admin1", name: "한도윤", email: "admin1@fixgo.kr", phone: "010-1000-0001", role: "관리자", status: "사용", address: "서울특별시 강남구 테헤란로 123 선경타워 5층" },
  { id: "admin2", name: "서민재", email: "admin2@fixgo.kr", phone: "010-1000-0002", role: "관리자", status: "사용", address: "서울특별시 강남구 테헤란로 123 선경타워 5층" },
];

export const payments: PaymentRecord[] = [
  { orderId: "B-2026-1076", asId: "AS-2026-1076", customerName: "최유진", productName: "SZ-N14", symptom: "액정 불량", amount: 45000, status: "결제 대기", method: "가상계좌", virtualAccount: "110-234-567890", dueAt: "2026-11-05" },
  { orderId: "B-2026-1062", asId: "AS-2026-1062", customerName: "정하늘", productName: "SZ-P24", symptom: "침수", amount: 120000, status: "결제 대기", method: "카드" },
  { orderId: "B-2026-1044", asId: "AS-2026-1044", customerName: "오세훈", productName: "SZ-P23", symptom: "전원 불량", amount: 15000, status: "결제 완료", method: "카드", cardNumber: "1234-56**-****-7890", paidAt: "2026-10-20" },
  { orderId: "B-2026-0990", asId: "AS-2026-1108", customerName: "김민수", productName: "SZ-P24", symptom: "충전 안됨", amount: 120000, status: "결제 완료", method: "가상계좌", cardNumber: "-", paidAt: "2026-10-28" },
];

export const shipments: ShipmentRecord[] = [
  { no: 18, asId: "AS-2026-1112", method: "택배", receiver: "김수민", phone: "010-5555-1212", carrier: "CJ대한통운", trackingNo: "5100-2219", status: "배송중", startedAt: "2026.10.25 14:10" },
  { no: 17, asId: "AS-2026-1108", method: "택배", receiver: "장우진", phone: "010-3333-9090", carrier: "한진택배", trackingNo: "5099-1002", status: "배송완료", startedAt: "2026.10.24 11:02" },
  { no: 16, asId: "AS-2026-1094", method: "방문 수령", receiver: "한소희", phone: "010-7777-4040", carrier: "-", trackingNo: "-", status: "수령완료", startedAt: "-" },
  { no: 15, asId: "AS-2026-1062", method: "택배", receiver: "정하늘", phone: "010-4444-2020", carrier: "사자택배", trackingNo: "5100-2219", status: "배송대기", startedAt: "-" },
];

export const emailRecords: EmailRecord[] = [
  {
    id: "124",
    sentAt: "2024-10-24 10:24",
    customerName: "김수민",
    email: "user1@example.com",
    asId: "AS-2024-124",
    subject: "[FixGo] A/S 접수 완료 안내",
    summary: "접수 완료 안내",
    body: "고객님의 A/S 접수가 정상적으로 완료되었습니다.\n진행 상황은 안내 링크에서 확인하실 수 있습니다.",
    status: "성공",
    channel: "이메일",
    failReason: "-",
  },
  {
    id: "123",
    sentAt: "2024-10-24 09:18",
    customerName: "장우진",
    email: "user2@example.com",
    asId: "AS-2024-123",
    subject: "[FixGo] 수리 완료 안내",
    summary: "수리 완료 안내",
    body: "[FixGo] 고객님의 수리가 완료되었습니다.\n담당 기사: 김기사\n연락처: 010-1234-1234\n결제 확인 후 제품을 수령해 주세요.",
    status: "성공",
    channel: "이메일",
    failReason: "-",
  },
  {
    id: "122",
    sentAt: "2024-10-23 16:40",
    customerName: "한소희",
    email: "user3@example.com",
    asId: "AS-2024-128",
    subject: "[FixGo] 수리 완료 안내",
    summary: "입금 요청 안내",
    body: "[FixGo] 고객님의 수리가 완료되었습니다.\n담당 기사: 김기사\n연락처: 010-1234-1234\n결제 확인 후 제품을 수령해 주세요.",
    status: "실패",
    channel: "SMS",
    failReason: "SMTP 서버 연결 실패",
  },
];

export const products: ProductRecord[] = [
  { id: "SZ-P24", modelName: "SZ-P24", productName: "사자폰24", group: "스마트폰", warrantyMonths: 12, status: "사용" },
  { id: "SZ-P23", modelName: "SZ-P23", productName: "사자폰23", group: "스마트폰", warrantyMonths: 12, status: "사용" },
  { id: "SZ-N16", modelName: "SZ-N16", productName: "사자북(16인치)", group: "노트북", warrantyMonths: 12, status: "사용" },
  { id: "SZ-N14", modelName: "SZ-N14", productName: "사자북(14인치)", group: "노트북", warrantyMonths: 24, status: "단종" },
];

export const parts: PartRecord[] = [
  { id: "p-usb", name: "USB 포트", code: "P-USB-001", price: 15000, stock: 20, status: "사용" },
  { id: "p-board", name: "충전 보드", code: "P-CHG-002", price: 25000, stock: 4, status: "재고 부족" },
  { id: "p-lcd", name: "액정 패널", code: "P-LCD-003", price: 180000, stock: 3, status: "사용" },
  { id: "p-main", name: "메인보드", code: "P-MB-004", price: null, stock: 0, status: "단종" },
];

export const costRecords: CostRecord[] = [
  { id: "1", product: "스마트폰", category: "공임비", amountLabel: "6,000원/10분" },
  { id: "2", product: "노트북", category: "공임비", amountLabel: "8,000원/10분" },
  { id: "3", product: "스마트폰", category: "점검비", amountLabel: "15,000원" },
  { id: "4", product: "노트북", category: "점검비", amountLabel: "20,000원" },
];

export const presets: PresetRecord[] = [
  { id: "pr-charge", kind: "수리", name: "충전 단자 교체", symptom: "충전 안됨", minutes: 30, parts: "USB 포트, 충전 보드", description: "충전 단자와 보드를 교체합니다." },
  { id: "pr-lcd", kind: "수리", name: "액정 모듈 교체", symptom: "화면 안켜짐", minutes: 90, parts: "액정 패널", description: "액정 모듈을 교체합니다." },
  { id: "pr-key", kind: "수리", name: "키보드 교체", symptom: "키보드 불량", minutes: 60, parts: "키보드 모듈", description: "키보드 모듈을 교체합니다." },
  { id: "ps-charge", kind: "증상", name: "충전 안됨", symptom: "충전 안됨", minutes: 10, parts: "-", description: "충전 단자가 인식되지 않는 증상" },
  { id: "ps-lcd", kind: "증상", name: "화면 안켜짐", symptom: "화면 안켜짐", minutes: 10, parts: "-", description: "화면이 켜지지 않는 증상" },
  { id: "ps-key", kind: "증상", name: "키보드 불량", symptom: "키보드 불량", minutes: 10, parts: "-", description: "일부 키가 입력되지 않는 증상" },
  { id: "ps-speaker", kind: "증상", name: "스피커 불량", symptom: "스피커 불량", minutes: 10, parts: "-", description: "소리가 지지직거리거나 나지 않는 증상" },
];

export const serials = [
  { serial: "SZP24-22018-51542", group: "스마트폰", modelName: "SZ-P24", producedAt: "2025-04-02" },
  { serial: "SZP24-10021", group: "스마트폰", modelName: "SZ-P24", producedAt: "2025-09-18" },
  { serial: "SZN16-33011", group: "노트북", modelName: "SZ-N16", producedAt: "2024-06-01" },
  { serial: "SZP23-18002", group: "스마트폰", modelName: "SZ-P23", producedAt: "2024-01-22" },
];

export const addresses = [
  { postalCode: "06236", road: "서울특별시 강남구 테헤란로 123", lot: "서울특별시 강남구 역삼동 123-4", building: "선경타워" },
  { postalCode: "04524", road: "서울특별시 중구 세종대로 110", lot: "서울특별시 중구 태평로1가 31", building: "서울시청" },
  { postalCode: "13529", road: "경기도 성남시 분당구 판교역로 166", lot: "경기도 성남시 분당구 백현동 532", building: "카카오판교아지트" },
];

export const technicians = [
  { name: "김철수", email: "kim@fixgo.kr", waiting: 2, repairing: 1, hours: 6, status: "근무" },
  { name: "박철수", email: "park@fixgo.kr", waiting: 1, repairing: 2, hours: 8, status: "근무" },
  { name: "이서연", email: "lee.tech@fixgo.kr", waiting: 0, repairing: 0, hours: 2, status: "휴가" },
];

export const allocationHistory: HistoryRow[] = [
  { id: "al-1", at: "2026-10-24 09:10", asId: "AS-2026-1108", customerName: "김민수", modelName: "SZ-P24", category: "최초 배정", before: "-", after: "김철수", actor: "최미소", reason: "접수 배정", status: "점검 중" },
  { id: "al-2", at: "2026-10-21 14:22", asId: "AS-2026-1094", customerName: "이서연", modelName: "SZ-N16", category: "변경", before: "박철수", after: "김철수", actor: "최미소", reason: "업무량 조정", status: "수리 중" },
];

export const statusHistory: HistoryRow[] = [
  { id: "st-1", at: "2026-10-28 11:00", asId: "AS-2026-1108", customerName: "김민수", modelName: "SZ-P24", category: "상태", before: "접수", after: "점검 중", actor: "김철수", reason: "점검 시작", status: "점검 중" },
  { id: "st-2", at: "2026-10-22 16:18", asId: "AS-2026-1094", customerName: "이서연", modelName: "SZ-N16", category: "상태", before: "견적 승인 대기", after: "수리 중", actor: "김철수", reason: "고객 견적 승인", status: "수리 중" },
  { id: "st-3", at: "2026-10-08 10:02", asId: "AS-2026-1044", customerName: "오세훈", modelName: "SZ-P23", category: "상태", before: "견적 승인 대기", after: "수리 거부", actor: "고객", reason: "견적 거부", status: "수리 거부" },
];

export const depositRows = [
  { asId: "AS-2026-1076", customerName: "최유진", modelName: "SZ-N14", amount: 45000, billedAt: "2026-10-26", elapsed: 4, status: "입금 대기" },
  { asId: "AS-2026-1062", customerName: "정하늘", modelName: "SZ-P24", amount: 120000, billedAt: "2026-10-18", elapsed: 12, status: "연체" },
];

export const technicianStats = [
  { name: "김민수", assigned: 42, done: 30, doing: 12, avgDays: 3.1, sales: 8200000 },
  { name: "이서연", assigned: 35, done: 28, doing: 7, avgDays: 2.8, sales: 6400000 },
  { name: "박준호", assigned: 28, done: 20, doing: 8, avgDays: 4.2, sales: 5100000 },
  { name: "최유리", assigned: 21, done: 18, doing: 3, avgDays: 2.4, sales: 3900000 },
];

export const modelStats = [
  { id: "SZ-P24", modelName: "Galaxy S24", group: "스마트폰", received: 32, done: 28, doing: 4, avgDays: 2.8, symptom: "배터리" },
  { id: "iphone-15", modelName: "iPhone 15", group: "스마트폰", received: 27, done: 24, doing: 3, avgDays: 3.1, symptom: "액정" },
  { id: "SZ-N16", modelName: "Galaxy Book4", group: "노트북", received: 18, done: 14, doing: 4, avgDays: 4.5, symptom: "키보드" },
  { id: "ipad", modelName: "iPad Air", group: "태블릿", received: 12, done: 10, doing: 2, avgDays: 2.4, symptom: "충전" },
];

export const symptomBars: Record<string, { label: string; count: number }[]> = {
  "SZ-P24": [
    { label: "배터리", count: 14 },
    { label: "충전", count: 9 },
    { label: "액정", count: 6 },
    { label: "스피커", count: 3 },
  ],
  "iphone-15": [
    { label: "액정", count: 12 },
    { label: "배터리", count: 8 },
    { label: "카메라", count: 7 },
  ],
  "SZ-N16": [
    { label: "키보드", count: 8 },
    { label: "액정", count: 6 },
    { label: "전원", count: 4 },
  ],
  ipad: [
    { label: "충전", count: 7 },
    { label: "액정", count: 5 },
  ],
};

export const repairCostSeries = [
  { date: "10/01", amount: 1_820_000 },
  { date: "10/04", amount: 2_140_000 },
  { date: "10/07", amount: 1_560_000 },
  { date: "10/10", amount: 2_480_000 },
  { date: "10/13", amount: 1_970_000 },
  { date: "10/16", amount: 2_310_000 },
  { date: "10/19", amount: 1_640_000 },
  { date: "10/22", amount: 2_050_000 },
  { date: "10/25", amount: 1_280_000 },
  { date: "10/28", amount: 1_150_000 },
];

export const incompleteRows = [
  { asId: "AS-2026-1062", customerName: "정하늘", modelName: "SZ-P24", status: "점검 중", technician: "김철수", elapsed: 19, lastAction: "2026-10-11" },
  { asId: "AS-2026-1044", customerName: "오세훈", modelName: "SZ-P23", status: "수리 거부", technician: "김철수", elapsed: 28, lastAction: "2026-10-08" },
];

export function findAs(id: string): AsRecord | undefined {
  return asRecords.find((row) => row.id === id);
}

export function inspectionLines(record: AsRecord): RepairLine[] {
  if (record.id === "AS-2026-1108") {
    return [
      { id: "sym", kind: "증상", name: "충전 단자 손상", quantityLabel: "-", unitPriceLabel: "-", amount: 0 },
      { id: "labor", kind: "작업", name: "충전 단자 교체", quantityLabel: "40분", unitPriceLabel: "6,000/10분", amount: 24000 },
      { id: "usb", kind: "부품", name: "USB 포트", quantityLabel: "1", unitPriceLabel: "15,000", amount: 15000, indent: true },
      { id: "board", kind: "부품", name: "충전 보드", quantityLabel: "1", unitPriceLabel: "25,000", amount: 25000, indent: true },
    ];
  }
  if (record.id === "AS-2026-1094") {
    return [
      { id: "sym", kind: "증상", name: "키보드 불량", quantityLabel: "-", unitPriceLabel: "-", amount: 0 },
      { id: "labor", kind: "작업", name: "키보드 모듈 교체", quantityLabel: "60분", unitPriceLabel: "10,000/10분", amount: 60000 },
      { id: "key", kind: "부품", name: "키보드 모듈", quantityLabel: "1", unitPriceLabel: "45,000", amount: 45000, indent: true },
    ];
  }
  return [{ id: "sym", kind: "증상", name: record.symptom, quantityLabel: "-", unitPriceLabel: "-", amount: 0 }];
}

export function pastRepairs(customerName: string) {
  return asRecords
    .filter((row) => row.customerName === customerName)
    .map((row) => ({
      id: row.id,
      receivedAt: row.receivedAt,
      modelName: row.modelName,
      symptom: row.symptom,
      technician: row.technician,
      amount: row.status === "완료" ? 85000 : 0,
      status: row.status === "완료" ? "결제 완료" : row.status,
    }));
}
