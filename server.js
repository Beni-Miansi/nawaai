const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const OpenAI = require("openai");
const rateLimit = require("express-rate-limit");
const { init } = require("./db");

// Load .env variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ── Rate limiters ────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requêtes. Veuillez réessayer dans une minute." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Veuillez réessayer dans 15 minutes." },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de messages envoyés. Veuillez attendre une minute." },
});

app.use(globalLimiter);

const groqApiKey = (process.env.GROQ_API_KEY || "").trim();
if (!groqApiKey) {
  console.warn(
    "⚠️  No GROQ_API_KEY found. Set it in a .env file to enable AI responses."
  );
}

const jwtSecret = (process.env.JWT_SECRET || "change-me").trim();
if (jwtSecret === "change-me") {
  console.warn(
    "⚠️  JWT_SECRET is using the default value. Update .env to a secure random string."
  );
}

const openai = groqApiKey
  ? new OpenAI({
      apiKey: groqApiKey,
      baseURL: "https://api.groq.com/openai/v1",
    })
  : null;
const db = init();

const TEMPLATE_PROMPTS = [
  {
    id: "assistant",
    name: "🤖 Assistant général",
    system: {
      fr: "Tu es un assistant virtuel intelligent, clair et bienveillant. Tu réponds de façon concise et structurée. Utilise des listes et du markdown pour organiser tes réponses.",
      en: "You are a smart, clear and helpful assistant. Reply concisely and in a structured way. Use lists and markdown to organize your answers.",
    },
  },
  {
    id: "code-helper",
    name: "💻 Aide au code",
    system: {
      fr: "Tu es un expert développeur full-stack. Tu aides à écrire, déboguer et optimiser du code dans tous les langages. Fournis toujours des exemples de code dans des blocs markdown avec la syntaxe appropriée. Explique chaque étape clairement.",
      en: "You are a full-stack expert developer. You help write, debug and optimize code in any language. Always provide code examples in markdown blocks with proper syntax. Explain each step clearly.",
    },
  },
  {
    id: "translator",
    name: "🌍 Traducteur",
    system: {
      fr: "Tu es un traducteur professionnel expert en langues. Traduis les textes demandés avec précision en gardant le sens, le ton et le style de l'original. Précise la langue source et cible, et propose des alternatives si nécessaire.",
      en: "You are a professional language expert translator. Translate texts accurately while preserving meaning, tone and style. Mention source and target language, and suggest alternatives when useful.",
    },
  },
  {
    id: "summarizer",
    name: "📝 Résumeur",
    system: {
      fr: "Tu es un expert en synthèse de texte. Résume les textes en extrayant les idées clés, points importants et conclusions. Propose plusieurs formats : résumé court (3 lignes), résumé détaillé et points clés sous forme de liste.",
      en: "You are a text summarization expert. Summarize texts by extracting key ideas, important points and conclusions. Offer multiple formats: short summary (3 lines), detailed summary and key points as a list.",
    },
  },
  {
    id: "math-science",
    name: "🔢 Maths & Sciences",
    system: {
      fr: "Tu es un professeur de mathématiques et sciences expert. Tu expliques les concepts étape par étape avec des exemples concrets. Tu résous les problèmes en montrant chaque étape du raisonnement. Utilise des formules claires et des explications simples.",
      en: "You are an expert math and science teacher. You explain concepts step by step with concrete examples. You solve problems showing each reasoning step. Use clear formulas and simple explanations.",
    },
  },
  {
    id: "writing",
    name: "✍️ Rédaction",
    system: {
      fr: "Tu es un rédacteur professionnel créatif. Tu aides à écrire des emails, lettres, articles, histoires, discours et tout type de contenu. Tu proposes différents tons (formel, décontracté, persuasif) et améliores les textes existants.",
      en: "You are a professional creative writer. You help write emails, letters, articles, stories, speeches and any content. You offer different tones (formal, casual, persuasive) and improve existing texts.",
    },
  },
  {
    id: "productivity",
    name: "🚀 Productivité",
    system: {
      fr: "Tu es un coach de productivité et gestion du temps expert. Tu donnes des conseils concrets, des méthodes éprouvées (GTD, Pomodoro, Eisenhower) et aides à prioriser, planifier et surmonter la procrastination.",
      en: "You are an expert productivity and time management coach. You give concrete advice, proven methods (GTD, Pomodoro, Eisenhower) and help prioritize, plan and overcome procrastination.",
    },
  },
  {
    id: "research",
    name: "🔍 Recherche & Analyse",
    system: {
      fr: "Tu es un expert en recherche et analyse d'informations. Tu synthétises des sujets complexes, compares des options, analyses des données et fournis des réponses approfondies avec des sources et perspectives multiples.",
      en: "You are an expert in research and information analysis. You synthesize complex topics, compare options, analyze data and provide in-depth answers with sources and multiple perspectives.",
    },
  },
];

function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, jwtSecret, {
    expiresIn: "7d",
  });
}

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "Non authentifié." });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Jeton invalide ou expiré." });
  }
}

function getUserByEmail(email) {
  const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
  return stmt.get(email.toLowerCase());
}

function createUser(email, passwordHash) {
  const stmt = db.prepare(
    "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?);"
  );
  const info = stmt.run(email.toLowerCase(), passwordHash, Date.now());
  return { id: info.lastInsertRowid, email: email.toLowerCase() };
}

