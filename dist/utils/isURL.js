"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isURL = void 0;
function isURL(string) {
    let url;
    try {
        url = new URL(string);
    }
    catch (_) {
        return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
}
exports.isURL = isURL;
//# sourceMappingURL=isURL.js.map