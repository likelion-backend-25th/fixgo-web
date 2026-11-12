export function carrierLabel(courier, courierCode) {
    if (courier !== null && courier.trim() !== "") {
        return courier;
    }
    const found = sweetTrackerCarriers.find((item) => item.code === courierCode);
    return found === undefined ? "-" : found.name;
}
export const sweetTrackerCarriers = [
    { code: "04", name: "CJ대한통운" },
    { code: "01", name: "우체국택배" },
    { code: "05", name: "한진택배" },
    { code: "06", name: "로젠택배" },
    { code: "08", name: "롯데택배" },
    { code: "17", name: "천일택배" },
    { code: "18", name: "건영택배" },
    { code: "23", name: "경동택배" },
];
