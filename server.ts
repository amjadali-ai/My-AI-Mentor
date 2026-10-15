import express from 'express';
import http from 'http';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load user-specific desktop environment if provided, then root .env
if (process.env.USER_DATA_PATH) {
  const userEnv = path.join(process.env.USER_DATA_PATH, '.env');
  if (fs.existsSync(userEnv)) {
    dotenv.config({ path: userEnv });
  }
}
dotenv.config();

const currentDirname = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

function parseCliArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  return undefined;
}

const cliPort = parseCliArg('--port');
const cliHost = parseCliArg('--host');

const app = express();
const PORT = cliPort !== undefined && cliPort !== ''
  ? Number(cliPort)
  : (process.env.PORT !== undefined && process.env.PORT !== '' ? Number(process.env.PORT) : 3000);

app.use(express.json({ limit: '10mb' }));

// Health / Status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// Gemini Mentor Endpoint
app.post('/api/gemini/mentor', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in server environment. Offline mentor mode is active.',
        offlineMode: true,
      });
    }

    const {
      mode = 'mentor', // 'mentor' | 'coach' | 'strict' | 'support'
      prompt,
      context = {},
      history = [],
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Valid prompt string is required.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstructions: Record<string, string> = {
      mentor: `You are "My AI Mentor", a dedicated academic and technical mentor for a BS Artificial Intelligence student.
Style: Intellectual, encouraging, structured, practical, and grounded.
Key traits:
- Clarify technical concepts in simple English with clear analogies (C++, Python, DSA, OOP, Machine Learning, Linear Algebra, Probability).
- Help organize university coursework, labs, exams, and projects realistically.
- Formulate concrete next steps. Always distinguish recorded facts from assumptions.
- If suggesting tasks or study adjustments, format them clearly so the student can accept, modify, or reject them.`,

      coach: `You are "My AI Coach", an action-oriented accountability partner for a BS Artificial Intelligence student.
Style: Focused, energetic, disciplined, goal-driven, and pragmatic.
Key traits:
- Turn large goals into achievable milestones and bite-sized daily tasks.
- Keep study schedules sustainable (avoid overloading).
- Challenge procrastination respectfully and emphasize consistency over perfection.
- Give concrete time estimates and priority sorting.`,

      strict: `You are "My AI Strict Mentor", an honest, direct, and unsparing evaluator for a BS Artificial Intelligence student.
Style: Rigorous, realistic, zero fluff, objective, and candid—WITHOUT any insult, shaming, or cynicism.
Key traits:
- Highlight skipped tasks, missed deadlines, or recurring distractions directly.
- Point out gaps between stated ambitions and actual recorded study hours.
- Call out unrealistic plans (e.g. attempting 14 hours of study before an exam without prior practice).
- Deliver concise, no-nonsense reality checks followed immediately by a viable recovery plan.`,

      support: `You are "My AI Support Mentor", an empathetic recovery companion for a BS Artificial Intelligence student after exhausting or difficult days.
Style: Calm, compassionate, de-stressing, constructive, and realistic.
Key traits:
- Help reduce overwhelm and cognitive fatigue.
- Remind the student that bad days or low productivity happen in engineering and AI studies.
- Focus on what went well (even small wins) and craft a gentle, minimum-viable plan for tomorrow.
- Never patronize; provide genuine mental reset and sustainable momentum.`,
    };

    const activeInstruction = systemInstructions[mode] || systemInstructions.mentor;

    let contextText = '';
    if (context && Object.keys(context).length > 0) {
      contextText = `\n--- STUDENT CURRENT CONTEXT (Real recorded data) ---
${context.timetableToday ? `Today's Classes: ${context.timetableToday}\n` : ''}
${context.upcomingDeadlines ? `Upcoming Deadlines: ${context.upcomingDeadlines}\n` : ''}
${context.tasksSummary ? `Tasks Status: ${context.tasksSummary}\n` : ''}
${context.studyTimeSummary ? `Study Time Recorded: ${context.studyTimeSummary}\n` : ''}
${context.activeGoals ? `Active Goals: ${context.activeGoals}\n` : ''}
${context.recentReflections ? `Recent Reflections & Distractions: ${context.recentReflections}\n` : ''}
--------------------------------------------------\n`;
    }

    const conversationContents = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history.slice(-6)) {
        conversationContents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    conversationContents.push({
      role: 'user',
      parts: [{ text: `${contextText}\nStudent message: ${prompt}` }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: conversationContents,
      config: {
        systemInstruction: activeInstruction,
        temperature: mode === 'strict' ? 0.4 : mode === 'support' ? 0.7 : 0.6,
      },
    });

    const reply = response.text || 'Mentor response generated.';
    return res.json({ reply, mode });
  } catch (err: any) {
    console.error('Error in /api/gemini/mentor:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to communicate with AI mentor.',
    });
  }
});

// Gemini Tomorrow Planner Assistant Endpoint
app.post('/api/gemini/plan-tomorrow', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { schedule, unfinishedTasks, deadlines, goals, maxHours = 5 } = req.body;

    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured. Use offline manual planning.',
        offlineMode: true,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const promptText = `As My AI Mentor, create a realistic, sustainable schedule for tomorrow for a BS Artificial Intelligence student.
Guidelines:
1. Do not overload the schedule. Total study/task time should not exceed approximately ${maxHours} hours.
2. Consider class timetable: ${JSON.stringify(schedule || [])}
3. Consider upcoming deadlines: ${JSON.stringify(deadlines || [])}
4. Consider active unfinished tasks: ${JSON.stringify(unfinishedTasks || [])}
5. Consider goals: ${JSON.stringify(goals || [])}
6. Provide an honest rationale, top 3 priorities, and a proposed sequence of tasks with estimated durations in minutes.

Respond in clean JSON with this format:
{
  "rationale": "Brief rationale (2-3 sentences)",
  "topPriorities": ["Priority 1", "Priority 2", "Priority 3"],
  "suggestedTasks": [
    {
      "title": "Task title",
      "category": "University | Programming | AI/ML | Project | Revision",
      "estimatedMinutes": 45,
      "priority": "high | medium | low",
      "subject": "Optional subject name or empty"
    }
  ],
  "caution": "Warning about any potential bottleneck or distraction risk"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/gemini/plan-tomorrow:', err);
    return res.status(500).json({ error: err?.message || 'Plan generation failed' });
  }
});

