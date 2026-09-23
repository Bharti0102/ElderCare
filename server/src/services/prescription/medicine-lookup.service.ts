import { env } from '../../config/env';

export interface EnrichedMedicineDetails {
  name: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
  duration?: string;
  purpose: string;            // Why it is prescribed
  timingInstructions: string; // When/how to take it
  precautions: string;        // Common precautions
  interactions: string;       // Food/drug interactions
  whatToAvoid: string;        // What to avoid
  warnings: string;           // Important warnings
  simplifiedExplanation: string; // AI explains in simple language
}

export class MedicineLookupService {
  /**
   * Reference Clinical Database for common senior medications
   */
  private static readonly DRUG_DATABASE: Record<string, Omit<EnrichedMedicineDetails, 'name' | 'dosage' | 'frequency' | 'instructions' | 'duration'>> = {
    amlodipine: {
      purpose: 'Relaxes blood vessels to lower high blood pressure and prevent chest pain (angina).',
      timingInstructions: 'Take 1 tablet every morning with or without food. Try to take it at the same time every day with a full glass of water.',
      precautions: 'Stand up slowly from sitting or lying down to avoid dizziness. Do not stop taking this medication abruptly without consulting your doctor.',
      interactions: 'Grapefruit or grapefruit juice significantly increases amlodipine levels in your blood. Interacts with other blood pressure medicines.',
      whatToAvoid: 'Avoid grapefruit and grapefruit juice, high-sodium foods, and drinking excessive alcohol.',
      warnings: 'Contact your physician immediately if you experience severe swelling in your ankles or feet, rapid heartbeat, or extreme lightheadedness.',
      simplifiedExplanation: 'This gentle pill keeps your blood vessels relaxed so your heart pumps easily and your blood pressure stays safe all day long.',
    },
    metformin: {
      purpose: 'Controls blood sugar levels for Type 2 diabetes by helping your body use insulin more effectively and reducing liver sugar production.',
      timingInstructions: 'Take with or right after your meals (breakfast and dinner) to reduce stomach upset. Swallow whole with water.',
      precautions: 'Stay well-hydrated throughout the day. Monitor blood sugar regularly as advised by your healthcare provider.',
      interactions: 'Alcohol increases the risk of hypoglycemia and lactic acidosis. Interacts with iodinated contrast dyes used in CT scans.',
      whatToAvoid: 'Avoid skipping meals after taking medicine, binge drinking alcohol, and excessive sugary snacks that cause sudden glucose spikes.',
      warnings: 'Call your doctor immediately if you experience persistent nausea, severe stomach pain, unusual coldness, or difficulty breathing.',
      simplifiedExplanation: 'This medicine helps your body process nutrients from your food smoothly and prevents high sugar spikes after you eat.',
    },
    atorvastatin: {
      purpose: 'Lowers "bad" LDL cholesterol and triglycerides in the blood, protecting against heart attacks and stroke.',
      timingInstructions: 'Take 1 tablet daily, preferably in the evening or at bedtime, with or without food.',
      precautions: 'Routine liver function tests may be scheduled by your doctor. Maintain a heart-healthy diet.',
      interactions: 'Grapefruit juice significantly increases the concentration of atorvastatin. Interacts with certain antifungals and antibiotics.',
      whatToAvoid: 'Avoid grapefruit and grapefruit juice, high saturated-fat meals, and heavy alcohol consumption.',
      warnings: 'Report any unexplained muscle pain, tenderness, muscle weakness, or tea-colored dark urine to your doctor right away.',
      simplifiedExplanation: 'This evening tablet gently clears excess cholesterol from your bloodstream while you rest, keeping your heart arteries clear and strong.',
    },
    lisinopril: {
      purpose: 'ACE inhibitor that widens blood vessels to lower blood pressure, improve heart pumping, and protect kidneys.',
      timingInstructions: 'Take 1 tablet every morning with a full glass of water, with or without food.',
      precautions: 'Avoid salt substitutes containing potassium without consulting your doctor, as potassium levels may rise.',
      interactions: 'Interacts with potassium supplements, NSAID pain relievers (like Ibuprofen), and water pills (diuretics).',
      whatToAvoid: 'Avoid NSAID painkillers like ibuprofen or naproxen unless approved by your doctor; avoid potassium salt substitutes.',
      warnings: 'Seek emergency care immediately if you develop swelling of your face, lips, tongue, or throat, or trouble breathing.',
      simplifiedExplanation: 'This tablet keeps your blood flowing smoothly without straining your heart or kidneys, giving you steady daily protection.',
    },
    telmisartan: {
      purpose: 'ARB medication that blocks blood vessel constriction to lower high blood pressure and protect kidney function.',
      timingInstructions: 'Take 1 tablet once daily in the morning with water. Consistent timing is best.',
      precautions: 'Do not take during pregnancy. Check blood pressure regularly at home.',
      interactions: 'Interacts with potassium supplements, lithium, and NSAIDs.',
      whatToAvoid: 'Avoid potassium-based salt substitutes, dehydration, and heavy alcohol.',
      warnings: 'Contact your doctor if you experience sudden dizziness, fainting, or swelling in your hands or feet.',
      simplifiedExplanation: 'This tablet keeps your blood vessels open and relaxed, shielding your heart and kidneys from high pressure.',
    },
    omeprazole: {
      purpose: 'Proton pump inhibitor (PPI) that reduces excess stomach acid to treat acid reflux (GERD) and prevent ulcers.',
      timingInstructions: 'Take 1 capsule in the morning, 30 to 60 minutes BEFORE your first meal with water. Swallow whole.',
      precautions: 'Do not chew or crush the capsule. Long-term use may require monitoring of magnesium and Vitamin B12.',
      interactions: 'May decrease absorption of iron supplements and calcium. Interacts with clopidogrel and warfarin.',
      whatToAvoid: 'Avoid spicy, greasy, deeply fried foods, acidic citrus juices, and lying flat immediately after eating.',
      warnings: 'Notify your doctor if acid reflux symptoms persist past 2 weeks or if you experience difficulty swallowing or black stools.',
      simplifiedExplanation: 'This morning capsule coats and shields your stomach lining so acid does not irritate your throat or stomach when you eat.',
    },
    pantoprazole: {
      purpose: 'Reduces stomach acid secretion to heal acid damage, heartburn, and stomach ulcers.',
      timingInstructions: 'Take 1 tablet once daily, 30 minutes before breakfast with a glass of water.',
      precautions: 'Do not crush or chew tablets. Inform your doctor if you take it for longer than a few months.',
      interactions: 'May affect absorption of medications requiring acidic stomach pH (like ketoconazole, iron salts).',
      whatToAvoid: 'Avoid late-night eating, caffeine on an empty stomach, and acidic foods.',
      warnings: 'Seek medical care if you develop severe watery diarrhea, abdominal cramping, or bone pain.',
      simplifiedExplanation: 'This tablet calms down your stomach acid production early in the morning so your meals digest comfortably without burning.',
    },
    aspirin: {
      purpose: 'Low-dose blood thinner (antiplatelet) that prevents blood clots from forming inside narrowed heart and brain arteries.',
      timingInstructions: 'Take 1 tablet daily with a meal or milk to protect your stomach lining.',
      precautions: 'Inform your dentist or any doctor before dental work or surgery that you are taking daily aspirin.',
      interactions: 'Interacts with prescription blood thinners (Warfarin, Apixaban) and NSAIDs (Ibuprofen). Increases bleeding risk.',
      whatToAvoid: 'Avoid extra pain relievers like ibuprofen or naproxen without consulting your doctor; avoid high alcohol intake.',
      warnings: 'Seek immediate care for signs of serious bleeding: unusual bruising, black tarry stools, or persistent nosebleeds.',
      simplifiedExplanation: 'This small tablet stops dangerous clots from forming in your blood vessels, protecting you against stroke and heart strain.',
    },
    clopidogrel: {
      purpose: 'Powerful antiplatelet medication that prevents platelets from sticking together to form blood clots after stents or heart events.',
      timingInstructions: 'Take 1 tablet once daily with or without food at the same time each day.',
      precautions: 'Do not stop taking this medication without explicit approval from your cardiologist.',
      interactions: 'Interacts with omeprazole, other blood thinners, and NSAID painkillers.',
      whatToAvoid: 'Avoid activities with high risk of injury or cuts; avoid taking extra ibuprofen without medical guidance.',
      warnings: 'Call emergency services if you notice signs of internal bleeding, coughing up blood, or blood in urine/stool.',
      simplifiedExplanation: 'This medication ensures your blood moves freely past heart stents and narrowed arteries without forming clots.',
    },
    paracetamol: {
      purpose: 'Relieves mild to moderate pain (joint aches, headaches, osteoarthritis) and reduces fever.',
      timingInstructions: 'Take 1 to 2 tablets as needed every 6 hours with water, not exceeding 3000mg to 4000mg per day.',
      precautions: 'Do not exceed the recommended daily limit to prevent liver strain. Check other cold medicines to avoid doubling up.',
      interactions: 'Alcohol increases liver toxicity risk. Interacts with warfarin if taken regularly.',
      whatToAvoid: 'Avoid taking multiple cold/flu medications that also contain acetaminophen/paracetamol; avoid alcohol.',
      warnings: 'Stop use and contact doctor if pain lasts more than 7 days or fever persists beyond 3 days.',
      simplifiedExplanation: 'A safe, gentle pain reliever that eases joint stiffness and headaches so you can move around comfortably.',
    },
    losartan: {
      purpose: 'Lowers high blood pressure and protects kidneys from diabetic complications by blocking angiotensin receptors.',
      timingInstructions: 'Take 1 tablet daily in the morning with or without food.',
      precautions: 'Stay hydrated in hot weather. Check blood pressure periodically.',
      interactions: 'Interacts with potassium supplements, lithium, and NSAIDs.',
      whatToAvoid: 'Avoid potassium salt substitutes and heavy alcohol.',
      warnings: 'Notify physician if you develop facial swelling, severe dizziness, or lightheadedness upon standing.',
      simplifiedExplanation: 'This tablet keeps your blood vessels wide and relaxed, safeguarding your heart and kidneys every day.',
    },
  };

