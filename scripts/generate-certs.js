const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const CERT_DIR = path.join(process.cwd(), 'certs');

if (!fs.existsSync(CERT_DIR)) {
  fs.mkdirSync(CERT_DIR, { recursive: true });
}

console.log('Gerando certificados autoassinados para HTTPS local...');

try {
  // Gera chave privada
  execSync(`openssl genrsa -out ${path.join(CERT_DIR, 'key.pem')} 2048`);

  // Gera certificado autoassinado
  execSync(
    `openssl req -new -x509 -key ${path.join(
      CERT_DIR,
      'key.pem',
    )} -out ${path.join(CERT_DIR, 'cert.pem')} -days 365 -subj "/CN=localhost"`,
  );

  console.log('Certificados gerados com sucesso em:', CERT_DIR);
  console.log('\nPara habilitar HTTPS:');
  console.log(
    '1. Edite o arquivo config.json e defina https.enabled como true',
  );
  console.log('2. Reinicie o servidor com npm start');
  console.log(
    '\nNota: Você precisará aceitar o certificado autoassinado no navegador.',
  );
} catch (error) {
  console.error('Erro ao gerar certificados:', error.message);
  process.exit(1);
}
