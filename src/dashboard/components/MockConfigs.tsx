import React, { useState, useEffect } from 'react';

interface MockConfig {
  id: string;
  url: string;
  method: string;
  statusCode: number;
  headers: string;
  body: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

const MockConfigs: React.FC = () => {
  const [mocks, setMocks] = useState<MockConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMock, setSelectedMock] = useState<MockConfig | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState({
    url: '',
    method: 'GET',
    statusCode: 200,
    headers: '{}',
    body: '',
    active: true
  });

  const fetchMocks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mocks');
      const data = await response.json();
      
      if (data.success) {
        setMocks(data.data);
        setError(null);
      } else {
        setError(data.error || 'Falha ao carregar mocks');
      }
    } catch (error) {
      setError('Erro ao conectar com o servidor');
      console.error('Error fetching mocks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMocks();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const openCreateModal = () => {
    setFormData({
      url: '',
      method: 'GET',
      statusCode: 200,
      headers: '{}',
      body: '',
      active: true
    });
    setIsEditing(false);
    setShowModal(true);
  };

  const openEditModal = (mock: MockConfig) => {
    setFormData({
      url: mock.url,
      method: mock.method,
      statusCode: mock.statusCode,
      headers: mock.headers,
      body: mock.body,
      active: mock.active
    });
    setSelectedMock(mock);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let response;
      
      if (isEditing && selectedMock) {
        // Atualizar mock existente
        response = await fetch(`/api/mocks/${selectedMock.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      } else {
        // Criar novo mock
        response = await fetch('/api/mocks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }
      
      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        fetchMocks();
      } else {
        setError(data.error || 'Falha ao salvar mock');
      }
    } catch (error) {
      setError('Erro ao conectar com o servidor');
      console.error('Error saving mock:', error);
    }
  };

  const deleteMock = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este mock?')) return;
    
    try {
      const response = await fetch(`/api/mocks/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        fetchMocks();
      } else {
        setError(data.error || 'Falha ao excluir mock');
      }
    } catch (error) {
      setError('Erro ao conectar com o servidor');
      console.error('Error deleting mock:', error);
    }
  };

  const toggleMockStatus = async (mock: MockConfig) => {
    try {
      const response = await fetch(`/api/mocks/${mock.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !mock.active }),
      });
      
      const data = await response.json();
      if (data.success) {
        fetchMocks();
      } else {
        setError(data.error || 'Falha ao atualizar status do mock');
      }
    } catch (error) {
      setError('Erro ao conectar com o servidor');
      console.error('Error toggling mock status:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Configurações de Mock</h2>
          <div>
            <button className="btn btn-secondary" onClick={fetchMocks} style={{ marginRight: '10px' }}>
              Atualizar
            </button>
            <button className="btn" onClick={openCreateModal}>
              Novo Mock
            </button>
          </div>
        </div>
        
        {error && <div className="alert alert-danger">{error}</div>}
        
        {loading ? (
          <div className="text-center p-3">
            <div className="spinner"></div>
            <p className="mt-3">Carregando mocks...</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Método</th>
                <th>URL</th>
                <th>Código</th>
                <th>Última Atualização</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {mocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center">Nenhum mock encontrado</td>
                </tr>
              ) : (
                mocks.map(mock => (
                  <tr key={mock.id}>
                    <td>
                      <div 
                        className={`badge ${mock.active ? 'badge-success' : 'badge-danger'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleMockStatus(mock)}
                      >
                        {mock.active ? 'Ativo' : 'Inativo'}
                      </div>
                    </td>
                    <td>{mock.method}</td>
                    <td className="truncate" style={{ maxWidth: '300px' }}>{mock.url}</td>
                    <td>{mock.statusCode}</td>
                    <td>{formatDate(mock.updatedAt)}</td>
                    <td>
                      <button 
                        className="btn btn-sm" 
                        onClick={() => openEditModal(mock)}
                        style={{ marginRight: '5px' }}
                      >
                        Editar
                      </button>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => deleteMock(mock.id)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{isEditing ? 'Editar Mock' : 'Novo Mock'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">URL</label>
                  <input
                    type="text"
                    name="url"
                    className="form-control"
                    value={formData.url}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Método</label>
                  <select
                    name="method"
                    className="form-control"
                    value={formData.method}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Código de Status</label>
                  <input
                    type="number"
                    name="statusCode"
                    className="form-control"
                    value={formData.statusCode}
                    onChange={handleInputChange}
                    required
                    min="100"
                    max="599"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Headers (JSON)</label>
                  <textarea
                    name="headers"
                    className="form-control"
                    value={formData.headers}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Body</label>
                  <textarea
                    name="body"
                    className="form-control"
                    value={formData.body}
                    onChange={handleInputChange}
                    rows={5}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-check">
                    <input
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleInputChange}
                    />
                    <span style={{ marginLeft: '10px' }}>Ativo</span>
                  </label>
                </div>
                
                <div className="modal-footer">
                  <button type="button" className="btn btn-danger" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn">
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MockConfigs;