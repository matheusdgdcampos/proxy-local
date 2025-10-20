/**
 * TS Mock Proxy - Client-Side JavaScript
 * Progressive enhancement with vanilla JavaScript
 */

// Toast Notification System
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    this.container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(message) {
    this.show(message, 'success');
  },

  error(message) {
    this.show(message, 'error');
  },

  info(message) {
    this.show(message, 'info');
  },

  warning(message) {
    this.show(message, 'warning');
  },
};

// Modal System
const Modal = {
  container: null,

  init() {
    this.container = document.getElementById('modal-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'modal-container';
      document.body.appendChild(this.container);
    }
  },

  open(title, content, actions = []) {
    this.init();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    modalHeader.innerHTML = `
      <h3>${title}</h3>
      <button class="modal-close" onclick="Modal.close()">&times;</button>
    `;

    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    if (typeof content === 'string') {
      modalBody.innerHTML = content;
    } else {
      modalBody.appendChild(content);
    }

    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';

    if (actions.length === 0) {
      actions = [{ label: 'Close', onClick: () => this.close() }];
    }

    actions.forEach((action) => {
      const button = document.createElement('button');
      button.className = action.className || 'btn btn-secondary';
      button.textContent = action.label;
      button.onclick = action.onClick;
      modalFooter.appendChild(button);
    });

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modal.appendChild(modalContent);

    this.container.appendChild(modal);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.close();
      }
    });

    // Trigger animation
    setTimeout(() => modal.classList.add('show'), 10);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  },

  close() {
    const modal = this.container.querySelector('.modal-overlay');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.remove();
        document.body.style.overflow = '';
      }, 300);
    }
  },
};

// Log Detail Modal
async function showLogModal(logId) {
  try {
    const response = await fetch(`/api/logs/${logId}`);
    const data = await response.json();

    if (!data.success) {
      Toast.error('Failed to load log details');
      return;
    }

    const log = data.data;

    const content = document.createElement('div');
    content.innerHTML = `
      <div class="log-detail">
        <div class="detail-section">
          <h4>Request Information</h4>
          <p><strong>Method:</strong> <span class="badge badge-method-${log.method.toLowerCase()}">${log.method}</span></p>
          <p><strong>URL:</strong> ${log.url}</p>
          <p><strong>Timestamp:</strong> ${new Date(log.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="detail-section">
          <h4>Request Headers</h4>
          <pre>${formatJSON(log.headers)}</pre>
        </div>
        
        ${
          log.body
            ? `
        <div class="detail-section">
          <h4>Request Body</h4>
          <pre>${formatJSON(log.body)}</pre>
        </div>
        `
            : ''
        }
        
        ${
          log.responseStatus
            ? `
        <div class="detail-section">
          <h4>Response Information</h4>
          <p><strong>Status:</strong> <span class="badge badge-status-${Math.floor(log.responseStatus / 100)}xx">${log.responseStatus}</span></p>
          <p><strong>Response Time:</strong> ${log.responseTime}ms</p>
        </div>
        
        <div class="detail-section">
          <h4>Response Headers</h4>
          <pre>${formatJSON(log.responseHeaders)}</pre>
        </div>
        
        ${
          log.responseBody
            ? `
        <div class="detail-section">
          <h4>Response Body</h4>
          <pre>${formatJSON(log.responseBody)}</pre>
        </div>
        `
            : ''
        }
        `
            : '<p class="text-muted">No response data available</p>'
        }
      </div>
    `;

    const actions = [{ label: 'Close', onClick: () => Modal.close() }];

    if (log.responseStatus) {
      actions.unshift({
        label: 'Create Mock',
        className: 'btn btn-primary',
        onClick: () => createMockFromLog(logId),
      });
    }

    Modal.open(`Log Details: ${log.method} ${log.url}`, content, actions);
  } catch (error) {
    console.error('Error loading log details:', error);
    Toast.error('Failed to load log details');
  }
}