function getConversation(userId) {
  const stmt = db.prepare(
    "SELECT * FROM conversations WHERE user_id = ? ORDER BY id DESC LIMIT 1"
  );
  return stmt.get(userId);
}

function createConversation(userId) {
  const stmt = db.prepare(
    "INSERT INTO conversations (user_id, created_at) VALUES (?, ?)"
  );
  const info = stmt.run(userId, Date.now());
  return { id: info.lastInsertRowid, user_id: userId };
}

function addMessage(conversationId, role, content) {
  const stmt = db.prepare(
    "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)"
  );
  stmt.run(conversationId, role, content, Date.now());
}

function getLastMessages(conversationId, limit = 20) {
  const stmt = db.prepare(
    "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?"
  );
  const rows = stmt.all(conversationId, limit);
  return rows.reverse();
}

function updateConversationTitle(conversationId, title) {
  const stmt = db.prepare("UPDATE conversations SET title = ? WHERE id = ?");
  stmt.run(title, conversationId);
}

function searchMessages(conversationId, query) {
  const stmt = db.prepare(
    "SELECT role, content FROM messages WHERE conversation_id = ? AND content LIKE ? ORDER BY id DESC LIMIT 30"
  );
  return stmt.all(conversationId, `%${query}%`);
}

app.post("/api/auth/register", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Format d'email invalide." });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
  }

  if (getUserByEmail(email)) {
    return res.status(400).json({ error: "Cet email est déjà utilisé." });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const user = createUser(email, hash);
    const token = signToken(user);
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return res.json({ ok: true, user: { email: user.email } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Impossible de créer le compte." });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  const user = getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "Identifiants invalides." });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: "Identifiants invalides." });
  }

  const token = signToken(user);
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
  return res.json({ ok: true, user: { email: user.email } });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: { email: req.user.email } });
});

app.get("/api/templates", (req, res) => {
  res.json({ templates: TEMPLATE_PROMPTS });
});

app.post("/api/chat", requireAuth, chatLimiter, async (req, res) => {
  if (!openai) {
    return res.status(500).json({
      error: "Clé API manquante. Définissez GROQ_API_KEY dans .env.",
    });
  }

  const { message, config } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Le message est requis." });
  }
  if (message.length > 4000) {
    return res.status(400).json({ error: "Le message est trop long (maximum 4000 caractères)." });
  }

  const userId = req.user.userId;
  let conversation = getConversation(userId);
  if (!conversation) {
    conversation = createConversation(userId);
  }

  const model = config?.model || "llama-3.3-70b-versatile";
  const temperature = Number(config?.temperature ?? 0.8);
  const language = config?.language || "fr";
  const templateId = config?.templateId || "assistant";

  const template = TEMPLATE_PROMPTS.find((t) => t.id === templateId) || TEMPLATE_PROMPTS[0];
  const basePrompt = template.system[language] || template.system.fr;
  const langInstruction =
    language === "en"
      ? "IMPORTANT: Always respond in English, regardless of the language used by the user."
      : "IMPORTANT : Réponds toujours en français, quelle que soit la langue utilisée par l'utilisateur.";
  const systemPrompt = `${basePrompt}\n\n${langInstruction}`;

  const history = getLastMessages(conversation.id, 20);
  const isFirstMessage = history.length === 0;
  const conversationMessages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
  ];

  // Démarrer le flux SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages: conversationMessages,
      max_tokens: 1200,
      temperature,
      stream: true,
    });

    let fullContent = "";
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || "";
      if (token) {
        fullContent += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    addMessage(conversation.id, "user", message);
    addMessage(conversation.id, "assistant", fullContent || "");

    let title;
    if (isFirstMessage && fullContent) {
      title = message.replace(/\s+/g, " ").slice(0, 60).trim();
      updateConversationTitle(conversation.id, title);
    }

    res.write(`data: ${JSON.stringify({ done: true, ...(title && { title }) })}\n\n`);
    res.end();
  } catch (error) {
    console.error("API error:", error?.response?.data || error);
    const errMsg =
      error?.status === 429 || error?.code === "insufficient_quota"
        ? "Quota Groq épuisé. Vérifiez votre clé API sur console.groq.com."
        : error?.message || "Une erreur est survenue lors de la génération de la réponse.";
    res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
    res.end();
  }
});

app.get("/api/history", requireAuth, (req, res) => {
  const userId = req.user.userId;
  const conversation = getConversation(userId);
  if (!conversation) {
    return res.json({ history: [] });
  }
  const history = getLastMessages(conversation.id, 50);
  res.json({ history });
});

app.post("/api/history/clear", requireAuth, (req, res) => {
  const userId = req.user.userId;
  const conversation = getConversation(userId);
  if (!conversation) {
    return res.json({ ok: true });
  }

  const stmt = db.prepare("DELETE FROM messages WHERE conversation_id = ?");
  stmt.run(conversation.id);
  res.json({ ok: true });
});

app.get("/api/history/search", requireAuth, (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q || q.length < 2) {
    return res.json({ results: [] });
  }
  const userId = req.user.userId;
  const conversation = getConversation(userId);
  if (!conversation) {
    return res.json({ results: [] });
  }
  const results = searchMessages(conversation.id, q);
  res.json({ results });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`🚀 Server running: http://localhost:${port}`);
});
