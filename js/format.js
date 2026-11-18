export function formatDuration(totalMinutes) {
    if (!totalMinutes || totalMinutes <= 0) return "-";
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}분`;
    if (m === 0) return `${h}시간`;
    return `${h}시간 ${m}분`;
}

export function formatKoreanNumber(num) {
    if (num === 0) return "0";
    const units = ["", "만", "억", "조", "경"];
    let result = "";
    let temp = num;
    let idx = 0;
    while (temp > 0) {
        const part = temp % 10000;
        if (part > 0) result = `${part.toLocaleString()}${units[idx]} ` + result;
        temp = Math.floor(temp / 10000);
        idx++;
    }
    return result.trim();
}

export function formatSimple(num) {
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + "조";
    if (num >= 100000000) return (num / 100000000).toFixed(1) + "억";
    if (num >= 10000) return (num / 10000).toFixed(0) + "만";
    return num.toLocaleString();
}

export function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// 비트 단위: 1T = 1000M, 1M = 1000B.
export function formatBits(bits) {
    const b = bits % 1000;
    const m = Math.floor(bits / 1000) % 1000;
    const t = Math.floor(bits / 1_000_000);
    const parts = [];
    if (t) parts.push(`${t}T`);
    if (t || m) parts.push(`${m}M`);
    parts.push(`${b}B`);
    return parts.join(' ');
}
