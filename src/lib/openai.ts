import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_TOKEN
});

export const predict = async (content: string): Promise<string | null> => {
  const output = await openai.chat.completions.create({
    messages: [{
      role: 'user',
      content
    }],
    model: 'gpt-3.5-turbo',
  });

  return output.choices[0].message.content
}