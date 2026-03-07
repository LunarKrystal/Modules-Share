module.exports.config = {
  name: "findsong",
  version: "2.2.0",
  hasPermssion: 0,
  credits: "LunarKrystal",
  description: "Nhận diện bài hát qua URL",
  commandCategory: "Search",
  usages: "[reply audio/video] hoặc /findsong <url>",
  cooldowns: 10
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, type, messageReply } = event;

  try {
    const attachment = type === "message_reply" ? messageReply.attachments?.[0] : null;
    const url = attachment?.url || args[0];
    if (!url) return api.sendMessage("❌ Vui lòng reply một audio/video hoặc cung cấp URL.\n\nCách dùng:\n• Reply một audio/video\n• /findsong <url>", threadID, messageID);

    api.sendMessage("🔍 Đang nhận diện bài hát...", threadID, messageID);

    const response = await require("axios").get("https://lunarkrystal.qzz.io/api/findSong", { params: { url, author: this.config.credits } } );
    const { data } = response;
    if (data?.status !== "success" || !data.title) return api.sendMessage("❌ Không nhận diện được bài hát.", threadID, messageID);

    const resultMessage =
      `🎵 Kết quả:\n` +
      `• Tên: ${data.title}\n` +
      `• Nghệ sĩ: ${data.artist || "Không rõ"}\n` +
      `• Album: ${data.album || "Không rõ"}\n` +
      `• Năm: ${data.year || "Không rõ"}\n` +
      `📝 Thả 😆 để tìm bài hát!`;

    return api.sendMessage(resultMessage, threadID, messageID);
  } catch (err) {
    console.error(err?.response?.data || err.message);
    return api.sendMessage("❌ Có lỗi khi nhận diện bài hát.", threadID, messageID);
  }
};
