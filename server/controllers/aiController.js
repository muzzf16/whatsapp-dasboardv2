const { getAiConfig, updateAiConfig } = require('../services/aiService');
const autoReplyService = require('../services/autoReplyService');
const xlsx = require('xlsx');

function maskConfig(config) {
    return {
        ...config,
        apiKey: config.apiKey ? '********' : ''
    };
}

const getAiConfigController = (req, res) => {
    try {
        const config = getAiConfig();
        res.json({ success: true, config: maskConfig(config) });
    } catch (error) {
        console.error("Error getting AI config:", error);
        res.status(500).json({ success: false, error: 'Failed to get AI config' });
    }
};

const updateAiConfigController = (req, res) => {
    try {
        const newConfig = { ...req.body };
        if (newConfig.apiKey === '********') {
            delete newConfig.apiKey;
        }
        if (newConfig.systemInstruction && typeof newConfig.systemInstruction === 'string' && newConfig.systemInstruction.length > 4000) {
            return res.status(400).json({ success: false, error: 'System instruction is too long' });
        }
        const updated = updateAiConfig(newConfig);
        res.json({ success: true, config: maskConfig(updated) });
    } catch (error) {
        console.error("Error updating AI config:", error);
        res.status(500).json({ success: false, error: 'Failed to update AI config' });
    }
};

module.exports = {
    getAiConfigController,
    updateAiConfigController,
    uploadAutoReplyController: async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ status: 'error', message: 'No file uploaded' });
        }

        try {
            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            const replies = [];
            data.forEach(row => {
                // Expect columns: Keyword, Response
                const keyword = row['Keyword'] || row['keyword'];
                const response = row['Response'] || row['response'];
                if (keyword && response) {
                    replies.push({ Keyword: keyword, Response: response });
                }
            });

            if (replies.length > 0) {
                autoReplyService.setReplies(replies);
                res.status(200).json({ status: 'success', message: `Successfully loaded ${replies.length} auto-replies.` });
            } else {
                res.status(200).json({ status: 'warning', message: 'No valid auto-replies found in Excel.' });
            }
        } catch (error) {
            console.error("Error processing Auto-Reply Excel:", error);
            res.status(500).json({ status: 'error', message: 'Failed to process Excel file' });
        }
    }
};