// Mock Form Modal
async function openMockFormModal(mockId = null) {
  const isEdit = !!mockId;
  let mock = null;

  if (isEdit) {
    try {
      const response = await fetch(`/api/mocks/${mockId}`);
      const data = await response.json();

      if (!data.success) {
        Toast.error('Failed to load mock details');
        return;
      }

      mock = data.data;
    } catch (error) {
      console.error('Error loading mock:', error);
      Toast.error('Failed to load mock details');
      return;
    }
  }

  const content = document.createElement('form');
  content.id = 'mock-form';
  content.innerHTML = `
    <div class="form-group">
      <label class="form-label">URL Pattern</label>
      <input type="text" name="url" class="form-control" value="${mock?.url || ''}" required placeholder="/api/users">
    </div>
    
    <div class="form-group">
      <label class="form-label">HTTP Method</label>
      <select name="method" class="form-control" required>
        <option value="GET" ${mock?.method === 'GET' ? 'selected' : ''}>GET</option>
        <option value="POST" ${mock?.method === 'POST' ? 'selected' : ''}>POST</option>
        <option value="PUT" ${mock?.method === 'PUT' ? 'selected' : ''}>PUT</option>
        <option value="PATCH" ${mock?.method === 'PATCH' ? 'selected' : ''}>PATCH</option>
        <option value="DELETE" ${mock?.method === 'DELETE' ? 'selected' : ''}>DELETE</option>
      </select>
    </div>
    
    <div class="form-group">
      <label class="form-label">Response Status Code</label>
      <input type="number" name="statusCode" class="form-control" value="${mock?.statusCode || 200}" required min="100" max="599">
    </div>
    
    <div class="form-group">
      <label class="form-label">Response Headers (JSON)</label>
      <textarea name="headers" class="form-control code-input" rows="4">${mock?.headers || '{"Content-Type": "application/json"}'}</textarea>
    </div>
    
    <div class="form-group">
      <label class="form-label">Response Body</label>
      <textarea name="body" class="form-control code-input" rows="8">${mock?.body || ''}</textarea>
    </div>
    
    <div class="form-group">
      <label class="form-check">
        <input type="checkbox" name="active" value="true" ${mock?.active !== false ? 'checked' : ''}>
        <span>Active</span>
      </label>
    </div>
  `;

  const actions = [
    { label: 'Cancel', onClick: () => Modal.close() },
    {
      label: isEdit ? 'Update Mock' : 'Create Mock',
      className: 'btn btn-primary',
      onClick: () => submitMockForm(mockId),
    },
  ];

  Modal.open(isEdit ? 'Edit Mock' : 'Create Mock', content, actions);
}

// Submit Mock Form
async function submitMockForm(mockId = null) {
  const form = document.getElementById('mock-form');
  const formData = new FormData(form);

  // Validate JSON fields
  try {
    const headers = formData.get('headers');
    if (headers) {
      JSON.parse(headers);
    }
  } catch (error) {
    Toast.error('Invalid JSON in headers field');
    return;
  }

  const data = {
    url: formData.get('url'),
    method: formData.get('method'),
    statusCode: parseInt(formData.get('statusCode')),
    headers: formData.get('headers'),
    body: formData.get('body'),
    active: formData.get('active') === 'true',
  };

  try {
    const url = mockId ? `/api/mocks/${mockId}` : '/api/mocks';
    const method = mockId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.success) {
      Toast.success(
        mockId ? 'Mock updated successfully!' : 'Mock created successfully!',
      );
      Modal.close();
      setTimeout(() => window.location.reload(), 1000);
    } else {
      Toast.error(result.error || 'Failed to save mock');
    }
  } catch (error) {
    console.error('Error saving mock:', error);
    Toast.error('Failed to save mock');
  }
}

// Mock Detail Modal
async function showMockDetailModal(mockId) {
  try {
    const response = await fetch(`/api/mocks/${mockId}`);
    const data = await response.json();

    if (!data.success) {
      Toast.error('Failed to load mock details');
      return;
    }

    const mock = data.data;

    const content = `
      <div class="mock-detail">
        <div class="detail-section">
          <h4>Basic Information</h4>
          <p><strong>Status:</strong> <span class="badge ${mock.active ? 'badge-success' : 'badge-secondary'}">${mock.active ? 'Active' : 'Inactive'}</span></p>
          <p><strong>Method:</strong> <span class="badge badge-method-${mock.method.toLowerCase()}">${mock.method}</span></p>
          <p><strong>URL Pattern:</strong> ${mock.url}</p>
          <p><strong>Response Code:</strong> <span class="badge badge-status-${Math.floor(mock.statusCode / 100)}xx">${mock.statusCode}</span></p>
        </div>
        
        <div class="detail-section">
          <h4>Response Headers</h4>
          <pre>${formatJSON(mock.headers)}</pre>
        </div>
        
        ${
          mock.body
            ? `
        <div class="detail-section">
          <h4>Response Body</h4>
          <pre>${formatJSON(mock.body)}</pre>
        </div>
        `
            : ''
        }
        
        <div class="detail-section">
          <h4>Metadata</h4>
          <p><strong>Created:</strong> ${new Date(mock.createdAt).toLocaleString()}</p>
          <p><strong>Updated:</strong> ${new Date(mock.updatedAt).toLocaleString()}</p>
        </div>
      </div>
    `;

    Modal.open(`Mock Details: ${mock.method} ${mock.url}`, content);
  } catch (error) {
    console.error('Error loading mock details:', error);
    Toast.error('Failed to load mock details');
  }
}

