const { generateReply } = require('./services/aiService');
const db = require('./db');

// Mock environment or ensure .env is loaded if needed inside aiService
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_TEST_KEY_IF_NEEDED";
// Note: aiService loads .env 

async function testAgent() {
    console.log("--- Testing AI Agent ---");

    // Case 1: Save Contact
    console.log("\n1. Testing 'save_contact'...");
    const msg1 = "Halo, tolong simpan nomor saya. Nama saya Agus Santoso, nomornya 081222333444, saya pelanggan baru.";
    console.log(`User: ${msg1}`);
    const reply1 = await generateReply(msg1);
    console.log(`AI: ${reply1}`);

    // Verify DB
    db.get('SELECT * FROM contacts WHERE phone = ?', ['081222333444'], (err, row) => {
        if (row) console.log("✅ Contact saved in DB:", row);
        else console.log("❌ Contact NOT found in DB");
    });

    // Wait a bit
    await new Promise(r => setTimeout(r, 3000));

    // Case 2: Get Contact Info
    console.log("\n2. Testing 'get_contact_info'...");
    const msg2 = "Coba cek data kontak 081222333444";
    console.log(`User: ${msg2}`);
    const reply2 = await generateReply(msg2);
    console.log(`AI: ${reply2}`);
}

testAgent();
