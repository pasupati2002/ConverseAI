import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

console.log("API KEY EXISTS:", !!process.env.GEMINI_API_KEY);

const app = express();
const PORT = process.env.PORT || 3000;
// const PORT = 3000;

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

app.use(express.json());
app.use(express.static("public"));

// Ask Gemini with automatic retry
async function askGemini(message, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Gemini attempt ${attempt}/${retries}...`);

            const response = await Promise.race([
                ai.models.generateContent({
                    model: "gemini-3.6-flash",
                    contents: message,
                }),

                new Promise((_, reject) =>
                    setTimeout(() => {
                        reject(
                            new Error(
                                "Gemini API request timed out after 30 seconds"
                            )
                        );
                    }, 30000)
                ),
            ]);

            return response.text;

        } catch (error) {
            console.error(
                `Gemini attempt ${attempt} failed:`,
                error.status || error.message
            );

            // Retry temporary Gemini server errors
            if (error.status === 503 && attempt < retries) {
                console.log(
                    "Gemini is currently busy. Retrying in 2 seconds..."
                );

                await new Promise(resolve =>
                    setTimeout(resolve, 2000)
                );

                continue;
            }

            throw error;
        }
    }
}

// Chat API
app.post("/api/chat", async (req, res) => {
    console.log("Received message:", req.body.message);

    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                error: "Message is required",
            });
        }

        console.log("Sending message to Gemini...");

        const reply = await askGemini(message);

        console.log("Gemini response received:", reply);

        res.json({
            reply: reply,
        });

    } catch (error) {
        console.error("GEMINI ERROR:");
        console.error(error);

        res.status(500).json({
            error:
                error?.message ||
                "Gemini is temporarily unavailable. Please try again.",
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
