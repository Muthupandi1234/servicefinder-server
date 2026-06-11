// Gemini replaced with Groq
const groq = require('./groq');

const askGroq = async (prompt) => {
  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.1-8b-instant',
    max_tokens: 500,
  });
  return completion.choices[0].message.content;
};

module.exports = {
  generateContent: async (prompt) => ({
    response: { text: () => askGroq(prompt) }
  })
};