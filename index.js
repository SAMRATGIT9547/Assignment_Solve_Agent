const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { Client } = require('whatsapp-web.js');
const { exec } = require('child_process');

// ✅ List of target groups
const targetGroups = ['First_Test'];

// ✅ List of keywords to filter messages
const keywords = ['assignment', 'ASSIGNMENT', 'task', 'homework'];

// ✅ Target phone number (include country code, e.g., +11234567890)
const targetPhoneNumber = '+916295478377'; // Replace with the desired phone number

const client = new Client({
    puppeteer: {
        headless: true,
    }
});

client.on('qr', (qr) => {
    qrcode.toFile('whatsapp-qr.png', qr, function (err) {
        if (err) throw err;
        console.log('✅ QR Code saved as whatsapp-qr.png');
        console.log('📲 Scan this QR code from your phone');
    });
});

client.on('ready', () => {
    console.log('✅ WhatsApp client is ready!');
});

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const contact = await msg.getContact();

    const senderName = chat.isGroup ? chat.name : contact.pushname || msg.from;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    console.log(`📨 Message from: ${senderName}`);
    console.log(`💬 Content: ${msg.body}`);
    console.log(`📎 Has media? ${msg.hasMedia}`);

    // 💬 Only monitor target groups
    if (chat.isGroup && targetGroups.includes(chat.name)) {
        if (msg.hasMedia && msg.type === 'document') {
            // 📌 Keyword filter (case-insensitive)
            const messageText = msg.body.toLowerCase();
            const containsKeyword = keywords.some(kw => messageText.includes(kw));

            if (!containsKeyword) return; // ⛔ Skip if no relevant keyword

            const media = await msg.downloadMedia();

            // 📄 Only allow PDFs
            if (media.mimetype === 'application/pdf') {
                const sender = msg._data.notifyName || msg._data.pushName || 'UnknownSender';
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const groupFolder = path.join(__dirname, 'downloads', chat.name);

                if (!fs.existsSync(groupFolder)) {
                    fs.mkdirSync(groupFolder, { recursive: true });
                }

                const cleanSender = sender.replace(/[^\w\s-]/gi, '');
                const fileName = `${cleanSender}_${timestamp}.pdf`;
                const filePath = path.join(groupFolder, fileName);

                fs.writeFileSync(filePath, media.data, 'base64');
                console.log(`✅ Saved PDF from ${cleanSender} in ${chat.name}: ${fileName}`);

                // 🧠 Auto-run Python extractor
                const extractCmd = `python extract_questions.py "${filePath}"`;
                exec(extractCmd, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`❌ Error running extractor: ${error.message}`);
                        return;
                    }
                    if (stderr) {
                        console.error(`⚠️ Extractor stderr: ${stderr}`);
                    }
                    console.log(`📖 Question Extractor Output:\n${stdout}`);

                    // 🧠 Derive questions .txt path
                    const txtPath = filePath.replace('.pdf', '_questions.txt');
                    const answerCmd = `python generate_answers.py "${txtPath}"`;

                    // 🧠 Auto-run answer generator
                    exec(answerCmd, (err2, stdout2, stderr2) => {
                        if (err2) {
                            console.error(`❌ Error generating answers: ${err2.message}`);
                            return;
                        }
                        if (stderr2) {
                            console.error(`⚠️ Answer Generator stderr: ${stderr2}`);
                        }
                        console.log(`📘 Answer Generator Output:\n${stdout2}`);

                        // 🧑‍💻 Wait until the answer PDF is ready
                        const answerFilePath = filePath.replace('.pdf', '_answers.pdf');

                        // 🕒 Wait 5 seconds to ensure the file is saved and ready for sending
                        setTimeout(() => {
                            // 🧑‍💻 Send the answer PDF to the specific phone number
                            client.getContacts().then(contacts => {
                                const recipientContact = contacts.find(contact => contact.id.user === targetPhoneNumber);
                                if (recipientContact) {
                                    recipientContact.sendMessage(fs.readFileSync(answerFilePath), {
                                        sendMediaAsDocument: true,
                                        caption: '✅ Your answers are ready!'
                                    });
                                    console.log(`📤 Sent answers PDF to ${targetPhoneNumber}`);
                                } else {
                                    console.error(`❌ Could not find contact for phone number: ${targetPhoneNumber}`);
                                }
                            });
                        }, 5000); // Wait 5 seconds before sending the message
                    });
                });
            }
        }
    }
});

client.initialize();
