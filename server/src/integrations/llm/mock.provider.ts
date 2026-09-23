import { LLMProvider, ChatMessage, LLMResponse, IntentResult, KnownIntent } from './llm.interface';

export class MockLLMProvider implements LLMProvider {
  public readonly name = 'MockLLMProvider';

  public async classifyIntent(userInput: string): Promise<IntentResult> {
    const text = userInput.toLowerCase();

    // 0. Safety & Medical symptoms FIRST -> Always route to CHAT for medical guardrails
    const medicalKeywords = [
      'chest pain',
      'breathe',
      'breathing',
      'heart attack',
      'stroke',
      'bleeding',
      'dizzy',
      'headache',
      'stomach hurts',
      'pain',
      'fever',
      'cough',
      'nausea',
      'what medicine',
      'prescribe',
      'diagnosis',
      'sick',
      'hurt',
      'hurts',
    ];
    if (medicalKeywords.some((k) => text.includes(k)) && !text.includes('remind') && !text.includes('prescription')) {
      return {
        intent: 'CHAT',
        confidence: 0.99,
        reasoning: 'Medical symptom or health safety inquiry directed to companion guardrails',
      };
    }

    // 1. Call Caregiver Intent
    if (
      text.includes('call') &&
      (text.includes('daughter') ||
        text.includes('son') ||
        text.includes('caregiver') ||
        text.includes('emergency') ||
        text.includes('family') ||
        text.includes('sarah') ||
        text.includes('doctor')) &&
      !text.includes('hospital')
    ) {
      return {
        intent: 'CALL_CAREGIVER',
        confidence: 0.95,
        reasoning: 'User requested calling family caregiver or emergency contact',
      };
    }

    // 2. Hospital / Appointment Intent
    if (
      text.includes('hospital') ||
      text.includes('reception') ||
      (text.includes('appointment') && text.includes('doctor')) ||
      text.includes('clinic')
    ) {
      return {
        intent: 'HOSPITAL_CALL',
        confidence: 0.92,
        reasoning: 'User mentioned hospital contact or doctor appointment booking',
      };
    }

    // 3. Reminder Intent
    if (
      text.includes('remind') ||
      text.includes('reminder') ||
      text.includes('alarm') ||
      (text.includes('take') && text.includes('medicine') && (text.includes('at') || text.includes('every')))
    ) {
      return {
        intent: 'CREATE_REMINDER',
        confidence: 0.94,
        reasoning: 'User requested a scheduled reminder or medication alert',
      };
    }

    // 4. Prescription Intent
    if (
      text.includes('prescription') ||
      text.includes('dosage') ||
      text.includes('pill image') ||
      text.includes('doctor wrote')
    ) {
      return {
        intent: 'PRESCRIPTION',
        confidence: 0.9,
        reasoning: 'User mentioned prescription documents or medication instructions',
      };
    }

    // Default to CHAT
    return {
      intent: 'CHAT',
      confidence: 0.98,
      reasoning: 'Conversational companion interaction',
    };
  }

  public async chat(messages: ChatMessage[], systemPrompt?: string): Promise<LLMResponse> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const query = lastUserMessage?.content?.toLowerCase().trim() || '';

    // MEDICAL GUARDRAIL: Urgent or medical symptom inquiry
    const criticalSymptoms = [
      'chest pain',
      'can\'t breathe',
      'cannot breathe',
      'heart attack',
      'stroke',
      'severe bleeding',
      'passed out',
      'collapsed',
    ];
    if (criticalSymptoms.some((s) => query.includes(s))) {
      return {
        content:
          '⚠️ Please sit down and stay calm. If you are experiencing sudden chest pain, breathing difficulty, or an acute emergency, please contact 911 (or your local emergency services) immediately, or ask me to call your primary emergency caregiver. Remember that I cannot diagnose conditions or prescribe treatments.',
        suggestions: ['Call my daughter', 'Find emergency number', 'I am sitting down safely'],
      };
    }

    const generalSymptoms = [
      'dizzy',
      'headache',
      'stomach hurts',
      'fever',
      'cough',
      'pain',
      'nausea',
      'what medicine should i take',
      'prescribe',
      'diagnosis',
    ];
    if (generalSymptoms.some((s) => query.includes(s))) {
      return {
        content:
          'I hear that you are not feeling well. Please rest comfortably and stay hydrated. As an AI care coordinator, I cannot diagnose medical conditions, prescribe medicines, or alter your dosages. I strongly advise checking with your doctor or letting me call your designated family caregiver so they can assist you.',
        suggestions: ['Call my doctor', 'Call my primary caregiver', 'Tell me a calming story'],
      };
    }

    // Loneliness & Emotional Support
    if (
      query.includes('lonely') ||
      query.includes('alone') ||
      query.includes('sad') ||
      query.includes('miss') ||
      query.includes('nobody')
    ) {
      return {
        content:
          'I am right here with you, and I truly value our conversations. Feeling lonely from time to time is completely natural, but please know you are appreciated and never forgotten. Would you like to hear a gentle story from a quiet coastal town, or would you like to call your daughter for a warm chat?',
        suggestions: ['Tell me a story', 'Call my daughter', 'Let\'s talk about favorite memories'],
      };
    }

    // Storytelling
    if (
      query.includes('story') ||
      query.includes('tell me a tale') ||
      query.includes('fable') ||
      query.includes('bedtime')
    ) {
      return {
        content:
          'Here is a peaceful tale for you:\n\nIn a sunny hillside village by a tranquil blue lake lived an elderly gardener named Thomas. Every morning at dawn, Thomas tended to his vibrant rose garden, humming a tune from his childhood. One crisp autumn morning, a little songbird with golden feathers landed on his watering can and chirped a melodic greeting. Thomas gently fed the songbird crumbs of sweet bread. From that day onward, every morning without fail, the golden songbird returned to sing alongside Thomas, reminding the entire village that friendship often blooms in the simplest and quietest moments.\n\nI hope that brought a smile to your heart today.',
        suggestions: ['Tell me another story', 'How are you today?', 'What else can you do?'],
      };
    }

    // Greeting & Daily Check-in
    if (
      query.includes('hello') ||
      query.includes('hi') ||
      query.includes('good morning') ||
      query.includes('good afternoon') ||
      query.includes('good evening') ||
      query.includes('how are you')
    ) {
      return {
        content:
          'Warm greetings! It is wonderful to speak with you today. How are you feeling this morning? You can ask me to tell a story, talk about your day, check on your caregivers, or just enjoy friendly conversation.',
        suggestions: ['I feel good today', 'Tell me a gentle story', 'Who is my caregiver?'],
      };
    }

    // Who is my caregiver / Profile inquiry
    if (query.includes('caregiver') || query.includes('daughter') || query.includes('contact')) {
      return {
        content:
          'Your emergency caregiver settings can be viewed and updated in your Profile. You can set designated primary contacts (like your daughter or doctor) whom I will be ready to call whenever you ask.',
        suggestions: ['View my profile', 'Tell me a story', 'How are you today?'],
      };
    }

    // Default conversational response
    return {
      content:
        'Thank you for sharing that with me. I am always here to listen, keep you company, tell comforting stories, and assist you with daily care routines. What would you like to talk about next?',
      suggestions: ['Tell me a story', 'I feel a bit lonely', 'What can you help me with?'],
    };
  }
}
