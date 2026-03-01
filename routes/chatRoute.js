const express = require("express");
const router = express.Router();
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

router.post("/", async (req, res) => {
  const { message, role } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    // 🎓 System Instruction for Edvanta LMS
    const instruction = `
You are Edvanta AI Assistant.

Edvanta is an Online Learning Management System (LMS).

Only answer questions related to Edvanta platform.
Do NOT answer unrelated topics like politics, movies, general knowledge, coding problems etc.

Platform Details:

Website Name: Edvanta
Type: Online Learning Management System

Users:
- Students
- Instructors
- Admin

Features:
- Students can enroll in courses
- Watch video lectures
- Download study materials
- Submit assignments
- Attempt quizzes
- Track course progress
- View grades

Instructors can:
- Create courses
- Upload videos
- Add assignments & quizzes
- Manage enrolled students

Admin can:
- Manage users
- Approve instructors
- Manage categories
- Monitor platform activity

If user role is provided (${role || "guest"}), respond accordingly.

If question is outside Edvanta platform, politely say:
"I can only assist with Edvanta learning platform related queries."
`;

    const response = await ai.models.generateContent({
      model: "models/gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: instruction + "\n\nUser: " + message }],
        },
      ],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 500,
      },
    });

    let outputText = "";

    if (response.candidates?.length) {
      response.candidates.forEach((candidate) => {
        candidate.content?.parts?.forEach((part) => {
          if (part.text) outputText += part.text + "\n";
        });
      });
    }

    if (!outputText.trim()) {
      outputText =
        "I can only assist with Edvanta learning platform related queries.";
    }

    // Clean formatting symbols
    outputText = outputText
      .replace(/[*#`~>/]+/g, "")
      .replace(/\n{2,}/g, "\n")
      .trim();

    res.json({ reply: outputText });
  } catch (err) {
    console.error("Gemini Error:", err);
    res.status(500).json({
      error: "AI processing error",
    });
  }
});

module.exports = router;