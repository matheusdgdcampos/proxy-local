import { execSync } from 'node:child_process';
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;

// Extrai o diff do PR (ajuste se precisar comparar com outra branch)
const diff = execSync('git diff origin/main...HEAD', { encoding: 'utf-8' });

// Configura o cliente Gemini
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

const config = {
  thinkingConfig: {
    thinkingBudget: 0,
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
  ],
};

// Função para dividir o diff em chunks (~3k caracteres cada)
function chunkText(text, maxLength = 3000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += maxLength) {
    chunks.push(text.slice(i, i + maxLength));
  }
  return chunks;
}

async function analyzeChunk(chunk, index, total) {
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `Você é um revisor de código. Analise a parte ${index + 1}/${total} do diff de um Pull Request. 
Sugira melhorias, potenciais bugs ou problemas de boas práticas. 
Aqui está o trecho:\n\n${chunk}`,
        },
      ],
    },
  ];

  const response = await ai.models.generateContentStream({
    model: 'gemini-flash-lite-latest',
    config,
    contents,
  });

  let reviewText = '';
  for await (const chunk of response) {
    if (chunk.text) {
      reviewText += chunk.text;
    }
  }

  return reviewText.trim();
}

async function summarizeReview(fullReview) {
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `Aqui está a análise detalhada de várias partes de um Pull Request:\n\n${fullReview}\n\n
Faça agora um resumo consolidado em formato de **conclusões gerais**. 
Foque em:\n- Principais problemas detectados\n- Pontos fortes do código\n- Sugestões prioritárias para o autor do PR\n
Seja objetivo e use markdown.`,
        },
      ],
    },
  ];

  const response = await ai.models.generateContentStream({
    model: 'gemini-flash-lite-latest',
    config,
    contents,
  });

  let summaryText = '';
  for await (const chunk of response) {
    if (chunk.text) {
      summaryText += chunk.text;
    }
  }

  return summaryText.trim();
}

async function getFullReview(diff) {
  const chunks = chunkText(diff, 3000);
  let fullReview = '';

  for (let i = 0; i < chunks.length; i++) {
    const partialReview = await analyzeChunk(chunks[i], i, chunks.length);
    fullReview += `### Parte ${i + 1}/${chunks.length}\n${partialReview}\n\n`;
  }

  // Agora gera o resumo consolidado
  const summary = await summarizeReview(fullReview);

  return (
    fullReview +
    '\n\n---\n\n## 🔎 Resumo Consolidado\n\n' +
    (summary || 'Não consegui gerar um resumo.')
  );
}

(async () => {
  try {
    const review = await getFullReview(diff);

    // Descobre o número do PR a partir da ref
    const prMatch = process.env.GITHUB_REF.match(/refs\/pull\/(\d+)\/merge/);
    const prNumber = prMatch ? prMatch[1] : null;

    if (!prNumber) {
      console.error('Não consegui identificar o número do PR.');
      process.exit(1);
    }

    // Posta comentário no PR usando GitHub CLI
    execSync(
      `gh api repos/${REPO}/issues/${prNumber}/comments -f body='🤖 Gemini Code Review:\n\n${review}'`,
      {
        env: { GITHUB_TOKEN, ...process.env },
        stdio: 'inherit',
      },
    );
  } catch (err) {
    console.error('Erro ao executar o Gemini Review:', err);
    process.exit(1);
  }
})();
