import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { DateField, TextArea, TextField } from "@/components/ui/Field";
import { Notice, Panel } from "@/components/ui/Panel";
import { categoryLabel, createCustomer, createReception, searchCustomers, searchProductsBySerial, searchTechnicians } from "@/lib/asReceptionApi";
import { CustomerNameField } from "@/pages/as/CustomerNameField";
import { SerialNumberField } from "@/pages/as/SerialNumberField";
import { AsLookupModals, type LookupKind } from "@/pages/as/AsLookupModals";
import type { CustomerSummary, ProductSummary, ReturnMethod } from "@/types/asReception";

interface AsForm {
  customerId: number | null;
  customerName: string;
  phone: string;
  email: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  productId: number | null;
  serial: string;
  productGroup: string;
  modelName: string;
  purchasedAt: string;
  symptom: string;
  symptomDetail: string;
  memo: string;
  technicianId: number | null;
  technician: string;
  receiveMethod: "" | "방문" | "택배";
}

const emptyForm: AsForm = {
  customerId: null,
  customerName: "",
  phone: "",
  email: "",
  postalCode: "",
  address: "",
  addressDetail: "",
  productId: null,
  serial: "",
  productGroup: "",
  modelName: "",
  purchasedAt: "",
  symptom: "",
  symptomDetail: "",
  memo: "",
  technicianId: null,
  technician: "",
  receiveMethod: "",
};

