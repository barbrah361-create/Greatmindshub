
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

// Initialize the SDK - it automatically uses GEMINI_API_KEY from environment
const ai = new GoogleGenAI({});

async function run() {
  const imgPath = 'C:/Users/barbr/.gemini/antigravity-ide/brain/771bcd33-fa2c-466b-929e-234c9ca719a1/media__1786697963359.png';
  if (!fs.existsSync(imgPath)) {
    console.error("Image file does not exist at:", imgPath);
    return;
  }

  console.log("Reading image file and encoding to base64...");
  const imgBuffer = fs.readFileSync(imgPath);
  const base64Image = imgBuffer.toString('base64');

  console.log("Calling Gemini to perform OCR on PayHero credentials screenshot...");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Image
          }
        },
        "Please read the PayHero credentials shown in this image. Extract and return:\n" +
        "1. API Username\n" +
        "2. API Password\n" +
        "3. Account ID\n" +
        "4. Basic Auth Token (entire value, handling multi-line strings if applicable)\n\n" +
        "Be extremely precise with letter cases, numbers, and symbols (e.g. S vs T, 1 vs l vs I, etc.)."
      ]
    });

    console.log("\n--- Gemini OCR Result ---");
    console.log(response.text);
  } catch (err) {
    console.error("Gemini API call failed:", err);
  }
}

run();
