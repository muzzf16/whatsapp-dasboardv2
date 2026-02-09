const msg = {
    key: {
        remoteJid: "31937460703324@lid",
        remoteJidAlt: "6285740067368@s.whatsapp.net",
        fromMe: false,
        id: "ACACF017BBDDBF1E2CEEA153FC95E599",
        participant: "",
        addressingMode: "lid"
    },
    messageTimestamp: 1770575763,
    pushName: "Sales/MD Kece 😁",
    message: {
        protocolMessage: {
            key: {
                remoteJid: "220701625741407@lid",
                fromMe: true,
                id: "ACCED235DB4CA7E108283F3D17547C36"
            },
            type: "REVOKE"
        }
    }
};

let sender = msg.key.remoteJid;
console.log('Current Sender:', sender);

// Proposed Logic
if (sender.includes('@lid') && msg.key.remoteJidAlt) {
    sender = msg.key.remoteJidAlt;
}

console.log('Proposed Sender:', sender);
