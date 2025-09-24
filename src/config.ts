import path from "path";
import fs from "fs";

export interface AppConfig {
  proxy: {
    port: number;
    target: string;
    secure: boolean;
  };
  dashboard: {
    port: number;
  };
  https: {
    enabled: boolean;
    certPath: string;
    keyPath: string;
  };
}

const defaultConfig: AppConfig = {
  proxy: {
    port: 3333,
    target: "http://localhost:3000",
    secure: false,
  },
  dashboard: {
    port: 3001,
  },
  https: {
    enabled: false,
    certPath: path.join(process.cwd(), "certs", "cert.pem"),
    keyPath: path.join(process.cwd(), "certs", "key.pem"),
  },
};

// Carrega configuração do arquivo config.json se existir
export function loadConfig(): AppConfig {
  const configPath = path.join(process.cwd(), "config.json");

  try {
    if (fs.existsSync(configPath)) {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      return {
        ...defaultConfig,
        ...fileConfig,
        proxy: {
          ...defaultConfig.proxy,
          ...(fileConfig.proxy || {}),
        },
        dashboard: {
          ...defaultConfig.dashboard,
          ...(fileConfig.dashboard || {}),
        },
        https: {
          ...defaultConfig.https,
          ...(fileConfig.https || {}),
        },
      };
    }
  } catch (error) {
    console.error("Erro ao carregar configuração:", error);
  }

  return defaultConfig;
}

// Salva configuração no arquivo config.json
export function saveConfig(config: AppConfig): boolean {
  const configPath = path.join(process.cwd(), "config.json");

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Erro ao salvar configuração:", error);
    return false;
  }
}

// Exporta a configuração carregada
export const config = loadConfig();
