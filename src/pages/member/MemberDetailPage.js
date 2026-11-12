import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice, Panel } from "@/components/ui/Panel";
import { fetchReceptions, receptionStatusLabel } from "@/lib/asReceptionApi";
import { deleteMember, fetchMember, memberRoleLabel, memberRoles, memberStatusLabel, memberStatuses, parseMemberRole, parseMemberStatus, updateMemberProfile, updateMemberRole, updateMemberStatus, } from "@/lib/memberApi";
import { logoutFromServer } from "@/lib/authApi";
import { useSessionStore } from "@/stores/useSessionStore";
export function MemberDetailPage() {
    const { memberId } = useParams();
    const id = Number(memberId);
    if (!Number.isSafeInteger(id) || id < 1)
        return _jsx(Notice, { tone: "error", children: "\uC62C\uBC14\uB978 \uC9C1\uC6D0 ID\uAC00 \uC544\uB2D9\uB2C8\uB2E4." });
    return _jsx(MemberDetails, { id: id }, id);
}
function MemberDetails({ id }) {
    const isAdmin = useSessionStore((state) => state.user?.role) === "ADMIN";
    const currentMemberId = useSessionStore((state) => state.memberId);
    const [member, setMember] = useState(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [pending, setPending] = useState(false);
    const [editing, setEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        fetchMember(id, controller.signal)
            .then((result) => { if (!controller.signal.aborted)
            setMember(result); })
            .catch((cause) => {
            if (!controller.signal.aborted) {
                setError(cause instanceof Error ? cause.message : "직원 정보를 불러오지 못했습니다.");
            }
        });
        return () => controller.abort();
    }, [id]);
    if (member === null) {
        return error === "" ? _jsx(Notice, { children: "\uC9C1\uC6D0 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." }) : _jsx(Notice, { tone: "error", children: error });
    }
    const record = member;
    const deleted = record.status === "DELETED";
    async function applyChange(request, message) {
        setPending(true);
        setError("");
        setNotice("");
        try {
            const updated = await request();
            setMember(updated === undefined ? { ...record, status: "DELETED" } : { ...record, ...updated });
            setNotice(message);
            if (currentMemberId === id && (updated === undefined || updated.status !== "ACTIVE" || updated.role !== record.role))
                void logoutFromServer();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "계정 변경에 실패했습니다.");
        }
        finally {
            setConfirmDelete(false);
            setPending(false);
        }
    }
    return (_jsxs("div", { className: "space-y-4", children: [notice !== "" && _jsx(Notice, { children: notice }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs(Panel, { title: "\uC9C1\uC6D0 \uC815\uBCF4", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-4", children: [record.profileImgUrl === "" ? (_jsx("span", { className: "grid size-16 place-items-center rounded-full bg-blue-600 text-xl font-semibold text-white", children: record.name.slice(0, 1) })) : _jsx("img", { src: record.profileImgUrl, alt: "", className: "size-16 rounded-full object-cover" }), _jsxs("div", { className: "text-sm leading-7", children: [_jsx("p", { className: "text-lg font-semibold", children: record.name }), _jsxs("p", { children: [record.email, " \u00B7 ", record.phone] }), _jsx("p", { children: record.address || "-" }), _jsxs("p", { children: [memberRoleLabel(record.role), " \u00B7 ", memberStatusLabel(record.status)] })] })] }), isAdmin && !deleted && (_jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", disabled: pending, onClick: () => setEditing(true), children: "\uC815\uBCF4 \uC218\uC815" }), _jsx(Button, { variant: "ghost", disabled: pending, onClick: () => setConfirmDelete(true), children: "\uC9C1\uC6D0 \uC0AD\uC81C" })] }))] }), isAdmin && (_jsx(AccountControls, { member: record, pending: pending, onStatus: (status) => void applyChange(() => updateMemberStatus(record.email, status), "직원 상태를 변경했습니다."), onRole: (role) => void applyChange(() => updateMemberRole(record.email, role), "직원 역할을 변경했습니다.") }, `${record.role}:${record.status}`)), isAdmin && record.role === "ROLE_TECHNICIAN" && !deleted && (_jsx("p", { className: "mt-3 text-sm text-neutral-500", children: "\uC644\uB8CC\uB418\uC9C0 \uC54A\uC740 A/S\uAC00 \uC788\uC73C\uBA74 \uC5ED\uD560\uC744 \uBC14\uAFB8\uAC70\uB098 \uBE44\uD65C\uC131\uD654\u00B7\uC0AD\uC81C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC810\uAC80\uC744 \uC2DC\uC791\uD558\uC9C0 \uC54A\uC740 \uC811\uC218\uB3C4 \uD3EC\uD568\uB429\uB2C8\uB2E4." }))] }), _jsx(AssignedReceptions, { memberId: id }), editing && (_jsx(EditProfile, { member: record, onClose: () => setEditing(false), onSaved: (updated) => {
                    setMember(updated);
                    setEditing(false);
                    setError("");
                    setNotice("직원 정보를 저장했습니다.");
                } })), confirmDelete && (_jsxs(Modal, { title: "\uC9C1\uC6D0 \uC0AD\uC81C", compact: true, onClose: () => { if (!pending)
                    setConfirmDelete(false); }, children: [_jsxs("p", { className: "mb-4 text-sm", children: [record.name, " \uC9C1\uC6D0\uC758 \uACC4\uC815\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?"] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", disabled: pending, onClick: () => setConfirmDelete(false), children: "\uCDE8\uC18C" }), _jsx(Button, { disabled: pending, onClick: () => void applyChange(() => deleteMember(id), "직원 계정을 삭제했습니다."), children: "\uC0AD\uC81C" })] })] }))] }));
}
function AccountControls({ member, pending, onStatus, onRole }) {
    const [status, setStatus] = useState(member.status);
    const [role, setRole] = useState(member.role);
    const deleted = member.status === "DELETED";
    return (_jsxs("div", { className: "mt-4 flex flex-wrap gap-3 border-t border-neutral-200 pt-4", children: [!deleted && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(SelectBox, { "aria-label": "\uC9C1\uC6D0 \uC5ED\uD560", value: role, options: [...memberRoles], disabled: pending, onChange: (value) => { const next = parseMemberRole(value); if (next !== undefined)
                            setRole(next); } }), _jsx(Button, { variant: "outline", disabled: pending || role === member.role, onClick: () => onRole(role), children: "\uC5ED\uD560 \uBCC0\uACBD" })] })), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(SelectBox, { "aria-label": "\uC9C1\uC6D0 \uC0C1\uD0DC", value: status, disabled: pending, options: memberStatuses.filter((option) => option.value === "ACTIVE"
                            || (deleted ? option.value === "DELETED" : option.value === "INACTIVE")), onChange: (value) => { const next = parseMemberStatus(value); if (next !== undefined)
                            setStatus(next); } }), _jsx(Button, { variant: "outline", disabled: pending || status === member.status, onClick: () => onStatus(status), children: "\uC0C1\uD0DC \uBCC0\uACBD" })] })] }));
}
const receptionColumns = [
    { key: "receptionNumber", header: "접수번호", render: (row) => (_jsx(Link, { className: "text-blue-600", to: `/as/details/${row.id}`, children: row.receptionNumber })) },
    { key: "customer", header: "고객명", render: (row) => row.customerName },
    { key: "model", header: "모델명", render: (row) => row.modelName ?? "-" },
    { key: "status", header: "상태", render: (row) => receptionStatusLabel(row.receptionStatus) },
];
function AssignedReceptions({ memberId }) {
    const [rows, setRows] = useState(null);
    const [error, setError] = useState("");
    useEffect(() => {
        const controller = new AbortController();
        fetchReceptions({ keyword: "", status: null, technicianId: memberId, page: 1, size: 10, sort: "createdAt,desc" }, controller.signal)
            .then((result) => { if (!controller.signal.aborted)
            setRows(result.items); })
            .catch((cause) => {
            if (!controller.signal.aborted) {
                setError(cause instanceof Error ? cause.message : "배정된 A/S 목록을 불러오지 못했습니다.");
            }
        });
        return () => controller.abort();
    }, [memberId]);
    return (_jsxs("div", { children: [_jsx("h2", { className: "section-title mb-4", children: "\uCD5C\uADFC \uBC30\uC815\uB41C A/S" }), error !== "" ? _jsx(Notice, { tone: "error", children: error }) : (_jsx(DataTable, { columns: receptionColumns, rows: rows ?? [], rowKey: (row) => String(row.id), emptyText: rows === null ? "배정 이력을 불러오는 중입니다." : "배정된 A/S가 없습니다." }))] }));
}
function EditProfile({ member, onClose, onSaved }) {
    const [form, setForm] = useState(member);
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    async function save() {
        if (form.name.trim() === "" || form.phone.trim() === "") {
            setError("이름과 전화번호를 입력해 주세요.");
            return;
        }
        setPending(true);
        setError("");
        try {
            onSaved(await updateMemberProfile({
                email: form.email, name: form.name.trim(), phone: form.phone.trim(),
                address: form.address.trim(), profileImgUrl: form.profileImgUrl.trim(),
            }));
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "직원 정보를 저장하지 못했습니다.");
        }
        finally {
            setPending(false);
        }
    }
    return (_jsx(Modal, { title: "\uC9C1\uC6D0 \uC815\uBCF4 \uC218\uC815", onClose: () => { if (!pending)
            onClose(); }, children: _jsxs("form", { className: "space-y-3", onSubmit: (event) => { event.preventDefault(); void save(); }, children: [_jsx(TextField, { label: "\uC774\uBA54\uC77C", value: form.email, readOnly: true, onChange: () => { } }), _jsx(TextField, { label: "\uC774\uB984", value: form.name, onChange: (name) => setForm({ ...form, name }) }), _jsx(TextField, { label: "\uC804\uD654\uBC88\uD638", value: form.phone, onChange: (phone) => setForm({ ...form, phone }) }), _jsx(TextField, { label: "\uC8FC\uC18C", value: form.address, onChange: (address) => setForm({ ...form, address }) }), _jsx(TextField, { label: "\uD504\uB85C\uD544 \uC0AC\uC9C4 URL", value: form.profileImgUrl, onChange: (profileImgUrl) => setForm({ ...form, profileImgUrl }) }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { type: "submit", disabled: pending, children: pending ? "저장 중…" : "저장" }) })] }) }));
}