// Create Mock from Log
async function createMockFromLog(logId) {
  try {
    const response = await fetch(`/api/logs/${logId}/create-mock`, {
      method: 'POST',
    });

    const data = await response.json();

    if (data.success) {
      Toast.success('Mock created successfully from log!');
      Modal.close();
      setTimeout(() => {
        window.location.href = '/mocks';
      }, 1500);
    } else {
      Toast.error(data.error || 'Failed to create mock');
    }
  } catch (error) {
    console.error('Error creating mock from log:', error);
    Toast.error('Failed to create mock from log');
  }
}

// Helper: Format JSON
function formatJSON(str) {
  try {
    if (!str) return '';
    const obj = typeof str === 'string' ? JSON.parse(str) : str;
    return JSON.stringify(obj, null, 2);
  } catch {
    return str;
  }
}

// Form Enhancement - AJAX submission with progressive enhancement
function enhanceForms() {
  const forms = document.querySelectorAll('form[data-ajax]');

  forms.forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const method = form.method || 'POST';
      const action = form.action;

      try {
        const response = await fetch(action, {
          method,
          body: formData,
        });

        if (response.ok) {
          Toast.success('Operation completed successfully!');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          Toast.error('Operation failed');
        }
      } catch (error) {
        console.error('Form submission error:', error);
        Toast.error('Operation failed');
      }
    });
  });
}

// Real-Time Logs with SSE
const LogsRealTime = {
  eventSource: null,
  isActive: false,

  init() {
    // Check if we're on the logs page
    const logsTable = document.querySelector('.logs-table');
    if (!logsTable) return;

    this.connect();
  },

  connect() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource('/api/logs/stream');
    this.isActive = true;

    // Update status indicator
    this.updateStatusIndicator(true);

    this.eventSource.addEventListener('newLog', (event) => {
      const log = JSON.parse(event.data);
      this.addLogToTable(log);
    });

    this.eventSource.addEventListener('logUpdate', (event) => {
      const log = JSON.parse(event.data);
      this.updateLogInTable(log);
    });

    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      this.updateStatusIndicator(false);
      this.reconnect();
    };

    console.log('SSE connection established');
  },

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isActive = false;
      this.updateStatusIndicator(false);
    }
  },

  reconnect() {
    this.disconnect();
    setTimeout(() => {
      if (document.querySelector('.logs-table')) {
        console.log('Reconnecting to SSE...');
        this.connect();
      }
    }, 5000);
  },

  updateStatusIndicator(connected) {
    const indicator = document.getElementById('realtime-status');
    if (indicator) {
      if (connected) {
        indicator.classList.remove('disconnected');
      } else {
        indicator.classList.add('disconnected');
      }
    }
  },

  addLogToTable(log) {
    const tbody = document.querySelector('.logs-table tbody');
    if (!tbody) return;

    // Check if already exists
    const existingRow = document.getElementById(`log-${log.id}`);
    if (existingRow) {
      this.updateLogInTable(log);
      return;
    }

    // Create new row
    const row = this.createLogRow(log);

    // Insert at the beginning (most recent first)
    tbody.insertBefore(row, tbody.firstChild);

    // Add highlight animation
    row.classList.add('log-new');
    setTimeout(() => row.classList.remove('log-new'), 2000);

    // Remove last row if there are too many (limit 100)
    const rows = tbody.querySelectorAll('tr');
    if (rows.length > 100) {
      rows[rows.length - 1].remove();
    }
  },

  updateLogInTable(log) {
    const row = document.getElementById(`log-${log.id}`);
    if (!row) return;

    // Update specific cells
    const statusCell = row.querySelector('.log-status');
    const responseTimeCell = row.querySelector('.log-response-time');
    const actionsCell = row.querySelector('.log-actions');

    if (statusCell && log.responseStatus) {
      const statusClass = `badge badge-status-${Math.floor(log.responseStatus / 100)}xx`;
      statusCell.innerHTML = `<span class="${statusClass}">${log.responseStatus}</span>`;
    }

    if (responseTimeCell && log.responseTime) {
      responseTimeCell.textContent = `${log.responseTime}ms`;
    }

    if (actionsCell && log.responseStatus) {
      // Add create mock button if not present
      const createMockBtn = actionsCell.querySelector('.btn-create-mock');
      if (!createMockBtn) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/logs/${log.id}/create-mock`;
        form.style.display = 'inline';
        form.innerHTML = `
          <button type="submit" class="btn btn-sm btn-primary btn-create-mock">
            Create Mock
          </button>
        `;
        actionsCell.appendChild(form);
      }
    }

    // Add update animation
    row.classList.add('log-updated');
    setTimeout(() => row.classList.remove('log-updated'), 1000);
  },

  createLogRow(log) {
    const row = document.createElement('tr');
    row.id = `log-${log.id}`;

    const statusBadge = log.responseStatus
      ? `<span class="badge badge-status-${Math.floor(log.responseStatus / 100)}xx">${log.responseStatus}</span>`
      : '<span class="badge badge-warning">Pending</span>';

    const responseTime = log.responseTime ? `${log.responseTime}ms` : '-';

    const createMockButton = log.responseStatus
      ? `<form method="POST" action="/logs/${log.id}/create-mock" style="display: inline;">
           <button type="submit" class="btn btn-sm btn-primary btn-create-mock">Create Mock</button>
         </form>`
      : '';

    row.innerHTML = `
      <td>${new Date(log.timestamp).toLocaleString()}</td>
      <td><span class="badge badge-method-${log.method.toLowerCase()}">${log.method}</span></td>
      <td class="truncate" title="${log.url}">${log.url}</td>
      <td class="log-status">${statusBadge}</td>
      <td class="log-response-time">${responseTime}</td>
      <td class="log-actions">
        <button class="btn btn-sm btn-secondary" onclick="showLogModal('${log.id}')">View</button>
        ${createMockButton}
      </td>
    `;

    return row;
  },
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Show toast for query parameters
  const params = new URLSearchParams(window.location.search);
  const success = params.get('success');
  const error = params.get('error');

  if (success) {
    Toast.success(getSuccessMessage(success));
  }

  if (error) {
    Toast.error(getErrorMessage(error));
  }

  // Enhance forms
  enhanceForms();

  // Initialize real-time logs
  LogsRealTime.init();

  // ESC key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      Modal.close();
    }
  });
});

// Disconnect SSE when leaving the page
window.addEventListener('beforeunload', () => {
  LogsRealTime.disconnect();
});

// Modal for clearing logs
function showClearLogsModal() {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="clear-logs-form">
      <p><strong>⚠️ Warning:</strong> This action cannot be undone.</p>
      
      <div class="form-group">
        <label class="form-label">Clear options:</label>
        <div class="radio-group">
          <label class="form-check">
            <input type="radio" name="clearType" value="all" checked>
            <span>Clear all logs</span>
          </label>
          <label class="form-check">
            <input type="radio" name="clearType" value="old">
            <span>Clear logs older than:</span>
          </label>
        </div>
      </div>

      <div class="form-group" id="days-input-group" style="display: none;">
        <label class="form-label">Days to keep:</label>
        <input type="number" id="days-input" class="form-control" 
               value="7" min="1" placeholder="7">
      </div>
    </div>
  `;

  // Toggle visibility of days input
  const radios = content.querySelectorAll('input[name="clearType"]');
  const daysGroup = content.querySelector('#days-input-group');

  radios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'old') {
        daysGroup.style.display = 'block';
      } else {
        daysGroup.style.display = 'none';
      }
    });
  });

  const actions = [
    {
      label: 'Cancel',
      className: 'btn btn-secondary',
      onClick: () => Modal.close(),
    },
    {
      label: 'Clear Logs',
      className: 'btn btn-danger',
      onClick: () => confirmClearLogs(content),
    },
  ];

  Modal.open('Clear Request Logs', content, actions);
}

