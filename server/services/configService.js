const fs = require('fs/promises');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');

async function readConfig() {
    try {
        const data = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await writeConfig({ webhookUrl: "" });
            return { webhookUrl: "" };
        }
        console.error("Error reading config file:", error);
        throw error;
    }
}

async function writeConfig(config) {
    try {
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error writing to config file:", error);
        throw error;
    }
}

const getWebhookUrl = async () => {
    const config = await readConfig();
    return config.webhookUrl || "";
};

const setWebhookUrl = async (url) => {
    const config = await readConfig();
    config.webhookUrl = url;
    await writeConfig(config);
};

module.exports = {
    getWebhookUrl,
    setWebhookUrl,
};