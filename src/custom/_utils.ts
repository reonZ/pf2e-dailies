import { Daily } from "daily";

function isValidDaily(daily: Daily): boolean {
    return (
        typeof daily.key === "string" &&
        daily.key.trim().length > 0 &&
        typeof daily.rows === "function" &&
        typeof daily.process === "function" &&
        (typeof daily.condition === "function" || Array.isArray(daily.items))
    );
}

export { isValidDaily };