export function AsNewPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<AsForm>(emptyForm);
  const [lookup, setLookup] = useState<LookupKind>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);

  function patch(partial: Partial<AsForm>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function applyProduct(product: ProductSummary) {
    patch({
      productId: product.id,
      serial: product.serialNumber,
      productGroup: categoryLabel(product.category),
      modelName: product.modelName,
    });
  }

  function applyCustomer(customer: CustomerSummary) {
    patch({
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      email: customer.email,
      postalCode: customer.zipcode ?? "",
      address: customer.basicAddress ?? "",
      addressDetail: customer.detailAddress ?? "",
    });
  }

  async function registerCustomer() {
    if (form.customerName.trim() === "" || form.phone.trim() === "" || form.email.trim() === "") {
      setError("고객명, 연락처, 이메일을 입력한 뒤 고객을 등록해 주세요.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const created = await createCustomer({
        name: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        zipcode: form.postalCode.trim(),
        basicAddress: form.address.trim(),
        detailAddress: form.addressDetail.trim(),
      });
      patch({ customerId: created.id });
      setInfo("고객 정보를 등록했습니다.");
    } catch (cause: unknown) {
      setInfo("");
      setError(cause instanceof Error ? cause.message : "고객을 등록하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function submit() {
    setTried(true);
    setInfo("");
    setPending(true);
    setError("");
    const signal = new AbortController().signal;
    try {
      // 조회 후 이름을 고치면 id가 지워지므로, 접수 시점에 연락처·시리얼·기사명으로 다시 맞춘다.
      const customerId = await resolveCustomerId(form, signal);
      const productId = await resolveProductId(form, signal);
      const technicianId = await resolveTechnicianId(form, signal);
      const returnMethod = toReturnMethod(form.receiveMethod);
      if (customerId !== form.customerId || productId !== form.productId || technicianId !== form.technicianId) {
        patch({ customerId, productId, technicianId });
      }
      const missing = missingFields(form, customerId, productId, technicianId, returnMethod);
      if (missing.length > 0) {
        setError(`${missing.join(" ")}`);
        return;
      }
      if (customerId === null || productId === null || technicianId === null || returnMethod === null) {
        return;
      }
      const created = await createReception({
        customerId,
        productId,
        technicianId,
        symptom: form.symptom.trim(),
        symptomDetail: form.symptomDetail.trim(),
        memo: form.memo.trim(),
        returnMethod,
      });
      navigate(`/as/details/${created.id}`, {
        state: { notice: `${created.receptionNumber} 접수가 등록되었습니다.` },
      });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "접수를 등록하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  const invalid = (value: string) => tried && value.trim() === "";

  return (
    <div className="space-y-4">
      {info !== "" && <Notice>{info}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <Panel
        title="고객정보"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLookup("customer")}>
              고객정보 조회
            </Button>
            <Button onClick={() => void registerCustomer()} disabled={pending}>
              고객 등록
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <CustomerNameField
            value={form.customerName}
            invalid={tried && form.customerId === null}
            onChange={(customerName) => patch({ customerName, customerId: null })}
            onPick={applyCustomer}
          />
          <TextField label="연락처" value={form.phone} onChange={(phone) => patch({ phone, customerId: null })} invalid={tried && form.customerId === null} />
          <TextField label="이메일" value={form.email} onChange={(email) => patch({ email })} />
          <TextField label="우편번호" value={form.postalCode} onChange={(postalCode) => patch({ postalCode })} invalid={invalid(form.postalCode)} />
          <TextField label="기본 주소" value={form.address} onChange={(address) => patch({ address })} invalid={invalid(form.address)} />
          <div className="flex items-end gap-2">
            <TextField className="flex-1" label="상세 주소" value={form.addressDetail} onChange={(addressDetail) => patch({ addressDetail })} />
            <Button variant="outline" onClick={() => setLookup("post")}>
              우편번호 찾기
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="제품/접수 정보">
        <div className="grid gap-3 md:grid-cols-4">
          <SerialNumberField
            value={form.serial}
            invalid={tried && form.productId === null}
            onChange={(serial) => patch({ serial, productId: null, productGroup: "", modelName: "" })}
            onPick={applyProduct}
          />
          <div className="flex items-end">
            <Button variant="outline" onClick={() => setLookup("serial")}>
              시리얼번호 조회
            </Button>
          </div>
          <TextField label="제품군" value={form.productGroup} onChange={(productGroup) => patch({ productGroup })} readOnly />
          <TextField label="모델명" value={form.modelName} onChange={(modelName) => patch({ modelName })} readOnly />
          <DateField label="구매일" value={form.purchasedAt} onChange={(purchasedAt) => patch({ purchasedAt })} />
        </div>
      </Panel>

      <Panel title="고장 내용">
        <div className="grid gap-3 md:grid-cols-2">
          <TextField label="고장 증상 요약" value={form.symptom} onChange={(symptom) => patch({ symptom })} invalid={invalid(form.symptom)} />
          <TextArea className="md:row-span-2" label="고장 증상 상세" value={form.symptomDetail} onChange={(symptomDetail) => patch({ symptomDetail })} rows={6} />
          <TextArea label="고객 요청 사항 / 메모" value={form.memo} onChange={(memo) => patch({ memo })} />
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="담당 A/S기사 배정">
          <div className="flex items-end gap-2">
            <TextField className="flex-1" label="담당 기사" value={form.technician} onChange={(technician) => patch({ technician })} invalid={tried && form.technicianId === null} readOnly />
            <Button variant="outline" onClick={() => setLookup("tech")}>
              A/S 기사 목록 조회
            </Button>
          </div>
        </Panel>
        <Panel title="수령 방식" className="relative">
          <div className="absolute inset-0 flex items-center justify-center gap-6 text-sm">
            {(["방문", "택배"] as const).map((method) => (
              <label key={method} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="receive"
                  checked={form.receiveMethod === method}
                  onChange={() => patch({ receiveMethod: method })}
                />
                {method}
              </label>
            ))}
          </div>
        </Panel>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => navigate("/as/list")}>
          취소
        </Button>
        <Button onClick={() => void submit()} disabled={pending}>접수</Button>
      </div>
      <AsLookupModals kind={lookup} onClose={() => setLookup(null)} onApply={patch} />
    </div>
  );
}

function missingFields(
  form: AsForm,
  customerId: number | null,
  productId: number | null,
  technicianId: number | null,
  returnMethod: ReturnMethod | null,
): string[] {
  const missing: string[] = [];
  if (customerId === null) {
    missing.push("고객정보 조회 또는 고객 등록이 필요합니다.");
  }
  if (productId === null) {
    missing.push("시리얼번호 조회로 등록된 제품을 선택해 주세요.");
  }
  if (technicianId === null) {
    missing.push("담당 기사를 선택해 주세요.");
  }
  if (returnMethod === null) {
    missing.push("수령 방식을 선택해 주세요.");
  }
  if (form.symptom.trim() === "" || form.symptomDetail.trim() === "") {
    missing.push("고장 증상 요약과 상세를 입력해 주세요.");
  }
  return missing;
}

async function resolveCustomerId(form: AsForm, signal: AbortSignal): Promise<number | null> {
  if (form.customerId !== null) {
    return form.customerId;
  }
  const phone = form.phone.trim();
  if (phone === "") {
    return null;
  }
  const found = await searchCustomers(phone, signal);
  const matched = found.find((item) => item.phone === phone);
  if (matched !== undefined) {
    return matched.id;
  }
  if (form.customerName.trim() === "" || form.email.trim() === "") {
    return null;
  }
  const created = await createCustomer({
    name: form.customerName.trim(),
    phone,
    email: form.email.trim(),
    zipcode: form.postalCode.trim(),
    basicAddress: form.address.trim(),
    detailAddress: form.addressDetail.trim(),
  });
  return created.id;
}

async function resolveProductId(form: AsForm, signal: AbortSignal): Promise<number | null> {
  if (form.productId !== null) {
    return form.productId;
  }
  const serial = form.serial.trim();
  if (serial === "") {
    return null;
  }
  const products = await searchProductsBySerial(serial, signal);
  const product = products.find((item) => item.serialNumber.toLowerCase() === serial.toLowerCase());
  return product?.id ?? null;
}

async function resolveTechnicianId(form: AsForm, signal: AbortSignal): Promise<number | null> {
  if (form.technicianId !== null) {
    return form.technicianId;
  }
  const name = form.technician.trim();
  if (name === "") {
    return null;
  }
  const technicians = await searchTechnicians(name, signal);
  return technicians.find((item) => item.name === name)?.id ?? null;
}

function toReturnMethod(value: AsForm["receiveMethod"]): ReturnMethod | null {
  if (value === "방문") {
    return "PICKUP";
  }
  if (value === "택배") {
    return "DELIVERY";
  }
  return null;
}
