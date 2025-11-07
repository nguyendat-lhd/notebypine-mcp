class NoteByPineAPI {
    constructor() {
        this.baseURL = 'http://localhost:3000/api/v1';
        this.token = localStorage.getItem('authToken') || null;
        this.ws = null;
    }

    // Authentication
    async login(email, password) {
        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (data.success) {
                this.token = data.token;
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                return data;
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        if (this.ws) {
            this.ws.close();
        }
    }

    isAuthenticated() {
        return !!this.token;
    }

    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    // Helper method for authenticated requests
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // Incidents
    async getIncidents(page = 1, limit = 20) {
        return this.request(`/incidents?page=${page}&limit=${limit}`);
    }

    async getIncident(id) {
        return this.request(`/incidents/${id}`);
    }

    async createIncident(incidentData) {
        return this.request('/incidents', {
            method: 'POST',
            body: JSON.stringify(incidentData)
        });
    }

    async updateIncident(id, incidentData) {
        return this.request(`/incidents/${id}`, {
            method: 'PUT',
            body: JSON.stringify(incidentData)
        });
    }

    async deleteIncident(id) {
        return this.request(`/incidents/${id}`, {
            method: 'DELETE'
        });
    }

    async getIncidentStats() {
        return this.request('/incidents/stats/summary');
    }

    // Solutions
    async getSolutions(page = 1, limit = 20) {
        return this.request(`/solutions?page=${page}&limit=${limit}`);
    }

    async getSolution(id) {
        return this.request(`/solutions/${id}`);
    }

    async createSolution(solutionData) {
        return this.request('/solutions', {
            method: 'POST',
            body: JSON.stringify(solutionData)
        });
    }

    async updateSolution(id, solutionData) {
        return this.request(`/solutions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(solutionData)
        });
    }

    async deleteSolution(id) {
        return this.request(`/solutions/${id}`, {
            method: 'DELETE'
        });
    }

    // Knowledge Base
    async getKnowledgeItems(page = 1, limit = 50) {
        return this.request(`/knowledge?page=${page}&limit=${limit}`);
    }

    async getKnowledgeItem(id) {
        return this.request(`/knowledge/${id}`);
    }

    async createKnowledgeItem(itemData) {
        return this.request('/knowledge', {
            method: 'POST',
            body: JSON.stringify(itemData)
        });
    }

    async updateKnowledgeItem(id, itemData) {
        return this.request(`/knowledge/${id}`, {
            method: 'PUT',
            body: JSON.stringify(itemData)
        });
    }

    async deleteKnowledgeItem(id) {
        return this.request(`/knowledge/${id}`, {
            method: 'DELETE'
        });
    }

    // Search
    async searchIncidents(query, page = 1, limit = 20) {
        return this.request(`/search/incidents?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    }

    async searchSolutions(query, page = 1, limit = 20) {
        return this.request(`/search/solutions?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    }

    async searchKnowledge(query, page = 1, limit = 50) {
        return this.request(`/search/knowledge?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    }

    async searchAll(query, type = 'all', page = 1, limit = 20) {
        return this.request(`/search?q=${encodeURIComponent(query)}&type=${type}&page=${page}&limit=${limit}`);
    }

    // ChatOps
    async sendChatMessage(message) {
        return this.request('/chat/message', {
            method: 'POST',
            body: JSON.stringify({ message })
        });
    }

    async getChatHistory() {
        return this.request('/chat/history');
    }

    async getChatHelp() {
        return this.request('/chat/help');
    }

    // File Upload
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        return this.request('/upload/single', {
            method: 'POST',
            headers: {}, // Let browser set Content-Type for FormData
            body: formData
        });
    }

    async uploadFiles(files) {
        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('files', file);
        });

        return this.request('/upload/multiple', {
            method: 'POST',
            headers: {}, // Let browser set Content-Type for FormData
            body: formData
        });
    }

    // Health Check
    async getHealthStatus() {
        return this.request('/health/status');
    }

    async getSystemInfo() {
        return this.request('/health/info');
    }

    // WebSocket connection
    connectWebSocket() {
        if (this.ws) {
            this.ws.close();
        }

        this.ws = new WebSocket('ws://localhost:3000/ws');

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            // Authenticate if we have a token
            if (this.token) {
                this.ws.send(JSON.stringify({
                    type: 'authenticate',
                    data: {
                        token: this.token,
                        userId: this.getCurrentUser()?.id
                    }
                }));
            }
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            // Try to reconnect after 5 seconds
            setTimeout(() => this.connectWebSocket(), 5000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    handleWebSocketMessage(message) {
        // Emit custom events for different message types
        const event = new CustomEvent(`ws-${message.type}`, {
            detail: message
        });
        document.dispatchEvent(event);
    }

    // Subscribe to real-time updates
    subscribeToUpdates() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                data: {
                    channels: ['incident_created', 'incident_updated', 'solution_created', 'chat_message']
                }
            }));
        }
    }
}

// Global API instance
window.api = new NoteByPineAPI();

// Auto-connect WebSocket when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.api.isAuthenticated()) {
        window.api.connectWebSocket();
    }
});

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NoteByPineAPI;
}