# Study Agent 🧠

An AI-powered study tool that transforms your documents into summaries, 
flashcards, and quizzes — entirely in the browser, no backend required.

🔗 **Live Demo:** [https://study-agent-mu.vercel.app/](https://study-agent-nmytz143b-nakshathra305s-projects.vercel.app/)

## What it does
Upload a PDF, TXT, or MD file and instantly get:
- 📄 **Summaries** — concise breakdown of key concepts
- 🃏 **Flashcards** — auto-generated Q&A cards for revision
- 📝 **Quizzes** — test your understanding from your own material
- 💬 **Document Q&A** — ask questions, get answers grounded in your file

## Tech Stack
`React` `Vite` `OpenRouter API` `PDF.js`

## How it works
1. User uploads a PDF, TXT, or MD file
2. PDF.js parses the document client-side (no file ever leaves your browser)
3. Extracted text is injected into system prompts sent to the LLM via OpenRouter API
4. AI returns summaries, flashcards, or quizzes grounded in your actual content

## Key Features
- **Zero backend** — all parsing happens client-side via PDF.js
- **3 file formats supported** — PDF, TXT, Markdown
- **3 study output types** — summaries, flashcards, quizzes
- **Document-aware AI** — responses are anchored to your uploaded content,
  not generic knowledge
- **CI/CD via GitHub** — auto-deploys to Vercel on every push

## Run Locally
git clone https://github.com/NAKSHATHRA305/Study-Agent
cd Study-Agent
npm install



## Deployment
Deployed on Vercel with environment variable management.
Any push to `main` triggers an automatic redeploy via GitHub CI/CD.