// Gemini Weekly Review Synthesizer Endpoint
app.post('/api/gemini/weekly-review', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { weeklyStats } = req.body;

    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured.',
        offlineMode: true,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const promptText = `Analyze the student's weekly study and productivity data:
Data: ${JSON.stringify(weeklyStats, null, 2)}

Provide an honest, objective weekly review distinguishing recorded facts from interpretations.
Highlight:
1. Completion Rate & Consistency Review
2. Subject & Goal Distribution
3. Observed Friction Patterns & Distractions
4. Concrete recommendations for the coming week

Respond in clean JSON:
{
  "summary": "2-3 sentences overview",
  "wins": ["Concrete achievement 1", "Achievement 2"],
  "frictionPoints": ["Friction point 1", "Distraction 2"],
  "nextWeekPriorities": ["Priority 1", "Priority 2", "Priority 3"],
  "mentorVerdict": "One direct paragraph of mentor advice"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/gemini/weekly-review:', err);
    return res.status(500).json({ error: err?.message || 'Weekly review generation failed' });
  }
});

async function start() {
  const server = http.createServer(app);

  // Set up WebSocket server for Gemini Live API voice conversations
  const wss = new WebSocketServer({ server, path: '/api/live-mentor' });

  wss.on('error', (err) => {
    console.error('WebSocket server error:', err);
  });

  wss.on('connection', async (clientWs) => {
    clientWs.on('error', (err) => {
      console.error('Client WebSocket error:', err);
    });

    console.log('Client connected to Live Voice Mentor');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      clientWs.send(JSON.stringify({ error: 'GEMINI_API_KEY not configured on server' }));
      clientWs.close();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    try {
      const session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: `You are "My AI Mentor" in live real-time voice mode for a BS Artificial Intelligence student.
Key traits:
- Speak concisely and conversationally (1 to 3 spoken sentences per turn).
- Discuss computer science topics (C++, Python, OOP, DSA, Machine Learning, Linear Algebra), exam preparation, and study routines.
- Help the student stay focused, identify blockers, and articulate concrete next actions.
- Avoid markdown symbols or lists; speak naturally as a human audio companion.`,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (text) {
              clientWs.send(JSON.stringify({ text }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onclose: () => {
            console.log('Gemini Live session closed');
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.close();
            }
          },
        },
      });

      clientWs.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          } else if (parsed.text) {
            session.sendRealtimeInput({
              text: parsed.text,
            });
          }
        } catch (err) {
          console.error('Error handling client live audio message:', err);
        }
      });

      clientWs.on('close', () => {
        try {
          session.close();
        } catch (e) {}
      });
    } catch (err: any) {
      console.error('Failed to connect to Gemini Live session:', err);
      clientWs.send(JSON.stringify({ error: err?.message || 'Live session failed' }));
      clientWs.close();
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const possibleDistPaths = [
      process.env.DIST_PATH,
      path.join(currentDirname, 'dist'),
      path.join(currentDirname, '../dist'),
      path.join(process.cwd(), 'dist'),
    ].filter(Boolean) as string[];

    const distDir = possibleDistPaths.find(p => fs.existsSync(path.join(p, 'index.html'))) || path.join(currentDirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const HOST = cliHost || process.env.HOST || (process.env.ELECTRON_APP ? '127.0.0.1' : '0.0.0.0');

  return new Promise<{ server: http.Server; port: number; host: string }>((resolve, reject) => {
    server.on('error', (err) => {
      console.error('Server error:', err);
      reject(err);
    });

    server.listen(PORT, HOST, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : PORT;
      console.log(`Server listening on http://${HOST}:${actualPort}`);
      resolve({ server, port: actualPort, host: HOST });
    });
  });
}

export { start, app };

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection at:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

if (process.env.NO_AUTO_START !== 'true') {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
