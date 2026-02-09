const fs = require('fs');
const path = require('path');

const AUTO_REPLY_FILE = path.join(__dirname, '../auto_replies.json');

class AutoReplyService {
    constructor() {
        this.replies = [];
        this.loadReplies();
    }

    loadReplies() {
        if (fs.existsSync(AUTO_REPLY_FILE)) {
            try {
                const data = fs.readFileSync(AUTO_REPLY_FILE, 'utf8');
                this.replies = JSON.parse(data);
            } catch (error) {
                console.error("Error loading auto_replies:", error);
                this.replies = [];
            }
        }
    }

    saveReplies() {
        fs.writeFileSync(AUTO_REPLY_FILE, JSON.stringify(this.replies, null, 2), 'utf8');
    }

    getReplies() {
        return this.replies;
    }

    setReplies(newReplies) {
        // newReplies is Array of { keyword, response }
        this.replies = newReplies;
        this.saveReplies();
    }

    findReply(text) {
        if (!text) return null;
        const lowerText = text.toLowerCase().trim();
        for (const reply of this.replies) {
            // Check for exact match or contains?
            // "Terma" usually implies simple keyword matching. 
            // Let's do partial match if it's not too common words, or just strict match.
            // For safety and intended "Terms" usage, strict equality or "starts with" or 'includes' depends on user need.
            // Let's go with exact match of the keyword found in the sentence? 
            // Or if the message IS the keyword.

            // Let's try: if message "contains" the keyword.
            if (lowerText.includes(reply.Keyword.toLowerCase().trim()) || lowerText === reply.Keyword.toLowerCase().trim()) {
                return reply.Response;
            }
        }
        return null;
    }
}

module.exports = new AutoReplyService();
