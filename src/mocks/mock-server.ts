import express from 'express';

const app = express();
const PORT = 3000;

app.use(express.json());

// Desabilita ETag completamente
app.set('etag', false);

// Middleware para ignorar validação de cache do cliente
app.use((req, res, next) => {
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];

  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  next();
});

// Endpoint de teste raiz
app.get('/', (_req, res) => {
  res.status(200).json({ message: 'Servidor mock rodando na porta 3000 🚀' });
});

// Endpoint GET /users
app.get('/users', (_req, res) => {
  res.status(200).json([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]);
});

// Endpoint POST /users
app.post('/users', (req, res) => {
  const newUser = req.body;
  res.status(201).json({ message: 'Usuário criado', user: newUser });
});

// Endpoint GET /status
app.get('/status', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Servidor mock rodando em http://localhost:${PORT}`);
});
