import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const apiKey = process.env.ANTHROPIC_API_KEY;

// Mock generation if no API key
async function generateMockExample(word: string, meaning: string) {
  return {
    example_en: `This is a mock example sentence for the word "${word}".`,
    example_ko: `이것은 "${word}"(${meaning}) 단어를 위한 가짜 예문입니다.`
  };
}

async function generateExampleWithClaude(word: string, meaning: string, pos: string) {
  if (!apiKey) return generateMockExample(word, meaning);

  const anthropic = new Anthropic({ apiKey });
  const prompt = `You are an English teacher for Korean high school students.
Create one natural and practical English example sentence using the word "${word}" (meaning: ${meaning}, POS: ${pos}).
The sentence should be at a CEFR B1-B2 level.
Also provide a natural Korean translation.

Return ONLY a JSON object with this exact structure, nothing else:
{
  "example_en": "English sentence here",
  "example_ko": "Korean translation here"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 300,
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }]
  });

  const content = response.content[0];
  const text = content && content.type === 'text' ? content.text : '';
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`Failed to parse Claude response for word ${word}:`, text);
    return generateMockExample(word, meaning);
  }
}

async function run() {
  console.log('Starting AI Example Generation Pipeline...');

  // 1. Fetch 10 words without examples
  const { data: words, error } = await supabase
    .from('words')
    .select('id, word, meaning, pos, example_en')
    .is('example_en', null)
    .limit(10);

  if (error) {
    console.error('Error fetching words:', error);
    process.exit(1);
  }

  if (!words || words.length === 0) {
    console.log('No words missing examples.');
    process.exit(0);
  }

  console.log(`Found ${words.length} words needing examples.`);

  // 2. Generate examples
  for (const word of words) {
    console.log(`Generating for: ${word.word}...`);
    try {
      const generated = await generateExampleWithClaude(word.word, word.meaning, word.pos);
      
      // 3. Insert into ai_generated_examples
      const { error: insertError } = await supabase
        .from('ai_generated_examples')
        .insert({
          word_id: word.id,
          example_en: generated.example_en,
          example_ko: generated.example_ko,
          model: apiKey ? 'claude-3-haiku-20240307' : 'mock-generator',
          status: 'pending'
        });

      if (insertError) {
        console.error(`Failed to insert example for ${word.word}:`, insertError);
      } else {
        console.log(`  -> Queued example for ${word.word}`);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (e) {
      console.error(`Error processing ${word.word}:`, e);
    }
  }

  console.log('Pipeline finished.');
}

run();
