import { apiFetch } from "@/lib/apiClient";

const PART_API_BASE = "/api/v1/part";

export interface Part {
  id: number;
  name: string;
  unitPrice: number;
  standardMinutes: number;
  stockQuantity: number;
}

interface PartPage {
  content: Part[];
}

// 부품 전체 조회 (서버가 Page로 응답하므로 content만 꺼냄)
export async function fetchParts(signal?: AbortSignal): Promise<Part[]> {
  const params = new URLSearchParams({ page: "0", size: "200" });

  const response = await apiFetch(`${PART_API_BASE}?${params.toString()}`, {
    method: "GET",
    signal,
  });

  if (!response.ok) {
    throw new Error("부품 목록을 불러오지 못했습니다.");
  }

  const page = (await response.json()) as PartPage;
  return page.content;
}