  /**
   * Enriches a raw extracted medicine with comprehensive clinical information and simple AI explanation.
   */
  public static async enrichMedicine(raw: {
    name: string;
    dosage?: string;
    frequency?: string;
    instructions?: string;
    duration?: string;
  }): Promise<EnrichedMedicineDetails> {
    const cleanName = (raw.name || '').trim();
    const lower = cleanName.toLowerCase();

    // 1. Check exact or partial match in Reference Clinical Database
    for (const [key, details] of Object.entries(this.DRUG_DATABASE)) {
      if (lower.includes(key)) {
        return {
          name: cleanName,
          dosage: raw.dosage || 'As directed',
          frequency: raw.frequency || 'Daily',
          instructions: raw.instructions || details.timingInstructions,
          duration: raw.duration || 'Ongoing',
          purpose: details.purpose,
          timingInstructions: details.timingInstructions,
          precautions: details.precautions,
          interactions: details.interactions,
          whatToAvoid: details.whatToAvoid,
          warnings: details.warnings,
          simplifiedExplanation: details.simplifiedExplanation,
        };
      }
    }

    // 2. If Gemini API key is available, query Gemini for dynamic medical enrichment
    if (env.GEMINI_API_KEY) {
      try {
        const dynamicDetails = await this.queryGeminiMedicineDetails(cleanName, raw.dosage, raw.instructions);
        if (dynamicDetails) {
          return {
            name: cleanName,
            dosage: raw.dosage || 'As directed',
            frequency: raw.frequency || 'Daily',
            instructions: raw.instructions || dynamicDetails.timingInstructions,
            duration: raw.duration || 'Ongoing',
            ...dynamicDetails,
          };
        }
      } catch (err: any) {
        console.warn(`[MedicineLookupService] Gemini query notice for ${cleanName}:`, err.message);
      }
    }

    // 3. Smart Clinical Fallback based on drug class heuristics
    return this.generateSmartHeuristicDetails(cleanName, raw.dosage, raw.instructions);
  }

