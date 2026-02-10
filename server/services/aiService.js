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

// --- NEW COLLECTION TOOLS ---
const googleSheetsService = require('./googleSheetsService');

async function getDebtInfo(phone) {
    console.log(`[Tool] getDebtInfo called for ${phone}`);
    try {
        const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
        if (!spreadsheetId) return { error: "Spreadsheet ID not configured" };

        const rows = await googleSheetsService.getCollectionData(spreadsheetId, 'DataNasabah!A2:H');
        // Clean phone number (remove non-digits)
        const cleanPhone = phone.replace(/\D/g, '');

        // Find by phone (check both raw and 62 format)
        const customer = rows.find(r => {
            const rPhone = r.phone.replace(/\D/g, '');
            return rPhone === cleanPhone || rPhone.endsWith(cleanPhone) || cleanPhone.endsWith(rPhone);
        });

        if (customer) {
            return {
                found: true,
                name: customer.name,
                amount: customer.amount,
                dueDate: customer.dueDate,
                status: customer.status,
                lastReminded: customer.lastReminded,
                notes: customer.notes
            };
        }
        return { found: false, message: "No debt record found for this number." };
    } catch (err) {
        console.error("Error in getDebtInfo:", err);
        return { error: "Failed to retrieve debt info" };
    }
}

async function logPaymentPromise(phone, date, notes) {
    console.log(`[Tool] logPaymentPromise called for ${phone}, date: ${date}`);
    try {
        const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
        if (!spreadsheetId) return { error: "Spreadsheet ID not configured" };

        const rows = await googleSheetsService.getCollectionData(spreadsheetId, 'DataNasabah!A2:H');
        // Clean phone number (remove non-digits)
        const cleanPhone = phone.replace(/\D/g, '');

        const customer = rows.find(r => {
            const rPhone = r.phone.replace(/\D/g, '');
            return rPhone === cleanPhone || rPhone.endsWith(cleanPhone) || cleanPhone.endsWith(rPhone);
        });

        if (customer) {
            const range = `DataNasabah!G${customer.rowIndex}`; // Assuming Col G is Notes/Catatan
            const newNotes = `${customer.notes ? customer.notes + '. ' : ''}Janji bayar: ${date}. ${notes || ''}`;
            await googleSheetsService.updateRow(spreadsheetId, range, [newNotes]);
            return { success: true, message: `Payment promise logged for ${customer.name}` };
        }
        return { success: false, message: "Customer not found" };

    } catch (err) {
        console.error("Error in logPaymentPromise:", err);
        return { error: "Failed to log promise" };
    }
}

const tools = [
    {
        functionDeclarations: [
            // ... existing tools ...
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
                description: "Save or update a contact's information.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "The name of the contact" },
                        phone: { type: "STRING", description: "The phone number of the contact" },
                        notes: { type: "STRING", description: "Any additional notes about the contact" }
                    },
                    required: ["name", "phone"]
                }
            },
            {
                name: "get_debt_info",
                description: "Retrieve debt information (amount, due date, status) for a specific phone number. Use this when the user asks about their bill or debt.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        phone: { type: "STRING", description: "The phone number of the customer" }
                    },
                    required: ["phone"]
                }
            },
            {
                name: "log_payment_promise",
                description: "Log a customer's promise to pay on a specific date. Use this when a debtor commits to paying.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        phone: { type: "STRING", description: "The phone number of the customer" },
                        date: { type: "STRING", description: "The promised payment date (e.g., 'Besok', '25 Des', or YYYY-MM-DD)" },
                        notes: { type: "STRING", description: "Additional context or amount promised" }
                    },
                    required: ["phone", "date"]
                }
            }
        ]
    }
];

// ... getModel function ...

async function generateReply(incomingMessage, senderPhone) { // Updated signature to accept senderPhone
    const aiModel = getModel();
    if (!aiModel) return null;

    try {
        const chat = aiModel.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: `System: You are also a Collection Assistant. The user's phone number is ${senderPhone || 'unknown'}. If they ask about debt, use get_debt_info('${senderPhone}'). If they promise to pay, use log_payment_promise. Be professional, firm but polite.` }]
                }
            ],
        });

        let result = await chat.sendMessage(incomingMessage);
        let response = await result.response;
        let functionCalls = response.functionCalls();

        const MAX_LOOPS = 5;
        let loopCount = 0;

        while (functionCalls && functionCalls.length > 0 && loopCount < MAX_LOOPS) {
            loopCount++;
            const call = functionCalls[0];
            const { name, args } = call;

            let toolResult;
            console.log(`[AI Agent] Calling tool: ${name}`, args);

            if (name === 'get_contact_info') {
                toolResult = await getContactInfo(args.phone);
            } else if (name === 'save_contact') {
                toolResult = await saveContact(args);
            } else if (name === 'get_debt_info') {
                // Ensure phone is passed or use senderPhone if implied
                toolResult = await getDebtInfo(args.phone || senderPhone);
            } else if (name === 'log_payment_promise') {
                toolResult = await logPaymentPromise(args.phone || senderPhone, args.date, args.notes);
            } else {
                toolResult = { error: "Unknown tool" };
            }

            console.log(`[AI Agent] Tool result:`, toolResult);

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
