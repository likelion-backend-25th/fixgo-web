// 스마트택배 배송조회 API(companylist)의 택배사 코드. 조회 시 t_code로 사용한다.
export interface SweetTrackerCarrier {
  code: string;
  name: string;
}

export const sweetTrackerCarriers: readonly SweetTrackerCarrier[] = [
  { code: "04", name: "CJ대한통운" },
  { code: "01", name: "우체국택배" },
  { code: "05", name: "한진택배" },
  { code: "06", name: "로젠택배" },
  { code: "08", name: "롯데택배" },
  { code: "17", name: "천일택배" },
  { code: "18", name: "건영택배" },
  { code: "23", name: "경동택배" },
];
