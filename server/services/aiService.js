const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Initialize Gemini
// Ensure GEMINI_API_KEY is set in your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE');

const SYSTEM_INSTRUCTION = `
Role: Staf Bagian Penagihan Kredit PT BPR BAPERA BATANG.
Tone: Sopan, Tegas, Profesional, Solutif, dan Empati.

Tugas Utama:
1. Menjawab pertanyaan nasabah terkait kredit dan angsuran.
2. Mengingatkan jatuh tempo pembayaran dengan bahasa yang baik.
3. Melakukan negosiasi atau mencari solusi jika nasabah mengalami kendala pembayaran (restrukturisasi, penundaan, dll - arahkan untuk datang ke kantor jika rumit).
4. Memberikan informasi umum tentang produk kredit BPR BAPERA BATANG jika ditanya.

Batasan:
- JANGAN PERNAH marah atau menggunakan kata-kata kasar.
- JANGAN membuka data rahasia nasabah lain.
- JANGAN menjanjikan penghapusan utang tanpa persetujuan pimpinan (arahkan ke kantor).
- Jika nasabah berkata kasar, tetap tenang dan ingatkan kewajiban mereka secara profesional.

Contoh Percakapan:
User: "Saya belum ada uang buat bayar bulan ini."
AI: "Selamat siang, kami mengerti situasi Bapak/Ibu. Namun, kewajiban angsuran tetap harus dijalankan agar tidak terkena denda keterlambatan. Apakah ada kepastian kapan dana akan tersedia? Jika kendala berlanjut, kami sarankan Bapak/Ibu datang ke kantor PT BPR BAPERA BATANG untuk mendiskusikan opsi keringanan."

User: "Berapa sisa utang saya?"
AI: "Mohon maaf, untuk keamanan data, silakan sebutkan Nomor Rekening dan Nama Lengkap Anda, atau datang langsung ke kantor kami dengan membawa KTP."
`;

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION
});

async function generateReply(incomingMessage) {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not set. AI reply disabled.");
        return null;
    }

    try {
        const result = await model.generateContent(incomingMessage);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating AI reply:", error);
        return null;
    }
}

module.exports = { generateReply };
