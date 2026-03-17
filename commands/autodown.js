const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const supportedDomains = [
    "youtube.com", "youtu.be", "facebook.com", "fb.watch", "instagram.com", "threads.net",
    "tiktok.com", "vt.tiktok.com", "www.tiktok.com", "v.douyin.com", "douyin.com", "iesdouyin.com",
    "capcut.com", "twitter.com", "x.com", "soundcloud.com", "mixcloud.com", "zingmp3.vn",
    "nhaccuatui.com", "mediafire.com", "drive.google.com", "pixiv.net", "pinterest.com", "pin.it",
    "bilibili.com", "b23.tv", "reddit.com", "tumblr.com", "ted.com", "vimeo.com", "rumble.com", 
    "streamable.com", "snapchat.com", "linkedin.com", "imgur.com", "9gag.com", "xiaohongshu.com", 
    "xhslink.com", "weibo.com", "sohu.com", "ixigua.com", "likee.video", "hipi.co.in", 
    "sharechat.com", "getstickerpack.com", "bitchute.com", "febspot.com", "bandcamp.com"
]; // Thêm/xoá miền ở đây, nếu bạn đã có kinh nghiệm thì có thể dùng Regex thay cho .includes()

const cacheDir = path.join(__dirname, "cache");
fs.ensureDirSync(cacheDir);

const stateFile = path.join(cacheDir, "LunarKrystal_atd.json");
const stateManager = {
    get: () => fs.existsSync(stateFile) ? fs.readJsonSync(stateFile) : {},
    set: (data) => fs.writeJsonSync(stateFile, data, { spaces: 4 })
};

module.exports.config = {
    name: "autodown",
    version: "1.0.8",
    hasPermssion: 2, // Tránh thành viên nhóm phá
    credits: "Khôi", // Gemini refactored | Hãy tôn trọng tác giả và đừng thay credit để nhận update nhé ae
    description: "Tự động tải video/ảnh/audio từ các nền tảng",
    commandCategory: "Tiện ích",
    usages: "[on/off/status/list] hoặc gửi link",
    cooldowns: 5,
};

module.exports.run = async ({ api, event, args }) => {
    const { threadID } = event;
    const state = stateManager.get();
    const cmd = args[0]?.toLowerCase();

    if (cmd === "on" || cmd === "off") {
        state[threadID] = { enabled: cmd === "on" };
        stateManager.set(state);
        return api.sendMessage(`✅ Đã ${cmd === "on" ? "BẬT" : "TẮT"} tự động tải.`, threadID);
    }
    
    if (cmd === "status") {
        const isEnable = state[threadID]?.enabled !== false;
        return api.sendMessage(`📦 Trạng thái: ${isEnable ? "✅ BẬT" : "❌ TẮT"}`, threadID);
    }

    if (cmd === "list") return api.sendMessage("📌 Danh sách hỗ trợ: " + supportedDomains.join(", "), threadID);
    return api.sendMessage("❓ autodown [on/off/status/list]", threadID);
};

module.exports.handleEvent = async ({ api, event }) => {
    const { threadID, messageID, body } = event;
    if (!body) return;

    const state = stateManager.get();
    if (state[threadID]?.enabled === false) return;

    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const urls = body.match(urlPattern);
    if (!urls) return;

    const targetURL = urls.find(url => supportedDomains.some(domain => url.includes(domain)));
    if (!targetURL) return;

    try {
        const { data: res } = await axios.get(`https://lunarkrystal.qzz.io/api/Downr?url=${encodeURIComponent(targetURL)}`);
        const mediaData = res.data;

        if (!mediaData) return;
        const medias = mediaData.medias || []; // Đối với các endpoint mà tôi sorted dữ liệu thì phần này bạn cần thay đổi
        
        const paths = [];
        const download = async (url, type, ext) => {
            const filePath = path.join(cacheDir, `${type}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`);
            const stream = await axios.get(url, { responseType: "arraybuffer" }).then(r => Buffer.from(r.data));
            fs.writeFileSync(filePath, stream);
            paths.push(filePath);
            return fs.createReadStream(filePath);
        };

        let attachment = null;
        let hasSentMedia = false; // Để tránh việc gửi nhiều video/audio cùng lúc trong 1 tin nhắn
        const images = [];
        const caption = `[ ${(mediaData.source || "AUTODOWN").toUpperCase()} ]\n👤 Tác giả: ${mediaData.author || "Không rõ"}\n💬 Tiêu đề: ${mediaData.title || "Không có"}`;

        const videoMedia = medias.find(m => m.type?.toLowerCase() === "video" || m.extension?.toLowerCase() === "mp4");
        if (videoMedia) {
            attachment = await download(videoMedia.url, "vid", "mp4");
            hasSentMedia = true;
        }

        if (!hasSentMedia) {
            const audioMedia = medias.find(m => m.type?.toLowerCase() === "audio" || m.extension?.toLowerCase() === "mp3" || m.url.includes(".mp3"));
            if (audioMedia) {
                attachment = await download(audioMedia.url, "audio", "mp3");
                hasSentMedia = true;
            }
        }

        if (!hasSentMedia) {
            for (const m of medias) {
                if (m.type?.toLowerCase() === "image" || ["jpg", "jpeg", "png"].includes(m.extension?.toLowerCase())) {
                    images.push(await download(m.url, "img", "jpg"));
                }
            }
            if (images.length > 0) attachment = images;
        }

        if (attachment) await api.sendMessage({ body: caption, attachment }, threadID, messageID);
        setTimeout(() => paths.forEach(p => fs.existsSync(p) && fs.unlinkSync(p)), 15000);
    } catch (err) {
        console.error(`Lỗi: ${err.message}`);
    }
};
