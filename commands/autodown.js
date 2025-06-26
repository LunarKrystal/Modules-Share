const getVideoData = require('./../../includes/data_api/getfvid');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: "autodown",
    version: "1.0",
    hasPermission: 0,
    credits: "con cặc",
    description: "Tự động tải video",
    commandCategory: "Tiện ích",
    usages: "",
    cooldowns: 3
  },

  handleEvent: async function ({ event, api }) {
    const { body, threadID, messageID } = event;
    if (!body) return;

    
    const matches = body.match(/https?:\/\/(?:www\.)?(fb|facebook|vt.tiktok|instagram|twitter|pinterest|reddit|youtube|youtu.be|capcut|douyin)\.[^\s]+/gi);
    if (!matches || matches.length === 0) return;

    for (const url of matches) {
      try {
        const data = await getVideoData(url);
        if (!data?.medias?.length) return;

        const video = data.medias[0];
        const ext = video.extension || "mp4";
        const tempPath = path.join(__dirname, cache/down.${ext});

        const res = await axios.get(video.url, { responseType: "arraybuffer" });
        fs.writeFileSync(tempPath, res.data);

        await api.sendMessage({
          attachment: fs.createReadStream(tempPath)
        }, threadID, () => fs.unlinkSync(tempPath), messageID);
      } catch (err) {
        console.error('❌ Lỗi xử lý link:', url, err.message);
      }
    }
  },

  run: () => {}
};