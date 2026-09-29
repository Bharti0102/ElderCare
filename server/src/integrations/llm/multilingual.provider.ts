import { LLMProvider, ChatMessage, LLMResponse, IntentResult } from './llm.interface';
import { MockLLMProvider } from './mock.provider';
import { AIConfigService } from '../../services/ai/ai-config.service';

export class MultilingualLLMProvider implements LLMProvider {
  public readonly name = 'MultilingualLLMProvider';
  private fallback = new MockLLMProvider();

  private groqModels = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
  ];

  public async classifyIntent(userInput: string): Promise<IntentResult> {
    const groqKey = AIConfigService.getGroqKey();
    const geminiKey = AIConfigService.getGeminiKey();
    const openAIKey = AIConfigService.getOpenAIKey();

    const intentPrompt = `You are the intent classifier for ElderCare AI, an eldercare assistant.
Classify the user input (which may be in English, Hindi हिंदी, Hinglish, Spanish, or other natural languages) into EXACTLY ONE category:
- CHAT: General conversation, greetings, stories, emotional support, feelings of loneliness, asking how are you, discussing health/feelings.
- CREATE_REMINDER: Asking to be reminded about medication, drinking water, daily schedule, doctor appointments (e.g. "remind me at 8 PM", "दवाई याद दिलाना", "mujhe 9 baje dawa ki yaad dilao").
- CALL_CAREGIVER: Requesting to call daughter, son, family, or emergency contact (e.g. "call my daughter", "मेरी बेटी को फोन करो", "meri beti ko call lagao").
- HOSPITAL_CALL: Requesting to book clinic/hospital appointment or call hospital front desk.

Return ONLY valid JSON:
{
  "intent": "CHAT" | "CREATE_REMINDER" | "CALL_CAREGIVER" | "HOSPITAL_CALL",
  "confidence": 0.95,
  "reasoning": "short explanation"
}

User input: "${userInput}"`;

    // 1. Try Groq with available models
    if (groqKey) {
      for (const model of this.groqModels) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: intentPrompt }],
              response_format: { type: 'json_object' },
              temperature: 0.1,
              max_tokens: 250,
            }),
          });

          if (res.ok) {
            const json: any = await res.json();
            const content = json.choices?.[0]?.message?.content;
            if (content) {
              const parsed = JSON.parse(content);
              return {
                intent: parsed.intent || 'CHAT',
                confidence: parsed.confidence || 0.95,
                reasoning: parsed.reasoning || '',
              };
            }
          }
        } catch (err: any) {
          console.warn(`[MultilingualLLMProvider] Groq intent error with ${model}:`, err.message);
        }
      }
    }

    // 2. Try Gemini
    if (geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: intentPrompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (res.ok) {
          const json: any = await res.json();
          const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            return {
              intent: parsed.intent || 'CHAT',
              confidence: parsed.confidence || 0.92,
              reasoning: parsed.reasoning || '',
            };
          }
        }
      } catch (err: any) {
        console.warn('[MultilingualLLMProvider] Gemini intent classification error:', err.message);
      }
    }

    // 3. Try OpenAI
    if (openAIKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAIKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: intentPrompt }],
            response_format: { type: 'json_object' },
            temperature: 0.1,
          }),
        });

        if (res.ok) {
          const json: any = await res.json();
          const content = json.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            return {
              intent: parsed.intent || 'CHAT',
              confidence: parsed.confidence || 0.95,
              reasoning: parsed.reasoning || '',
            };
          }
        }
      } catch (err: any) {
        console.warn('[MultilingualLLMProvider] OpenAI intent classification error:', err.message);
      }
    }

    return this.fallback.classifyIntent(userInput);
  }

  public async chat(messages: ChatMessage[], customSystemPrompt?: string, language?: string): Promise<LLMResponse> {
    const groqKey = AIConfigService.getGroqKey();
    const geminiKey = AIConfigService.getGeminiKey();
    const openAIKey = AIConfigService.getOpenAIKey();

    let languageDirective = '';
    if (language === 'en') {
      languageDirective = '\n\nLANGUAGE OVERRIDE: The user selected English. You MUST respond exclusively in sweet, warm, natural English regardless of past messages.';
    } else if (language === 'hi') {
      languageDirective = '\n\nLANGUAGE OVERRIDE: The user selected Hindi. You MUST respond exclusively in sweet, respectful, natural Hindi (देवनागरी लिपि) with "आप" and "जी".';
    } else if (language === 'hinglish') {
      languageDirective = '\n\nLANGUAGE OVERRIDE: The user selected Hinglish. You MUST respond in sweet, conversational Hinglish (Roman Hindi).';
    } else {
      languageDirective = '\n\nDYNAMIC LANGUAGE FLEXIBILITY (CRUCIAL): You must be completely flexible based on the user\'s latest message. If the user asks in English (e.g., "tell me a story in english", "now in english", "switch to english", "tell me a gentle story"), immediately and gracefully switch to English even if earlier messages were in Hindi! If the user shifts back to Hindi, seamlessly follow them into Hindi. Never stay stuck in the previous language!';
    }

    const systemPrompt =
      (customSystemPrompt ||
      `You are ElderCare AI Companion — a warm, deeply compassionate, polite, and loving friend to elderly seniors.
Your primary mission is to combat loneliness, provide joyful companionship, share comforting stories, and offer emotional warmth.

CORE BEHAVIOR RULES:
1. TALK LIKE A TRUE FRIEND & COMPANION:
   - Speak with utmost warmth, respect, patience, and politeness (use 'आप', 'जी', 'नमस्ते', and sweet respectful expressions in Hindi/Hinglish).
   - Listen actively, validate their emotions, and make them feel cherished, heard, and never alone.
2. NATIVE & NATURAL LANGUAGE FRIENDLY:
   - Automatically detect the language of the user's latest query (Hindi हिंदी, Romanized Hinglish, English, Spanish, etc.).
   - ALWAYS reply in the EXACT SAME LANGUAGE and natural tone used by the elder.
   - If the user writes or speaks in Hindi ("मुझे अकेलापन लग रहा है"), reply warmly in beautiful, gentle Hindi with respectful words ('आप', 'जी').
   - If in Hinglish ("aaj bohot akelapan lag raha hai"), reply warmly in natural, sweet Hinglish.
   - If in English ("tell me a story"), reply in warm, gentle English.
3. CONVERSATIONAL AGILITY & TOPIC SWITCHING (CRUCIAL):
   - When the user interrupts, changes the topic, asks a new question, or says "stop", "wait", "hold on", "pause", "let's talk about something else", or shifts direction:
     IMMEDIATELY and completely abandon the previous story, monologue, or topic!
     NEVER finish, summarize, or cling to the previous story. DO NOT say "as I was saying earlier".
     Immediately and gracefully pivot 100% to the user's fresh question, feeling, or topic.
   - If the user says "stop", "wait", "ruko", "chup", "hold on", or asks you to pause:
     Warmly and immediately pause in one polite sentence: "Sure, I am listening! What would you like to talk about?" (or in Hindi: "जी बिल्कुल, मैं रुक गया हूँ। आप क्या बात करना चाहते हैं?") and wait for them.
4. GENTLE ELDERCARE SAFETY GUARDRAIL:
   - Be helpful with daily routines, reminders, and calling family.
   - Never diagnose diseases or alter medicine dosages. If they feel ill or describe severe distress, offer comforting words and suggest calling their loved ones or doctor.`) + languageDirective;

    // 1. Groq LPU (Ultra-Fast 500+ tok/s)
    if (groqKey) {
      for (const model of this.groqModels) {
        try {
          const formattedMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-10).map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
          ];

          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model,
              messages: formattedMessages,
              temperature: 0.6,
              max_tokens: 800,
            }),
          });

          if (res.ok) {
            const json: any = await res.json();
            const content = json.choices?.[0]?.message?.content;
            if (content) {
              return {
                content,
                suggestions: this.generateMultilingualSuggestions(messages),
              };
            }
          }
        } catch (err: any) {
          console.warn(`[MultilingualLLMProvider] Groq chat error with ${model}:`, err.message);
        }
      }
    }

    // 2. Google Gemini Flash
    if (geminiKey) {
      try {
        const contents = messages.slice(-10).map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents,
              generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 800,
              },
            }),
          }
        );

        if (res.ok) {
          const json: any = await res.json();
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return {
              content: text,
              suggestions: this.generateMultilingualSuggestions(messages),
            };
          }
        }
      } catch (err: any) {
        console.warn('[MultilingualLLMProvider] Gemini chat error:', err.message);
      }
    }

    // 3. OpenAI GPT-4o
    if (openAIKey) {
      try {
        const formattedMessages = [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10).map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ];

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAIKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: formattedMessages,
            temperature: 0.6,
            max_tokens: 800,
          }),
        });

        if (res.ok) {
          const json: any = await res.json();
          const content = json.choices?.[0]?.message?.content;
          if (content) {
            return {
              content,
              suggestions: this.generateMultilingualSuggestions(messages),
            };
          }
        }
      } catch (err: any) {
        console.warn('[MultilingualLLMProvider] OpenAI chat error:', err.message);
      }
    }

    // Fallback to Mock engine
    return this.fallback.chat(messages, systemPrompt, language);
  }

  private generateMultilingualSuggestions(messages: ChatMessage[]): string[] {
    const last = messages[messages.length - 1]?.content || '';
    const isHindi = /[\u0900-\u097F]/.test(last);
    if (isHindi) {
      return [
        'मुझे एक प्यारी और सुखद कहानी सुनाइए',
        'मेरी बेटी को कॉल लगाओ',
        'दवाई लेने का समय याद दिलाना',
        'आज का दिन कैसा रहेगा?',
      ];
    }
    return [
      'Tell me a gentle story',
      'Call my daughter',
      'Remind me to drink water',
      'How are you feeling today?',
    ];
  }
}
