import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { compareText } from "@/lib/guards";
import { includesText } from "@/lib/format";
import { useListParams } from "@/hooks/useListParams";
import { fetchMembers, issueMember, memberRoleLabel, memberRoles, memberStatusLabel, parseMemberRole } from "@/lib/memberApi";
import { useSessionStore } from "@/stores/useSessionStore";
export function MemberListPage() {
    const navigate = useNavigate();
    const filters = useListParams();
    const role = useSessionStore((state) => state.user?.role);
    const query = filters.text("q");
    const roleFilter = parseMemberRole(filters.text("role")) ?? "";
    const sortKey = filters.text("sort", "name");
    const sortDir = filters.text("dir") === "desc" ? "desc" : "asc";
    const page = filters.page();
    const [open, setOpen] = useState(false);
    const [notice, setNotice] = useState("");
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        const controller = new AbortController();
        fetchMembers(controller.signal)
            .then((rows) => { if (!controller.signal.aborted)
            setMembers(rows); })
            .catch((cause) => {
            if (!controller.signal.aborted) {
                setError(cause instanceof Error ? cause.message : "직원 목록을 불러오지 못했습니다.");
            }
        })
            .finally(() => { if (!controller.signal.aborted)
            setLoading(false); });
        return () => controller.abort();
    }, []);
    const filtered = useMemo(() => {
        const rows = members.filter((row) => {
            const matched = includesText(row.name, query) || includesText(row.email, query);
            const matchedRole = roleFilter === "" || row.role === roleFilter;
            return matched && matchedRole;
        });
        return [...rows].sort((left, right) => {
            const result = compareText(textOf(left, sortKey), textOf(right, sortKey));
            return sortDir === "asc" ? result : -result;
        });
    }, [members, query, roleFilter, sortDir, sortKey]);
    const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
    const safePage = Math.min(page, pageCount);
    const slice = filtered.slice((safePage - 1) * 20, safePage * 20);
    const columns = [
        { key: "name", header: "이름", sortable: true, render: (row) => row.name },
        { key: "email", header: "이메일", sortable: true, render: (row) => row.email },
        { key: "role", header: "역할", sortable: true, render: (row) => memberRoleLabel(row.role) },
        { key: "status", header: "상태", sortable: true, render: (row) => memberStatusLabel(row.status) },
    ];
    return (_jsxs("div", { children: [notice !== "" && _jsx(Notice, { children: notice }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [_jsx(TextField, { value: query, onChange: (value) => filters.replace({ q: value, page: null }), placeholder: "\uC774\uB984, \uC774\uBA54\uC77C \uAC80\uC0C9", className: "w-64" }), _jsx(SelectBox, { value: roleFilter, onChange: (value) => filters.replace({ role: parseMemberRole(value) ?? null, page: null }), options: [{ value: "", label: "역할 전체" }, ...memberRoles] }), role === "ADMIN" && (_jsx(Button, { className: "ml-auto", disabled: loading, onClick: () => setOpen(true), children: "\uACC4\uC815 \uBC1C\uAE09" }))] }), _jsx(DataTable, { columns: columns, rows: slice, rowKey: (row) => String(row.id), emptyText: loading ? "직원 목록을 불러오는 중입니다." : error !== "" ? "직원 목록을 불러오지 못했습니다." : "조회 결과가 없습니다.", sortKey: sortKey, sortDir: sortDir, onSort: (key) => {
                    const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
                    filters.replace({
                        sort: key === "name" ? null : key,
                        dir: nextDir === "asc" ? null : nextDir,
                        page: null,
                    });
                }, onRowClick: (row) => navigate(`/member/${row.id}`) }), _jsx(Pagination, { page: safePage, pageCount: pageCount, onPageChange: filters.setPage }), open && (_jsx(IssueAccountModal, { onClose: () => setOpen(false), onIssued: (member) => {
                    setMembers((rows) => [...rows.filter((row) => row.id !== member.id), member]);
                    setOpen(false);
                    setNotice("계정이 발급되었습니다.");
                } }))] }));
}
function textOf(row, key) {
    if (key === "email")
        return row.email;
    if (key === "role")
        return memberRoleLabel(row.role);
    if (key === "status")
        return memberStatusLabel(row.status);
    return row.name;
}
function IssueAccountModal({ onClose, onIssued }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [role, setRole] = useState("ROLE_RECEPTIONIST");
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    async function issue() {
        if (email.trim() === "" || password.trim() === "" || name.trim() === "" || phone.trim() === "") {
            setError("이메일, 초기 비밀번호, 이름, 연락처를 입력해 주세요.");
            return;
        }
        setPending(true);
        setError("");
        try {
            onIssued(await issueMember({
                email: email.trim(), password, name: name.trim(), phone: phone.trim(),
                address: address.trim(), role, profileImgUrl: "",
            }));
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "계정을 발급하지 못했습니다.");
        }
        finally {
            setPending(false);
        }
    }
    return (_jsx(Modal, { title: "\uACC4\uC815 \uBC1C\uAE09", onClose: () => { if (!pending)
            onClose(); }, children: _jsxs("form", { className: "space-y-3", onSubmit: (event) => { event.preventDefault(); void issue(); }, children: [_jsx(TextField, { label: "\uC774\uBA54\uC77C", type: "email", value: email, onChange: setEmail }), _jsx(TextField, { label: "\uCD08\uAE30 \uBE44\uBC00\uBC88\uD638", type: "password", value: password, onChange: setPassword }), _jsx(TextField, { label: "\uC774\uB984", value: name, onChange: setName }), _jsx(TextField, { label: "\uC5F0\uB77D\uCC98", value: phone, onChange: setPhone }), _jsx(TextField, { label: "\uC8FC\uC18C", value: address, onChange: setAddress }), _jsx(SelectBox, { "aria-label": "\uC5ED\uD560", value: role, options: [...memberRoles], onChange: (value) => { const next = parseMemberRole(value); if (next !== undefined)
                        setRole(next); } }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { type: "submit", disabled: pending, children: pending ? "발급 중…" : "계정 발급" }) })] }) }));
}