  /**
   * Enriches an array of extracted medicines in parallel.
   */
  public static async enrichMedicines(
    medicines: Array<{
      name: string;
      dosage?: string;
      frequency?: string;
      instructions?: string;
      duration?: string;
      purpose?: string;
      timingInstructions?: string;
      precautions?: string;
      interactions?: string;
      whatToAvoid?: string;
      warnings?: string;
      simplifiedExplanation?: string;
    }>
  ): Promise<EnrichedMedicineDetails[]> {
    return Promise.all(
      medicines.map(async (m) => {
        // If already enriched with purpose and precautions, keep existing
        if (m.purpose && m.precautions && m.whatToAvoid) {
          return m as EnrichedMedicineDetails;
        }
        return this.enrichMedicine(m);
      })
    );
  }

  /**
   * Dynamically query Gemini AI for structured medicine information
   */
  private static async queryGeminiMedicineDetails(
    medicineName: string,
    dosage?: string,
    instructions?: string
  ): Promise<Omit<EnrichedMedicineDetails, 'name' | 'dosage' | 'frequency' | 'instructions' | 'duration'> | null> {
    const prompt = `You are a clinical pharmacologist and geriatric care specialist. Provide patient education for this medication:
Medicine Name: "${medicineName}"
Dosage: "${dosage || 'Standard'}"
Instructions: "${instructions || 'As prescribed'}"

Respond ONLY with valid JSON in this exact structure:
{
  "purpose": "Clear 1-2 sentence medical reason why it is prescribed",
  "timingInstructions": "Specific instructions on when/how to take it (with food, morning/night, with water)",
  "precautions": "Common precautions for an elderly patient (dizziness, blood pressure checks, standing up slowly)",
  "interactions": "Known food or drug interactions (e.g. grapefruit, alcohol, NSAIDs, salt substitutes)",
  "whatToAvoid": "Foods, drinks, or habits to avoid while on this medication",
  "warnings": "Important medical warning signs or severe side effects requiring immediate doctor attention",
  "simplifiedExplanation": "A warm, comforting 1-2 sentence summary in simple, everyday language that an 80-year-old elder can easily understand"
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) return null;

    const data: any = await res.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) return null;

    const parsed = JSON.parse(rawJson);
    return {
      purpose: parsed.purpose || 'Prescribed by your physician for health maintenance.',
      timingInstructions: parsed.timingInstructions || 'Take with water as directed by your doctor.',
      precautions: parsed.precautions || 'Take regularly at the same time each day. Do not alter dosage without doctor advice.',
      interactions: parsed.interactions || 'Check with your pharmacist before taking new over-the-counter medications.',
      whatToAvoid: parsed.whatToAvoid || 'Avoid alcohol and taking unverified supplements.',
      warnings: parsed.warnings || 'Contact your doctor if you experience unusual fatigue, rash, or persistent side effects.',
      simplifiedExplanation: parsed.simplifiedExplanation || `This medicine helps keep your body healthy and balanced when taken as directed.`,
    };
  }

  /**
   * Rule-based clinical heuristic fallback
   */
  private static generateSmartHeuristicDetails(
    name: string,
    dosage?: string,
    instructions?: string
  ): EnrichedMedicineDetails {
    const isAntiInfective = /cillin|mycin|floxacin|azole|cef/i.test(name);
    const isPainRelief = /fen|paracetamol|tramadol|codeine|aspirin|diclo/i.test(name);
    const isCardiac = /lol|statin|pril|sartan|dipine|digoxin/i.test(name);

    if (isCardiac) {
      return {
        name,
        dosage: dosage || 'As directed',
        frequency: 'Daily',
        instructions: instructions || 'Take in the morning with a full glass of water',
        duration: 'Ongoing',
        purpose: 'Supports cardiovascular health, regulates blood pressure, and relieves strain on your heart.',
        timingInstructions: instructions || 'Take 1 tablet every morning with water. Consistent daily timing is recommended.',
        precautions: 'Stand up slowly from chairs or bed to prevent dizziness. Keep track of your blood pressure.',
        interactions: 'May interact with grapefruit juice, high salt intake, and NSAID painkillers.',
        whatToAvoid: 'Avoid sudden posture changes, high-sodium foods, and excess alcohol.',
        warnings: 'Consult your doctor immediately if you experience shortness of breath, irregular heartbeat, or swelling in feet.',
        simplifiedExplanation: 'This tablet gently protects your heart and keeps your blood flow steady throughout your day.',
      };
    }

    if (isAntiInfective) {
      return {
        name,
        dosage: dosage || 'As directed',
        frequency: 'Every 8 to 12 hours',
        instructions: instructions || 'Take with a glass of water after food',
        duration: '5 to 7 days',
        purpose: 'Prescribed to eliminate bacterial or microbial infection in the body.',
        timingInstructions: 'Take at evenly spaced intervals throughout the day with a glass of water. Complete the entire course.',
        precautions: 'Do not stop taking this medication early, even if you feel completely better, to prevent infection recurrence.',
        interactions: 'Certain antibiotics interact with dairy products, antacids, and iron supplements.',
        whatToAvoid: 'Avoid skipping doses and consuming alcohol during the antibiotic course.',
        warnings: 'Call your doctor if you develop a severe skin rash, hives, or persistent watery diarrhea.',
        simplifiedExplanation: 'This medicine clears away harmful germs. Finishing all doses ensures the infection does not return.',
      };
    }

    if (isPainRelief) {
      return {
        name,
        dosage: dosage || 'As directed',
        frequency: 'As needed for pain',
        instructions: instructions || 'Take after meals with water',
        duration: '3 to 5 days',
        purpose: 'Alleviates discomfort, joint pain, or inflammation as advised by your doctor.',
        timingInstructions: 'Take with food or a snack to protect your stomach lining.',
        precautions: 'Do not exceed the recommended dose. Drink plenty of water.',
        interactions: 'Avoid combining with other pain relievers or alcohol without medical guidance.',
        whatToAvoid: 'Avoid taking on an empty stomach and avoid drinking alcohol.',
        warnings: 'Report severe stomach pain, heartburn, or persistent symptoms to your physician.',
        simplifiedExplanation: 'This medicine eases aches and discomfort so you can relax and rest comfortably.',
      };
    }

    // General fallback
    return {
      name,
      dosage: dosage || 'As directed',
      frequency: 'Daily',
      instructions: instructions || 'Take with water as directed by your physician',
      duration: 'Ongoing',
      purpose: 'Prescribed by your doctor to maintain health and treat your condition.',
      timingInstructions: instructions || 'Take at regular times each day with a full glass of water.',
      precautions: 'Follow your doctor’s dosage strictly. Store in a cool, dry place out of direct sunlight.',
      interactions: 'Consult your pharmacist before adding new vitamins or supplements.',
      whatToAvoid: 'Avoid taking double doses if you miss a dose; avoid unapproved herbal remedies.',
      warnings: 'Contact your clinic if you experience unexpected symptoms, dizziness, or allergic reactions.',
      simplifiedExplanation: `This medicine is tailored to support your health. Taking it regularly keeps you feeling your best.`,
    };
  }
}
