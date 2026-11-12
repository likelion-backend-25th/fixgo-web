import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { DateField, TextArea, TextField } from "@/components/ui/Field";
import { Notice, Panel } from "@/components/ui/Panel";
import { categoryLabel, createCustomer, createReception, fetchProduct, registerPurchasedAt, searchCustomers, searchProductsBySerial, searchTechnicians } from "@/lib/asReceptionApi";
import { CustomerNameField } from "@/pages/as/CustomerNameField";
import { SerialNumberField } from "@/pages/as/SerialNumberField";
import { AsLookupModals } from "@/pages/as/AsLookupModals";
const emptyForm = {
    customerId: null,
    customerName: "",
    phone: "",
    email: "",
    postalCode: "",
    address: "",
    addressDetail: "",
    productId: null,
    productModelId: null,
    serial: "",
    productGroup: "",
    modelName: "",
    purchasedAt: "",
    purchasedAtLocked: false,
    symptom: "",
    symptomDetail: "",
    memo: "",
    technicianId: null,
    technician: "",
    receiveMethod: "",
};
export function AsNewPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState(emptyForm);
    const [lookup, setLookup] = useState(null);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [tried, setTried] = useState(false);
    const [pending, setPending] = useState(false);
    function patch(partial) {
        setForm((current) => ({ ...current, ...partial }));
    }
    function applyProduct(product) {
        const purchasedAt = product.purchasedAt?.slice(0, 10) ?? "";
        patch({
            productId: product.id,
            productModelId: product.productModelId,
            serial: product.serialNumber,
            productGroup: categoryLabel(product.category),
            modelName: product.modelName,
            // 저장된 구매일이 있으면 채우고 수정을 막는다. 없으면 직접 입력할 수 있게 연다.
            purchasedAt,
            purchasedAtLocked: purchasedAt !== "",
        });
    }
    function applyCustomer(customer) {
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
        }
        catch (cause) {
            setInfo("");
            setError(cause instanceof Error ? cause.message : "고객을 등록하지 못했습니다.");
        }
        finally {
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
            const product = await resolveProduct(form, signal);
            const productId = product?.id ?? null;
            const productModelId = product?.productModelId ?? null;
            const technicianId = await resolveTechnicianId(form, signal);
            const returnMethod = toReturnMethod(form.receiveMethod);
            if (customerId !== form.customerId
                || productId !== form.productId
                || productModelId !== form.productModelId
                || technicianId !== form.technicianId) {
                patch({ customerId, productId, productModelId, technicianId });
            }
            const missing = missingFields(form, customerId, productId, technicianId, returnMethod);
            if (missing.length > 0) {
                setError(`${missing.join(" ")}`);
                return;
            }
            if (customerId === null || productId === null || productModelId === null || technicianId === null || returnMethod === null) {
                return;
            }
            // 저장된 구매일이 없는 제품만, 접수 화면에서 입력한 날짜를 제품에 기록한다.
            if (!form.purchasedAtLocked) {
                const purchasedAt = toPurchaseDateTime(form.purchasedAt);
                if (purchasedAt !== null) {
                    await registerPurchasedAt(productId, { productModelId, purchasedAt }, signal);
                    patch({ purchasedAtLocked: true });
                }
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
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "접수를 등록하지 못했습니다.");
        }
        finally {
            setPending(false);
        }
    }
    const invalid = (value) => tried && value.trim() === "";
    return (_jsxs("div", { className: "space-y-4", children: [info !== "" && _jsx(Notice, { children: info }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsx(Panel, { title: "\uACE0\uAC1D\uC815\uBCF4", action: _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", onClick: () => setLookup("customer"), children: "\uACE0\uAC1D\uC815\uBCF4 \uC870\uD68C" }), _jsx(Button, { onClick: () => void registerCustomer(), disabled: pending, children: "\uACE0\uAC1D \uB4F1\uB85D" })] }), children: _jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsx(CustomerNameField, { value: form.customerName, invalid: tried && form.customerId === null, onChange: (customerName) => patch({ customerName, customerId: null }), onPick: applyCustomer }), _jsx(TextField, { label: "\uC5F0\uB77D\uCC98", value: form.phone, onChange: (phone) => patch({ phone, customerId: null }), invalid: tried && form.customerId === null }), _jsx(TextField, { label: "\uC774\uBA54\uC77C", value: form.email, onChange: (email) => patch({ email }) }), _jsx(TextField, { label: "\uC6B0\uD3B8\uBC88\uD638", value: form.postalCode, onChange: (postalCode) => patch({ postalCode }), invalid: invalid(form.postalCode), readOnly: true }), _jsx(TextField, { label: "\uAE30\uBCF8 \uC8FC\uC18C", value: form.address, onChange: (address) => patch({ address }), invalid: invalid(form.address) }), _jsxs("div", { className: "flex items-end gap-2", children: [_jsx(TextField, { className: "flex-1", label: "\uC0C1\uC138 \uC8FC\uC18C", value: form.addressDetail, onChange: (addressDetail) => patch({ addressDetail }) }), _jsx(Button, { variant: "outline", onClick: () => setLookup("post"), children: "\uC6B0\uD3B8\uBC88\uD638 \uCC3E\uAE30" })] })] }) }), _jsx(Panel, { title: "\uC81C\uD488/\uC811\uC218 \uC815\uBCF4", children: _jsxs("div", { className: "grid gap-3 md:grid-cols-4", children: [_jsx(SerialNumberField, { value: form.serial, invalid: tried && form.productId === null, onChange: (serial) => patch({
                                serial,
                                productId: null,
                                productModelId: null,
                                productGroup: "",
                                modelName: "",
                                purchasedAt: "",
                                purchasedAtLocked: false,
                            }), onPick: applyProduct }), _jsx("div", { className: "flex items-end", children: _jsx(Button, { variant: "outline", onClick: () => setLookup("serial"), children: "\uC2DC\uB9AC\uC5BC\uBC88\uD638 \uC870\uD68C" }) }), _jsx(TextField, { label: "\uC81C\uD488\uAD70", value: form.productGroup, onChange: (productGroup) => patch({ productGroup }), readOnly: true }), _jsx(TextField, { label: "\uBAA8\uB378\uBA85", value: form.modelName, onChange: (modelName) => patch({ modelName }), readOnly: true }), _jsx(DateField, { label: "\uAD6C\uB9E4\uC77C", value: form.purchasedAt, readOnly: form.purchasedAtLocked, onChange: (purchasedAt) => patch({ purchasedAt }) })] }) }), _jsx(Panel, { title: "\uACE0\uC7A5 \uB0B4\uC6A9", children: _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsx(TextField, { label: "\uACE0\uC7A5 \uC99D\uC0C1 \uC694\uC57D", value: form.symptom, onChange: (symptom) => patch({ symptom }), invalid: invalid(form.symptom) }), _jsx(TextArea, { className: "md:row-span-2", label: "\uACE0\uC7A5 \uC99D\uC0C1 \uC0C1\uC138", value: form.symptomDetail, onChange: (symptomDetail) => patch({ symptomDetail }), rows: 6 }), _jsx(TextArea, { label: "\uACE0\uAC1D \uC694\uCCAD \uC0AC\uD56D / \uBA54\uBAA8", value: form.memo, onChange: (memo) => patch({ memo }) })] }) }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(Panel, { title: "\uB2F4\uB2F9 A/S\uAE30\uC0AC \uBC30\uC815", children: _jsxs("div", { className: "flex items-end gap-2", children: [_jsx(TextField, { className: "flex-1", label: "\uB2F4\uB2F9 \uAE30\uC0AC", value: form.technician, onChange: (technician) => patch({ technician }), invalid: tried && form.technicianId === null, readOnly: true }), _jsx(Button, { variant: "outline", onClick: () => setLookup("tech"), children: "A/S \uAE30\uC0AC \uBAA9\uB85D \uC870\uD68C" })] }) }), _jsx(Panel, { title: "\uC218\uB839 \uBC29\uC2DD", className: "relative", children: _jsx("div", { className: "absolute inset-0 flex items-center justify-center gap-6 text-sm", children: ["방문", "택배"].map((method) => (_jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "radio", name: "receive", checked: form.receiveMethod === method, onChange: () => patch({ receiveMethod: method }) }), method] }, method))) }) })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: () => navigate("/as/list"), children: "\uCDE8\uC18C" }), _jsx(Button, { onClick: () => void submit(), disabled: pending, children: "\uC811\uC218" })] }), _jsx(AsLookupModals, { kind: lookup, onClose: () => setLookup(null), onApply: patch })] }));
}
function missingFields(form, customerId, productId, technicianId, returnMethod) {
    const missing = [];
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
async function resolveCustomerId(form, signal) {
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
async function resolveProduct(form, signal) {
    if (form.productId !== null && form.productModelId !== null) {
        return { id: form.productId, productModelId: form.productModelId };
    }
    if (form.productId !== null) {
        const product = await fetchProduct(form.productId, signal);
        return { id: product.id, productModelId: product.productModelId };
    }
    const serial = form.serial.trim();
    if (serial === "") {
        return null;
    }
    const products = await searchProductsBySerial(serial, signal);
    const product = products.find((item) => item.serialNumber.toLowerCase() === serial.toLowerCase());
    if (product === undefined) {
        return null;
    }
    return { id: product.id, productModelId: product.productModelId };
}
function toPurchaseDateTime(value) {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) {
        return null;
    }
    if (digits.length !== 8) {
        throw new Error("구매일은 YYYY/MM/DD 형식으로 입력해 주세요.");
    }
    const year = Number(digits.slice(0, 4));
    const month = Number(digits.slice(4, 6));
    const day = Number(digits.slice(6, 8));
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        throw new Error("구매일은 YYYY/MM/DD 형식으로 입력해 주세요.");
    }
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T00:00:00`;
}
async function resolveTechnicianId(form, signal) {
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
function toReturnMethod(value) {
    if (value === "방문") {
        return "PICKUP";
    }
    if (value === "택배") {
        return "DELIVERY";
    }
    return null;
}
