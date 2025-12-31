import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// To parse JSON bodies from Messenger
app.use(express.json());

// Serve built frontend
app.use(express.static(path.join(__dirname, "dist")));

// Health check
app.get("/health", (_, res) => res.send("OK"));

// --- WEBHOOK SETUP ---
const VERIFY_TOKEN = "my_secret_123"; // choose any secret

// Verification endpoint for Messenger
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Receiving messages
app.post("/webhook", (req, res) => {
  console.log("Received webhook event:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200); // respond immediately to Facebook
});
// --- END WEBHOOK SETUP ---

// SPA fallback (VERY IMPORTANT)
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
