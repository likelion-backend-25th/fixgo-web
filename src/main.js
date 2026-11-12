import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./index.css";
const rootElement = document.getElementById("root");
if (rootElement === null) {
    throw new Error("root element를 찾을 수 없습니다.");
}
createRoot(rootElement).render(_jsx(StrictMode, { children: _jsx(App, {}) }));
