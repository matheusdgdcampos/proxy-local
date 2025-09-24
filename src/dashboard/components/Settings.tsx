import React, { useState, useEffect } from "react";
import { AppConfig } from "../../config";

const Settings: React.FC = () => {
  const [proxyTarget, setProxyTarget] = useState<string>("");
  const [proxyPort, setProxyPort] = useState<number>(0);
  const [dashboardPort, setDashboardPort] = useState<number>(0);
  const [useHttps, setUseHttps] = useState<boolean>(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Carrega configuração inicial do backend
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch("/api/config");
        const result = await response.json();
        if (result.success && result.data) {
          const config: AppConfig = result.data;
          setProxyTarget(config.proxy.target);
          setProxyPort(config.proxy.port);
          setDashboardPort(config.dashboard.port);
          setUseHttps(config.https.enabled);
        } else {
          setStatus({
            type: "error",
            message: "Falha ao carregar configuração do servidor",
          });
        }
      } catch (error) {
        console.error(error);
        setStatus({
          type: "error",
          message: "Erro ao carregar configuração do servidor",
        });
      }
    }
    fetchConfig();
  }, []);

  const handleSaveSettings = async () => {
    try {
      const newConfig: AppConfig = {
        proxy: {
          target: proxyTarget,
          port: proxyPort,
          secure: useHttps,
        },
        dashboard: {
          port: dashboardPort,
        },
        https: {
          enabled: useHttps,
          certPath: "certs/cert.pem",
          keyPath: "certs/key.pem",
        },
      };

      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      const result = await response.json();
      if (result.success) {
        setStatus({
          type: "success",
          message:
            "Configurações salvas com sucesso! (Reinicie o servidor para aplicar as alterações)",
        });
      } else {
        setStatus({ type: "error", message: result.error || "Erro ao salvar" });
      }
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: "Erro ao salvar configurações" });
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Configurações</h2>
      </div>

      <div className="card-body">
        {status.type && (
          <div
            className={`alert ${
              status.type === "success" ? "alert-success" : "alert-danger"
            }`}
          >
            {status.message}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveSettings();
          }}
        >
          <div className="form-group">
            <label className="form-label">URL de Destino do Proxy</label>
            <input
              type="text"
              className="form-control"
              value={proxyTarget}
              onChange={(e) => setProxyTarget(e.target.value)}
              placeholder="http://api.exemplo.com"
            />
            <small className="text-muted">
              URL para onde as requisições serão encaminhadas quando não houver
              mock
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Porta do Proxy</label>
            <input
              type="number"
              className="form-control"
              value={proxyPort}
              onChange={(e) => setProxyPort(parseInt(e.target.value))}
              min={1}
              max={65535}
            />
            <small className="text-muted">
              Porta em que o proxy interceptador estará escutando
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Porta do Dashboard</label>
            <input
              type="number"
              className="form-control"
              value={dashboardPort}
              onChange={(e) => setDashboardPort(parseInt(e.target.value))}
              min={1}
              max={65535}
            />
            <small className="text-muted">
              Porta em que o dashboard web estará disponível
            </small>
          </div>

          <div className="form-group">
            <label className="form-check">
              <input
                type="checkbox"
                checked={useHttps}
                onChange={(e) => setUseHttps(e.target.checked)}
              />
              <span style={{ marginLeft: "10px" }}>
                Usar HTTPS (requer certificado)
              </span>
            </label>
            <small className="text-muted d-block mt-2">
              Habilita HTTPS para o proxy e dashboard (requer certificado
              autoassinado)
            </small>
          </div>

          <div className="mt-3">
            <button type="submit" className="btn">
              Salvar Configurações
            </button>
          </div>
        </form>

        <hr className="my-3" />

        <div className="mt-3">
          <h3 className="mb-3">Informações do Sistema</h3>

          <div className="grid">
            <div className="card">
              <h4>Proxy</h4>
              <p>
                Status: <span className="badge badge-success">Ativo</span>
              </p>
              <p>Porta: {proxyPort}</p>
              <p>Destino: {proxyTarget}</p>
            </div>

            <div className="card">
              <h4>Dashboard</h4>
              <p>
                Status: <span className="badge badge-success">Ativo</span>
              </p>
              <p>Porta: {dashboardPort}</p>
              <p>URL: {`http://localhost:${dashboardPort}`}</p>
            </div>

            <div className="card">
              <h4>Banco de Dados</h4>
              <p>Tipo: SQLite</p>
              <p>Arquivo: ./data/mockproxy.db</p>
              <p>
                Status: <span className="badge badge-success">Conectado</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
