const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const db = require('../db');
require('dotenv').config();

const CONFIG_PATH = path.join(__dirname, '../ai_config.json');

let model = null;
let currentConfig = null;

function getAiConfig() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) {
            return {
                systemInstruction: "",
                modelName: "gemini-2.0-flash",
                apiKey: ""
            };
        }
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading AI config:", error);
        return { systemInstruction: "", modelName: "gemini-2.0-flash", apiKey: "" };
    }
}

function updateAiConfig(newConfig) {
    try {
        const current = getAiConfig();
        const updated = { ...current, ...newConfig };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf8');

        // Force model re-initialization on next call
        model = null;
        currentConfig = null;

        return updated;
    } catch (error) {
        console.error("Error updating AI config:", error);
        throw error;
    }
}

// --- TOOLS IMPLEMENTATION ---

async function getContactInfo(phone) {
    console.log(`[Tool] getContactInfo called for ${phone}`);
    return new Promise((resolve, reject) => {
        // Strip non-numeric chars for better matching, though DB likely has them clean or not.
        // Let's try exact match first.
        db.get('SELECT name, phone, email, tags, notes FROM contacts WHERE phone = ?', [phone], (err, row) => {
            if (err) {
                console.error("Error in getContactInfo:", err);
                resolve({ error: "Database error" });
            } else if (row) {
                resolve(row);
            } else {
                resolve({ found: false, message: "Contact not found in database" });
            }
        });
    });
}

async function saveContact({ name, phone, notes }) {
    console.log(`[Tool] saveContact called for ${name}, ${phone}`);
    return new Promise((resolve, reject) => {
        if (!phone) return resolve({ error: "Phone number is required" });

        // Check if exists
        db.get('SELECT id FROM contacts WHERE phone = ?', [phone], (err, row) => {
            if (err) {
                resolve({ error: "Database error checking contact" });
                return;
            }
            if (row) {
                // Update
                db.run('UPDATE contacts SET name = ?, notes = ? WHERE id = ?', [name, notes || '', row.id], function (err) {
                    if (err) resolve({ error: "Failed to update contact" });
                    else resolve({ success: true, message: "Contact updated", id: row.id });
                });
            } else {
                // Insert
                db.run('INSERT INTO contacts (name, phone, notes) VALUES (?, ?, ?)', [name, phone, notes || ''], function (err) {
                    if (err) resolve({ error: "Failed to create contact" });
                    else resolve({ success: true, message: "Contact created", id: this.lastID });
                });
            }
        });
    });
}

const tools = [
    {
        functionDeclarations: [
            {
                name: "get_contact_info",
                description: "Get contact details (name, email, tags, notes) for a given phone number.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        phone: { type: "STRING", description: "The phone number to look up (e.g., 628123456789)" }
                    },
                    required: ["phone"]
                }
            },
            {
                name: "save_contact",
                description: "Save or update a contact's information. Use this when the user introduces themselves or provides new information.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "The name of the contact" },
                        phone: { type: "STRING", description: "The phone number of the contact" },
                        notes: { type: "STRING", description: "Any additional notes about the contact" }
                    },
                    required: ["name", "phone"]
                }
            }
        ]
    }
];

function getModel() {
    const config = getAiConfig();
    currentConfig = config;

    // Use API Key from config first, then env
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.warn("GEMINI_API_KEY is not set (neither in config nor env).");
        return null;
    }

    if (model) return model;

    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
        model: config.modelName || "gemini-2.0-flash",
        systemInstruction: config.systemInstruction,
        tools: tools,
    });
    return model;
}

async function generateReply(incomingMessage) {
    const aiModel = getModel();
    if (!aiModel) {
        return null;
    }

    try {
        const chat = aiModel.startChat({
            history: [], // We might want to pass recent conversation history here in fetching from DB if needed
        });

        // For function calling to work seamlessly in a single turn context (which generateContent essentially is if we don't maintain chat object across requests)
        // We usually use generateContent or sendMessage. 
        // Since we are not maintaining a persistent ChatSession object across multiple HTTP requests from WhatsApp to here, 
        // we are effectively doing one-shot logic or need to rebuild history.
        // For simplicity, let's treat it as a single turn message first, but `startChat` is better for function calling loops.

        let result = await chat.sendMessage(incomingMessage);
        let response = await result.response;
        let functionCalls = response.functionCalls();

        // Handle function calls loop (Gemini can chain calls)
        // Note: JS SDK logic for auto-function-calling might differ, here we handle manually or use `sendMessage` which returns functions to be called.

        // NOTE: The simple `generateContent` or `sendMessage` might return a function call *request*.
        // We need to execute it and send the result back to the model.

        const MAX_LOOPS = 5;
        let loopCount = 0;

        while (functionCalls && functionCalls.length > 0 && loopCount < MAX_LOOPS) {
            loopCount++;
            const call = functionCalls[0]; // Handle first call (Gemini usually does one by one or parallel, let's assume specific structure)
            const { name, args } = call;

            let toolResult;
            console.log(`[AI Agent] Calling tool: ${name}`, args);

            if (name === 'get_contact_info') {
                toolResult = await getContactInfo(args.phone);
            } else if (name === 'save_contact') {
                toolResult = await saveContact(args);
            } else {
                toolResult = { error: "Unknown tool" };
            }

            console.log(`[AI Agent] Tool result:`, toolResult);

            // Send tool result back to model
            result = await chat.sendMessage([
                {
                    functionResponse: {
                        name: name,
                        response: toolResult
                    }
                }
            ]);
            response = await result.response;
            functionCalls = response.functionCalls();
        }

        return response.text();
    } catch (error) {
        console.error("Error generating AI reply:", error.message);
        return null;
    }
}

module.exports = { generateReply, getAiConfig, updateAiConfig };
