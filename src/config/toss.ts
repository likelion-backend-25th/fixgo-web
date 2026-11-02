/**
 * 토스페이먼츠 결제창(API 개별 연동) 클라이언트 키.
 * 결제위젯 키가 아니라 test_ck_ 로 시작하는 키를 쓴다.
 * 환경마다 바꾸려면 VITE_TOSS_CLIENT_KEY 를 설정한다.
 */
const fallbackClientKey = "test_ck_Z61JOxRQVEzd5ewPW1bzrW0X9bAq";

export const tossClientKey = import.meta.env.VITE_TOSS_CLIENT_KEY?.trim() || fallbackClientKey;
