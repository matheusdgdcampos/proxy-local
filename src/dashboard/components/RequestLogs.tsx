import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

interface RequestLog {
  id: string;
  url: string;
  method: string;
  headers: string;
  body: string;
  timestamp: number;
  responseStatus?: number;
  responseHeaders?: string;
  responseBody?: string;
  responseTime?: number;
}

const RequestLogs: React.FC = () => {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [createMockSuccess, setCreateMockSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/logs');
      const data = await response.json();

      if (data.success) {
        setLogs(data.data);
        setError(null);
      } else {
        setError(data.error || 'Falha ao carregar logs');
      }
    } catch (error) {
      setError('Erro ao conectar com o servidor');
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();

    // Atualiza os logs a cada 5 segundos
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const viewLogDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/logs/${id}`);
      const data = await response.json();

      if (data.success) {
        setSelectedLog(data.data);
        setShowModal(true);
        setCreateMockSuccess(false);
        setActiveTab('request');
      } else {
        setError(data.error || 'Falha ao carregar detalhes do log');
      }
    } catch (error) {
      setError('Erro ao conectar com o servidor');
      console.error('Error fetching log details:', error);
    }
  };

  const createMockFromLog = async () => {
    if (!selectedLog) return;

    try {
      const response = await fetch(`/api/logs/${selectedLog.id}/create-mock`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        setCreateMockSuccess(true);
      } else {
        setError(data.error || 'Falha ao criar mock');
      }
    } catch (error) {
      setError('Erro ao conectar com o servidor');
      console.error('Error creating mock:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'badge-warning';
    if (status >= 200 && status < 300) return 'badge-success';
    if (status >= 400) return 'badge-danger';
    return 'badge-info';
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Logs de Requisições</h2>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchLogs}
          >
            Atualizar
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="text-center p-3">
            <div className="spinner"></div>
            <p className="mt-3">Carregando logs...</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Método</th>
                <th>URL</th>
                <th>Status</th>
                <th>Tempo</th>
                <th>Data/Hora</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center">
                    Nenhum log encontrado
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.method}</td>
                    <td className="truncate" style={{ maxWidth: '300px' }}>
                      {log.url}
                    </td>
                    <td>
                      {log.responseStatus ? (
                        <span
                          className={`badge ${getStatusColor(
                            log.responseStatus,
                          )}`}
                        >
                          {log.responseStatus}
                        </span>
                      ) : (
                        <span className="badge badge-warning">Pendente</span>
                      )}
                    </td>
                    <td>{log.responseTime ? `${log.responseTime}ms` : '-'}</td>
                    <td>{formatDate(log.timestamp)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => viewLogDetails(log.id)}
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && selectedLog && (
        <button
          type="button"
          className="modal-backdrop"
          onClick={() => setShowModal(false)}
        >
          <button
            type="button"
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Detalhes da Requisição</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {createMockSuccess && (
                <div className="alert alert-success">
                  Mock criado com sucesso!
                </div>
              )}

              <div className="tabs mb-3">
                <button
                  type="button"
                  className={`tab ${activeTab === 'request' ? 'active' : ''}`}
                  onClick={() => setActiveTab('request')}
                >
                  Requisição
                </button>
                <button
                  type="button"
                  className={`tab ${activeTab === 'response' ? 'active' : ''}`}
                  onClick={() => setActiveTab('response')}
                >
                  Resposta
                </button>
              </div>

              {activeTab === 'request' ? (
                <>
                  <div className="form-group">
                    <div className="d-flex justify-between">
                      <div>
                        <span className="font-bold">{selectedLog.method}</span>{' '}
                        {selectedLog.url}
                      </div>
                      <div>{formatDate(selectedLog.timestamp)}</div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="headers">
                      Headers
                    </label>
                    <pre className="code-block">
                      {JSON.stringify(JSON.parse(selectedLog.headers), null, 2)}
                    </pre>
                  </div>

                  {selectedLog.body && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="body">
                        Body
                      </label>
                      <pre className="code-block">
                        {typeof selectedLog.body === 'string' &&
                        selectedLog.body.startsWith('{')
                          ? JSON.stringify(
                              JSON.parse(selectedLog.body),
                              null,
                              2,
                            )
                          : selectedLog.body}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                selectedLog.responseStatus && (
                  <>
                    <div className="form-group">
                      <div className="d-flex justify-between">
                        <div>
                          <span
                            className={`badge ${getStatusColor(
                              selectedLog.responseStatus,
                            )}`}
                          >
                            Status: {selectedLog.responseStatus}
                          </span>
                        </div>
                        <div>
                          Tempo de resposta: {selectedLog.responseTime}ms
                        </div>
                      </div>
                    </div>

                    {selectedLog.responseHeaders && (
                      <div className="form-group">
                        <label className="form-label" htmlFor="responseHeaders">
                          Headers da Resposta
                        </label>
                        <pre className="code-block">
                          {JSON.stringify(
                            JSON.parse(selectedLog.responseHeaders || '{}'),
                            null,
                            2,
                          )}
                        </pre>
                      </div>
                    )}

                    {selectedLog.responseBody && (
                      <div className="form-group">
                        <label className="form-label" htmlFor="responseBody">
                          Body da Resposta
                        </label>
                        <pre className="code-block">
                          {typeof selectedLog.responseBody === 'string' &&
                          selectedLog.responseBody.startsWith('{')
                            ? JSON.stringify(
                                JSON.parse(selectedLog.responseBody),
                                null,
                                2,
                              )
                            : selectedLog.responseBody}
                        </pre>
                      </div>
                    )}
                  </>
                )
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn"
                onClick={() => setShowModal(false)}
              >
                Fechar
              </button>
              {selectedLog.responseStatus && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={createMockFromLog}
                  disabled={createMockSuccess}
                >
                  Criar Mock
                </button>
              )}
            </div>
          </button>
        </button>
      )}
    </div>
  );
};

export default RequestLogs;
