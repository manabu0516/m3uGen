const crypto = require('crypto');

const hash = (text) => {
    return crypto
        .createHash('md5')
        .update(text, 'utf8')
        .digest('hex');
};

const timeToSeconds = (timeStr) => {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
};

const handler = async (data, append) => {
    const json = JSON.parse(data);
    const key = json.rss.channel.title;

    json.rss.items.forEach(item => {
        const d = timeToSeconds(item.duration);
        const t = item.title;
        const a = '';
        const u = item.url;
        const i = item.image;
        const p = item.pubDate;
        const id = hash(u);
        append(id,key,t,a,d,p,u,i);
    });

};

module.exports = {
    name : 'json',
    handler : handler
};