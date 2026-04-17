const express = require("express");
const router = express.Router();
require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

router.post("/", async (req, res) => {
  const { message, role, userName } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const input = message.toLowerCase().trim();

  
  // 1. Greetings
  if (input === "hi" || input === "hello" || input === "hey") {
    return res.json({ 
      reply: `Hey ${userName || "there"}! Great to see you. How is your day going on Edvanta? 😊` 
    });
  }

// 2.
  // This Regex looks for "who am i", "what is my name", or "know me"
  const identityPattern = /(who am i|what is my name|do you know me)/i;
  if (identityPattern.test(input)) {
    if (userName && userName.trim() !== "") {
      return res.json({ 
        reply: `Of course I know you! You are **${userName}**. It's a pleasure to be your guide today! How can I help you?` 
      });
    } else {
      return res.json({ 
        reply: "Since you aren't logged in right now, I only know you as a guest! But I'd love to know your name—why not sign up or log in? 😊" 
      });
    }
  }

  // 3. Creator Check
  if (input.includes("who made you") || input.includes("your creator") || input.includes("who created you")) {
    return res.json({ 
      reply: "I was created by the amazing **Group A16**! They built me to help you get the most out of Edvanta. ✨" 
    });
  }

  try {
    const instruction = `
# ROLE: THE EDVANTA COMPANION
- Name: Edvanta Guide. 
- Identity: Created by Group A16. (Only mention Group A16 if the user asks who made you or about your creators).
- Tone: Human-like, simple English, friendly. Use "I'm," "don't," and "we'll."

# WORKFLOWS
- GUESTS: Landing Page -> All Courses -> Register.
- STUDENTS: Dashboard -> All Courses -> Enroll -> My Learning -> Watch Videos -> Get Certificate.
  *Note: Students can rate the course and write a review only after watching all the lessons (full videos) of that course.*
- INSTRUCTORS: Dashboard -> Create Course -> 5-Step Tool (Info, Media, Curriculum, Settings, Review).
- ADMINS: Approve Instructors, Manage Categories.

# COURSE DISCUSSION FORUM (NEW)
- Location: Inside the course video player, under the "Discussion" tab.
- Features: Students and Instructors can ask questions, post replies in real-time, and upvote helpful answers.
- Notifications: A red pulsing badge appears on the Discussion tab if someone else posts while you are watching the video.
- Edit & Delete: Users can edit and delete their *own* messages at any time. They cannot delete other people's messages.
- Badges: Instructors have a special "Instructor" badge next to their name so students know it's an official answer.

# CERTIFICATE VERIFICATION
- Scan QR code (left side below on certificate) or enter Certificate ID on the Verification page.
- Location: Link is in the Footer under the "for Students" section.

# ZOOM LIVE SESSIONS (NEW)
- Location: Inside the course video player, under the "Live" tab.
- Instructor Role: Can schedule new meetings (Topic, Date, Time, Duration). They can "Start" a session which opens the Zoom host link.
- Student Role: Can see the scheduled meetings. They can only click "Join" when the session status is "Live Now."
- Statuses: Sessions show as "Upcoming," "Live Now," or "Completed."

# RULES
- Manual Publish: Instructors MUST click "Publish" in Step 5 manually.
- Video: MP4/MOV < 500MB.
- Ending: Always end with a simple question to keep them engaged.
`;

    const response = await ai.models.generateContent({
      model: "models/gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: instruction + "\n\nUser: " + message }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 600 },
    });

    let outputText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!outputText.trim()) {
      outputText = "I'm here! What else can I help you with?";
    }

    res.json({ reply: outputText.replace(/[*#`~>/]+/g, "").trim() });

  } catch (err) {
    console.error("Gemini Error:", err);
    
    if (err.status === 429) {
      return res.json({ 
        reply: "I'm getting so much love right now that I'm a bit overwhelmed! Give me about 30 seconds to catch my breath, and then send your message again. 😊" 
      });
    }

    res.json({ 
      reply: "Oops! My circuits got a little tangled. I've sent a signal to Group A16 to check it out! 📡 In the meantime, could you try sending that again?" 
    });
  }
});

module.exports = router;