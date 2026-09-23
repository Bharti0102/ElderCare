import { LLMProvider, ChatMessage, LLMResponse, IntentResult } from './llm.interface';
import { MockLLMProvider } from './mock.provider';

export class GeminiLLMProvider implements LLMProvider {
  public readonly name = 'GeminiLLMProvider';
  private apiKey: string;
  private fallback: MockLLMProvider;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.fallback = new MockLLMProvider();
  }

  public async classifyIntent(userInput: string): Promise<IntentResult> {
    if (!this.apiKey) {
      return this.fallback.classifyIntent(userInput);
    }

    try {
      const prompt = `You are the intent classifier for ElderCare AI, an assistant for elderly users.
Classify the following user input into EXACTLY ONE of these categories:
- CHAT (general conversation, storytelling, loneliness, emotional support, questions)
- CREATE_REMINDER (reminding about medication, daily schedule, hydration)
- CALL_CAREGIVER (calling daughter, son, doctor, emergency contact)
- PRESCRIPTION (prescription documents, reading medicine instructions)
- HOSPITAL_CALL (booking hospital appointment, calling clinic/reception)

Respond with valid JSON:
{
  "intent": "CHAT" | "CREATE_REMINDER" | "CALL_CAREGIVER" | "PRESCRIPTION" | "HOSPITAL_CALL",
  "confidence": 0.95,
  "reasoning": "short explanation"
}

User input: "${userInput}"`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (!res.ok) {
        return this.fallback.classifyIntent(userInput);
      }

      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        return {
          intent: parsed.intent || 'CHAT',
          confidence: parsed.confidence || 0.9,
          reasoning: parsed.reasoning || '',
        };
      }
    } catch {
      // Fallback on network or parsing error
    }

    return this.fallback.classifyIntent(userInput);
  }

  public async chat(messages: ChatMessage[], systemPrompt?: string): Promise<LLMResponse> {
    if (!this.apiKey) {
      return this.fallback.chat(messages, systemPrompt);
    }

    try {
      const defaultSystemPrompt = `You are ElderCare AI Companion, a warm, patient, kind, and supportive voice assistant for elderly people.
- Speak in simple, comforting, clear sentences.
- Strictly adhere to medical guardrails: NEVER diagnose medical conditions, NEVER prescribe medicines or alter dosages. If user expresses pain or symptoms, express empathy and advise them to consult their doctor or allow you to call their primary caregiver.
- Be an empathetic companion for stories, loneliness, and daily conversation.`;

      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt || defaultSystemPrompt }] },
            contents,
          }),
        }
      );

      if (!res.ok) {
        return this.fallback.chat(messages, systemPrompt);
      }

      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return {
          content: text,
          suggestions: ['Tell me a story', 'How are you today?', 'Who is my caregiver?'],
        };
      }
    } catch {
      // Fallback
    }

    return this.fallback.chat(messages, systemPrompt);
  }
}
