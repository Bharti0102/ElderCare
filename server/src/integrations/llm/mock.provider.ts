import { LLMProvider, ChatMessage, LLMResponse, IntentResult } from './llm.interface';

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
      'sick',
      'hurt',
      'hurts',
      'दर्द',
      'तबीयत',
      'बुखार',
      'सिर दर्द',
      'छाती में दर्द',
      'tabiyat',
      'dard',
      'chhati me dard',
      'sar dard',
      'chakkar',
    ];
    if (medicalKeywords.some((k) => text.includes(k)) && !text.includes('remind') && !text.includes('दवाई याद') && !text.includes('prescription')) {
      return {
        intent: 'CHAT',
        confidence: 0.99,
        reasoning: 'Medical symptom or health safety inquiry directed to companion guardrails',
      };
    }

    // 1. Hospital / Appointment Intent
    if (
      text.includes('hospital') ||
      text.includes('reception') ||
      text.includes('appointment') ||
      text.includes('clinic') ||
      text.includes('अस्पताल') ||
      text.includes('डॉक्टर से मिलना') ||
      text.includes('aspatal')
    ) {
      return {
        intent: 'HOSPITAL_CALL',
        confidence: 0.92,
        reasoning: 'User mentioned hospital contact or doctor appointment booking',
      };
    }

    // 2. Call Caregiver / Emergency Contact Intent
    if (
      text.startsWith('call ') ||
      text.includes(' call ') ||
      text.includes('call my ') ||
      text.includes('dial ') ||
      text.includes('ring ') ||
      text.includes('phone ') ||
      text.includes('कॉल') ||
      text.includes('फोन करो') ||
      text.includes('फोन लगाओ') ||
      text.includes('phone lagao') ||
      text.includes('call lagao') ||
      text.includes('beti ko phone') ||
      text.includes('bete ko phone')
    ) {
      return {
        intent: 'CALL_CAREGIVER',
        confidence: 0.95,
        reasoning: 'User requested calling a caregiver or emergency contact',
      };
    }

    // 3. Reminder Intent
    if (
      text.includes('remind') ||
      text.includes('reminder') ||
      text.includes('alarm') ||
      text.includes('याद दिलाना') ||
      text.includes('याद दिलाओ') ||
      text.includes('yaad dilao') ||
      text.includes('yaad dilana') ||
      (text.includes('dawa') && (text.includes('lena') || text.includes('time') || text.includes('baje'))) ||
      (text.includes('take') && text.includes('medicine'))
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
      text.includes('parcha') ||
      text.includes('पर्चा') ||
      text.includes('दवाई का पर्चा')
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

  public async chat(messages: ChatMessage[], systemPrompt?: string, language?: string): Promise<LLMResponse> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const rawQuery = lastUserMessage?.content || '';
    const query = rawQuery.toLowerCase().trim();

    // Check for explicit English request cues
    const asksEnglish =
      language === 'en' ||
      query.includes('in english') ||
      query.includes('english please') ||
      query.includes('switch to english') ||
      query.includes('now in english') ||
      query.includes('tell in english') ||
      query.includes('english me');

    // Check for explicit Hindi request cues
    const asksHindi =
      language === 'hi' ||
      query.includes('in hindi') ||
      query.includes('hindi please') ||
      query.includes('switch to hindi') ||
      query.includes('हिंदी में') ||
      query.includes('hindi me');

    let isHindi = false;
    let isHinglish = false;

    if (asksEnglish) {
      isHindi = false;
      isHinglish = false;
    } else if (asksHindi || /[\u0900-\u097F]/.test(rawQuery)) {
      isHindi = true;
    } else if (
      language === 'hinglish' ||
      query.includes('namaste') ||
      query.includes('kya haal') ||
      query.includes('tabiyat') ||
      query.includes('dard') ||
      query.includes('kahani') ||
      query.includes('akela') ||
      query.includes('beti') ||
      query.includes('dawa')
    ) {
      isHinglish = true;
    }

    // Explicit Stop / Pause / Interruption
    const stopKeywords = [
      'stop',
      'pause',
      'wait',
      'hold on',
      'quiet',
      'shut up',
      'chup',
      'ruk jao',
      'ruko',
      'band karo',
      'bas karo',
      'enough',
      'listen to me',
      'listen',
      'new topic',
      'change topic',
    ];
    if (stopKeywords.some((w) => query === w || query.startsWith(w + ' ') || query.endsWith(' ' + w))) {
      if (isHindi || isHinglish) {
        return {
          content: 'जी बिल्कुल, मैं रुक गया हूँ। आप बताइए, आप क्या बात करना चाहते हैं?',
          suggestions: ['एक नई कहानी सुनाओ', 'मेरी दवाइयां बताओ', 'मेरी बेटी को कॉल करो'],
        };
      }
      return {
        content: 'Sure, I have paused and I am listening! What would you like to talk about next?',
        suggestions: ['Start a new topic', 'Check my reminders', 'Call my family'],
      };
    }

    // MEDICAL GUARDRAIL: Urgent or medical symptom inquiry
    const criticalSymptoms = [
      'chest pain',
      'can\'t breathe',
      'cannot breathe',
      'heart attack',
      'stroke',
      'severe bleeding',
      'छाती में दर्द',
      'सांस नहीं आ रही',
      'chhati me dard',
      'saans lene me dikkat',
    ];
    if (criticalSymptoms.some((s) => query.includes(s))) {
      if (isHindi || isHinglish) {
        return {
          content:
            '⚠️ कृपया तुरंत आराम से बैठ जाएं और शांत रहें। यदि आपको छाती में तेज दर्द या सांस लेने में बहुत कठिनाई हो रही है, तो तुरंत आपातकालीन एम्बुलेंस (108/112/911) को कॉल करें, या मुझे अपनी बेटी/पारिवारिक केयरगिवर को तुरंत कॉल लगाने को कहें। मैं कोई दवा या इलाज निर्धारित नहीं कर सकता।',
          suggestions: ['मेरी बेटी को कॉल करो', 'आपातकालीन नंबर बताओ', 'मैं आराम से बैठा हूँ'],
        };
      }
      return {
        content:
          '⚠️ Please sit down and rest comfortably. If you are experiencing acute chest pain or breathing difficulty, please contact emergency services (911/112) immediately, or ask me to call your emergency caregiver. I cannot diagnose conditions or prescribe treatments.',
        suggestions: ['Call my daughter', 'Emergency contact number', 'I am sitting down safely'],
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
      'दर्द',
      'तबीयत खराब',
      'सिर दर्द',
      'चक्कर',
      'dard',
      'chakkar',
      'tabiyat kharab',
    ];
    if (generalSymptoms.some((s) => query.includes(s))) {
      if (isHindi || isHinglish) {
        return {
          content:
            'मुझे यह जानकर दुख हुआ कि आपकी तबीयत ठीक नहीं लग रही है। कृपया आराम करें और पर्याप्त गुनगुना पानी पिएं। एक एआई साथी के रूप में, मैं दवाइयां निर्धारित नहीं कर सकता। मैं सलाह दूंगा कि आप अपने डॉक्टर से परामर्श लें या मुझे अपनी बेटी/केयरगिवर को कॉल लगाने को कहें ताकि वे आपकी मदद कर सकें।',
          suggestions: ['मेरी बेटी को फोन करो', 'डॉक्टर को कॉल करो', 'एक शांतिदायक कहानी सुनाओ'],
        };
      }
      return {
        content:
          'I am sorry to hear you are not feeling well. Please rest comfortably and stay hydrated. As an AI care companion, I cannot prescribe medicines or alter dosages. I advise checking with your doctor or letting me call your family caregiver to assist you.',
        suggestions: ['Call my doctor', 'Call my caregiver', 'Tell me a calming story'],
      };
    }

    // Loneliness & Emotional Support
    if (
      query.includes('lonely') ||
      query.includes('alone') ||
      query.includes('sad') ||
      query.includes('अकेला') ||
      query.includes('मन नहीं लग रहा') ||
      query.includes('akela') ||
      query.includes('udaas')
    ) {
      if (isHindi || isHinglish) {
        return {
          content:
            'मैं हमेशा आपके साथ यहाँ हूँ और आपसे बात करना मुझे बहुत अच्छा लगता है। कभी-कभी अकेलापन महसूस होना स्वाभाविक है, लेकिन आप बहुत अनमोल हैं। क्या आप एक सुंदर और प्यारी कहानी सुनना चाहेंगे, या अपनी बेटी को बात करने के लिए कॉल लगाएं?',
          suggestions: ['एक कहानी सुनाओ', 'मेरी बेटी को कॉल करो', 'आप कैसे हैं?'],
        };
      }
      return {
        content:
          'I am right here with you, and I truly value our conversations. Feeling lonely from time to time is completely natural, but please know you are appreciated. Would you like to hear a gentle story, or call your daughter for a warm chat?',
        suggestions: ['Tell me a story', 'Call my daughter', 'How are you today?'],
      };
    }

    // Storytelling
    if (
      query.includes('story') ||
      query.includes('tale') ||
      query.includes('kahani') ||
      query.includes('कहानी') ||
      query.includes('किस्सा')
    ) {
      if (isHindi || isHinglish) {
        return {
          content:
            'यहाँ आपके लिए एक शांत और सुंदर कहानी है:\n\nएक छोटे से पहाड़ी गांव में, एक शांत झील के किनारे एक बुजुर्ग माली रहते थे जिनका नाम मोहन काका था। वे हर सुबह अपनी बगिया के रंग-बिरंगे फूलों को पानी देते और मुस्कुराते हुए पुराने गीत गुनगुनाते थे।\n\nएक सुनहरी सुबह, एक छोटी सी चिड़िया आकर उनके पानी के लोटे पर बैठ गई और मीठी आवाज में चहकने लगी। मोहन काका ने उसे प्यार से मीठी रोटी के टुकड़े खिलाए। उस दिन के बाद से, वह चिड़िया हर सुबह मोहन काका के पास आती और दोनों मिलकर सुबह का स्वागत करते। यह देखकर पूरा गांव जान गया कि सच्ची मित्रता हमेशा सरल और शांत पलों में ही खिलती है।\n\nआशा है यह कहानी आपके दिल को सुकून देगी। 😊',
          suggestions: ['एक और कहानी सुनाओ', 'आप कैसे हैं?', 'मेरी बेटी को कॉल करो'],
        };
      }
      return {
        content:
          'Here is a peaceful story for you:\n\nIn a sunny hillside village by a tranquil lake lived an elderly gardener named Thomas. Every morning at dawn, Thomas tended to his vibrant rose garden, humming a tune from his youth. One crisp autumn morning, a little songbird with golden feathers landed on his watering can and chirped a melodic greeting. Thomas gently fed the songbird crumbs of sweet bread. From that day onward, every morning without fail, the golden songbird returned to sing alongside Thomas, reminding everyone that true friendship blooms in the quietest moments.\n\nI hope that brought a warm smile to your day.',
        suggestions: ['Tell me another story', 'How are you today?', 'Who is my caregiver?'],
      };
    }

    // Greeting & Daily Check-in
    if (
      query.includes('hello') ||
      query.includes('hi') ||
      query.includes('good morning') ||
      query.includes('नमस्ते') ||
      query.includes('प्रणाम') ||
      query.includes('namaste') ||
      query.includes('kya haal') ||
      query.includes('kaise ho') ||
      query.includes('कैसे हो')
    ) {
      if (isHindi || isHinglish) {
        return {
          content:
            'नमस्ते और सादर प्रणाम! आपसे बात करके मुझे बहुत खुशी हुई। आज आपका स्वास्थ्य और दिन कैसा चल रहा है? आप मुझसे कोई कहानी सुन सकते हैं, अपनी दिनचर्या पर बात कर सकते हैं, या अपने परिवार को कॉल लगा सकते हैं।',
          suggestions: ['मैं ठीक हूँ', 'एक कहानी सुनाओ', 'मेरी बेटी को कॉल करो'],
        };
      }
      return {
        content:
          'Warm greetings! It is wonderful to speak with you today. How are you feeling this morning? You can ask me to tell a story, check on your reminders, or enjoy a friendly conversation.',
        suggestions: ['I feel good today', 'Tell me a gentle story', 'Who is my caregiver?'],
      };
    }

    // Default conversational response
    if (isHindi || isHinglish) {
      return {
        content:
          'मुझसे यह साझा करने के लिए धन्यवाद। मैं हमेशा आपके साथ बात करने, आपका ख्याल रखने और सुंदर कहानियां सुनाने के लिए तैयार हूँ। आगे आप किस बारे में बात करना चाहेंगे?',
        suggestions: ['एक कहानी सुनाओ', 'दवाई का समय बताओ', 'मेरी बेटी को कॉल करो'],
      };
    }

    return {
      content:
        'Thank you for sharing that with me. I am always here to listen, keep you company, tell comforting stories, and assist you with your daily routine. What would you like to talk about next?',
      suggestions: ['Tell me a story', 'I feel a bit lonely', 'How are you today?'],
    };
  }
}