async function confirmClearLogs(formContainer) {
  const clearType = formContainer.querySelector(
    'input[name="clearType"]:checked',
  ).value;
  const daysInput = formContainer.querySelector('#days-input');

  let url = '/api/logs';
  if (clearType === 'old' && daysInput) {
    const days = parseInt(daysInput.value, 10);
    if (days > 0) {
      url += `?days=${days}`;
    }
  }

  try {
    const response = await fetch(url, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (data.success) {
      Toast.success(`${data.count} log(s) cleared successfully!`);
      Modal.close();
      setTimeout(() => window.location.reload(), 1000);
    } else {
      Toast.error(data.error || 'Failed to clear logs');
    }
  } catch (error) {
    console.error('Error clearing logs:', error);
    Toast.error('Failed to clear logs');
  }
}

function getSuccessMessage(key) {
  const messages = {
    'mock-created': 'Mock created successfully!',
    'mock-updated': 'Mock updated successfully!',
    'mock-deleted': 'Mock deleted successfully!',
    'mock-toggled': 'Mock status toggled successfully!',
    'logs-cleared': 'Logs cleared successfully!',
    saved: 'Settings saved successfully!',
  };
  return messages[key] || 'Operation completed successfully!';
}

function getErrorMessage(key) {
  const messages = {
    'missing-fields': 'Missing required fields',
    'failed-to-create': 'Failed to create mock',
    'failed-to-update': 'Failed to update mock',
    'failed-to-delete': 'Failed to delete mock',
    'failed-to-toggle': 'Failed to toggle mock status',
    'mock-not-found': 'Mock not found',
    'failed-to-create-mock': 'Failed to create mock from log',
    'failed-to-clear-logs': 'Failed to clear logs',
    failed: 'Operation failed',
  };
  return messages[key] || 'An error occurred';
}
