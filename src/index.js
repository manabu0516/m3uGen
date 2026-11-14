const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = 3000;

const configPath = process.argv[2];

app.use(express.text());

const scanResources = async (entries, handler) => {
    const music = [];
    for (let idx = 0; idx < entries.length; idx++) {
        const element = entries[idx];

        const response = await fetch(element.url);
        const rawData = await response.text();

        const dirUrl = new URL("./", element.url).href;
        await handler[element.resource](rawData, (id, key, title, artist, duration, pub, url, image) => {
            music.push({
                id:id, key:key, title:title, artist:artist, duration:duration, pub:pub, url:dirUrl+url, image:dirUrl+image
            });
        })
    }
    return music;
};

const plugins = async (targetDir) => {
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  const jsFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => path.join(targetDir, entry.name));
  return jsFiles;
}

const touchFile = async (filePath) => {
    try {
        await fs.writeFile(filePath, '', { flag: 'wx' });
    } catch (error) {
        if (error.code === 'EEXIST') return;
        throw error;
    }
};

const run = async () => {
    const rawData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(rawData);

    context = {
        plugin_resource : {},
        musics : [],
        scanning : false
    };

    const r_plugin_dir = path.join(__dirname, 'plugins', 'resource');
    const r_plugin_modules = await plugins(r_plugin_dir);
    for (let idx = 0; idx < r_plugin_modules.length; idx++) {
        const p = r_plugin_modules[idx];
        const module = require(p);
        context.plugin_resource[module.name] = module.handler;
    }

    for (let idx = 0; idx < config.m3u.length; idx++) {
        const f = config.m3u[idx];
        await touchFile(path.join(config.webroot, f+'.m3u'));        
    }

    const entries = await scanResources(config.entries, context.plugin_resource);

    context.musics = entries;

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}/m3ugen/`);
    });

    app.get('/m3ugen/api/configure', (req, res) => {
        res.json({
            status : 200,
            message : "OK",
            data : {
                musics : context.musics,
                m3u : config.m3u
            }
        });
    });

    app.post('/m3ugen/api/scan', async (req, res) => {
        try {
            context.scanning = true;
            const entries = await scanResources(config.entries, context.plugin_resource);
            context.musics = entries;
            res.json({
                status : 200,
                message : "OK",
                data : context.musics
            });
        } catch (e) {
            res.json({status : 500, message : e});
        } finally {
            context.scanning = true;
        }
    });

    app.get('/m3ugen/api/m3u/:id', async (req, res) => {
        const m3u_id = req.params.id;

        const target = config.m3u.filter(e => e.trim() === m3u_id);
        if(target.length === 0) {
            res.json({status : 404, message : 'not found m3u'});
            return;
        }

        const m3u_data = await fs.readFile(path.join(config.webroot, m3u_id+'.m3u'), 'utf-8');
        res.json({
            status : 200,
            message : "OK",
            data : m3u_data
        });
    });

    app.put('/m3ugen/api/m3u/:id', async (req, res) => {
        const m3u_id = req.params.id;

        const target = config.m3u.filter(e => e.trim() === m3u_id);
        if(target.length === 0) {
            res.json({status : 404, message : 'not found m3u'});
            return;
        }

        const data = req.body;
        await fs.writeFile(path.join(config.webroot, m3u_id+'.m3u'), data, 'utf-8');

        res.json({
            status : 200,
            message : "OK"
        });

    });

    app.use("/m3ugen/static", express.static(path.join(__dirname, 'plugins', 'webroot')));
};

run();

