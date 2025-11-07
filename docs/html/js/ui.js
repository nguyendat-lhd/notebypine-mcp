class NoteByPineUI {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupAuthentication();
        this.setupWebSocketListeners();
        this.setupSearch();
        this.loadDashboard();
    }

    // Navigation
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.showPage(page);
            });
        });
    }

    showPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
        });

        // Show selected page
        const selectedPage = document.getElementById(`${pageName}-page`);
        if (selectedPage) {
            selectedPage.style.display = 'block';
            this.currentPage = pageName;
            this.updateActiveNav(pageName);
            this.loadPageContent(pageName);
        }
    }

    updateActiveNav(pageName) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = document.querySelector(`[data-page="${pageName}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    loadPageContent(pageName) {
        switch (pageName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'incidents':
                this.loadIncidents();
                this.setupIncidentForm();
                break;
            case 'solutions':
                this.loadSolutions();
                break;
            case 'knowledge':
                this.loadKnowledge();
                break;
            case 'chat':
                this.loadChat();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            incidents: 'Incidents',
            solutions: 'Solutions',
            knowledge: 'Knowledge Base',
            chat: 'ChatOps',
            settings: 'Settings'
        };
        document.getElementById('page-title').textContent = titles[pageName] || 'Dashboard';
    }

    // Authentication
    setupAuthentication() {
        const loginForm = document.getElementById('login-form');
        const logoutBtn = document.getElementById('logout-btn');

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Check if already authenticated
        if (window.api.isAuthenticated()) {
            this.showMainApp();
        } else {
            this.showLoginForm();
        }
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('login-btn');
        const errorMsg = document.getElementById('login-error');

        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        errorMsg.style.display = 'none';

        try {
            await window.api.login(email, password);
            this.showMainApp();
            window.api.connectWebSocket();
        } catch (error) {
            errorMsg.textContent = error.message;
            errorMsg.style.display = 'block';
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    }

    handleLogout() {
        window.api.logout();
        this.showLoginForm();
    }

    showLoginForm() {
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        const user = window.api.getCurrentUser();
        if (user) {
            document.getElementById('user-name').textContent = user.name || user.email;
        }
        this.loadDashboard();
    }

    // Dashboard
    async loadDashboard() {
        try {
            const [stats, health] = await Promise.all([
                window.api.getIncidentStats(),
                window.api.getHealthStatus()
            ]);

            this.updateDashboardStats(stats.data);
            this.updateSystemHealth(health);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('total-incidents').textContent = stats.incidents || 0;
        document.getElementById('total-solutions').textContent = stats.solutions || 0;
        document.getElementById('total-knowledge').textContent = stats.knowledgeBase || 0;
        document.getElementById('recent-incidents').textContent = stats.recent?.length || 0;
        document.getElementById('high-severity').textContent = stats.highSeverity?.length || 0;
    }

    updateSystemHealth(health) {
        const statusElement = document.getElementById('system-status');
        if (health.status === 'healthy') {
            statusElement.textContent = '✅ All systems operational';
            statusElement.className = 'status-healthy';
        } else {
            statusElement.textContent = '❌ System issues detected';
            statusElement.className = 'status-unhealthy';
        }

        // Update additional system info
        if (health.uptime) {
            document.getElementById('server-uptime').textContent = health.uptime;
        }
        if (health.memory && health.memory.heapUsed) {
            document.getElementById('memory-usage').textContent = health.memory.heapUsed;
        }
        if (health.database && health.database.status) {
            document.getElementById('db-status').textContent = health.database.status;
        }
    }

    // Incidents
    async loadIncidents() {
        try {
            const response = await window.api.getIncidents();
            this.renderIncidents(response.data);
        } catch (error) {
            console.error('Failed to load incidents:', error);
            this.showError('Failed to load incidents');
        }
    }

    renderIncidents(incidents) {
        const container = document.getElementById('incidents-list');
        if (!container) return;

        if (incidents.length === 0) {
            container.innerHTML = '<p class="no-data">No incidents found</p>';
            return;
        }

        container.innerHTML = incidents.map(incident => `
            <div class="incident-card" data-id="${incident.id}">
                <div class="incident-header">
                    <h3 class="incident-title">${incident.title}</h3>
                    <span class="severity-badge severity-${incident.severity}">${incident.severity}</span>
                </div>
                <p class="incident-description">${incident.description}</p>
                <div class="incident-meta">
                    <span class="status-badge status-${incident.status}">${incident.status}</span>
                    <span class="incident-date">${new Date(incident.created).toLocaleDateString()}</span>
                </div>
                <div class="incident-actions">
                    <button class="btn btn-sm btn-primary" onclick="ui.editIncident('${incident.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="ui.deleteIncident('${incident.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async createIncident() {
        const title = document.getElementById('incident-title').value;
        const description = document.getElementById('incident-description').value;
        const severity = document.getElementById('incident-severity').value;

        if (!title || !description) {
            this.showError('Please fill in all required fields');
            return;
        }

        try {
            await window.api.createIncident({
                title,
                description,
                severity,
                status: 'new'
            });

            // Clear form
            document.getElementById('incident-title').value = '';
            document.getElementById('incident-description').value = '';
            document.getElementById('incident-severity').value = 'medium';

            // Reload incidents
            this.loadIncidents();
            this.showSuccess('Incident created successfully');
        } catch (error) {
            console.error('Failed to create incident:', error);
            this.showError('Failed to create incident');
        }
    }

    async deleteIncident(id) {
        if (!confirm('Are you sure you want to delete this incident?')) {
            return;
        }

        try {
            await window.api.deleteIncident(id);
            this.loadIncidents();
            this.showSuccess('Incident deleted successfully');
        } catch (error) {
            console.error('Failed to delete incident:', error);
            this.showError('Failed to delete incident');
        }
    }

    setupIncidentForm() {
        const incidentForm = document.getElementById('incident-form');
        if (incidentForm) {
            incidentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.createIncident();
            });
        }
    }

    editIncident(id) {
        // TODO: Implement edit incident functionality
        this.showNotification('Edit incident functionality coming soon', 'info');
    }

    editSolution(id) {
        // TODO: Implement edit solution functionality
        this.showNotification('Edit solution functionality coming soon', 'info');
    }

    deleteSolution(id) {
        // TODO: Implement delete solution functionality
        this.showNotification('Delete solution functionality coming soon', 'info');
    }

    editKnowledge(id) {
        // TODO: Implement edit knowledge functionality
        this.showNotification('Edit knowledge functionality coming soon', 'info');
    }

    deleteKnowledge(id) {
        // TODO: Implement delete knowledge functionality
        this.showNotification('Delete knowledge functionality coming soon', 'info');
    }

    loadSettings() {
        // TODO: Implement settings page functionality
        console.log('Settings page loaded');
    }

    // Solutions
    async loadSolutions() {
        try {
            const response = await window.api.getSolutions();
            this.renderSolutions(response.data);
        } catch (error) {
            console.error('Failed to load solutions:', error);
            this.showError('Failed to load solutions');
        }
    }

    renderSolutions(solutions) {
        const container = document.getElementById('solutions-list');
        if (!container) return;

        if (solutions.length === 0) {
            container.innerHTML = '<p class="no-data">No solutions found</p>';
            return;
        }

        container.innerHTML = solutions.map(solution => `
            <div class="solution-card" data-id="${solution.id}">
                <h3 class="solution-title">${solution.title}</h3>
                <p class="solution-description">${solution.description}</p>
                ${solution.steps ? `
                    <div class="solution-steps">
                        <h4>Steps:</h4>
                        <ol>
                            ${solution.steps.map(step => `<li>${step}</li>`).join('')}
                        </ol>
                    </div>
                ` : ''}
                <div class="solution-actions">
                    <button class="btn btn-sm btn-primary" onclick="ui.editSolution('${solution.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="ui.deleteSolution('${solution.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    // Knowledge Base
    async loadKnowledge() {
        try {
            const response = await window.api.getKnowledgeItems();
            this.renderKnowledge(response.data);
        } catch (error) {
            console.error('Failed to load knowledge base:', error);
            this.showError('Failed to load knowledge base');
        }
    }

    renderKnowledge(items) {
        const container = document.getElementById('knowledge-list');
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = '<p class="no-data">No knowledge items found</p>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="knowledge-card" data-id="${item.id}">
                <h3 class="knowledge-title">${item.title}</h3>
                <p class="knowledge-content">${item.content}</p>
                <div class="knowledge-meta">
                    <span class="category-badge">${item.category}</span>
                    <span class="knowledge-date">${new Date(item.created).toLocaleDateString()}</span>
                </div>
                <div class="knowledge-actions">
                    <button class="btn btn-sm btn-primary" onclick="ui.editKnowledge('${item.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="ui.deleteKnowledge('${item.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    // Chat
    async loadChat() {
        try {
            const help = await window.api.getChatHelp();
            this.renderChatHelp(help.data);
        } catch (error) {
            console.error('Failed to load chat help:', error);
        }
        this.setupChatInterface();
    }

    renderChatHelp(helpData) {
        const helpContainer = document.getElementById('chat-help');
        if (helpContainer) {
            helpContainer.innerHTML = `
                <div class="chat-help">
                    <h3>Available Commands</h3>
                    <ul class="command-list">
                        ${helpData.commands.map(cmd => `
                            <li>
                                <strong>${cmd.command}</strong><br>
                                <em>${cmd.description}</em><br>
                                <code>Example: ${cmd.example}</code>
                            </li>
                        `).join('')}
                    </ul>
                    <p><em>${helpData.naturalLanguage}</em></p>
                </div>
            `;
        }
    }

    setupChatInterface() {
        const chatForm = document.getElementById('chat-form');
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');

        if (chatForm) {
            chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const message = chatInput.value.trim();
                if (!message) return;

                // Add user message to chat
                this.addChatMessage(message, 'user');
                chatInput.value = '';

                try {
                    const response = await window.api.sendChatMessage(message);
                    this.addChatMessage(response.data.response, 'assistant', response.data.intent);
                } catch (error) {
                    this.addChatMessage('Sorry, I encountered an error. Please try again.', 'assistant', 'error');
                }
            });
        }
    }

    addChatMessage(message, sender, intent = '') {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        messageDiv.innerHTML = `
            <div class="message-content">${message}</div>
            ${intent ? `<div class="message-intent">${intent}</div>` : ''}
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        `;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Search
    setupSearch() {
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }
    }

    async performSearch() {
        const query = document.getElementById('search-input').value.trim();
        if (!query) return;

        try {
            const results = await window.api.searchAll(query);
            this.renderSearchResults(results.data);
        } catch (error) {
            console.error('Search failed:', error);
            this.showError('Search failed');
        }
    }

    renderSearchResults(results) {
        const container = document.getElementById('search-results');
        if (!container) return;

        let html = `<h3>Search Results for "${results.query}" (${results.total} found)</h3>`;

        if (results.results.incidents?.length > 0) {
            html += '<div class="search-section"><h4>Incidents</h4>';
            html += results.results.incidents.map(incident => `
                <div class="search-item">
                    <strong>${incident.title}</strong>
                    <p>${incident.description ? incident.description.substring(0, 100) + '...' : 'No description'}</p>
                </div>
            `).join('');
            html += '</div>';
        }

        if (results.results.solutions?.length > 0) {
            html += '<div class="search-section"><h4>Solutions</h4>';
            html += results.results.solutions.map(solution => `
                <div class="search-item">
                    <strong>${solution.title}</strong>
                    <p>${solution.description ? solution.description.substring(0, 100) + '...' : 'No description'}</p>
                </div>
            `).join('');
            html += '</div>';
        }

        if (results.results.knowledge?.length > 0) {
            html += '<div class="search-section"><h4>Knowledge Base</h4>';
            html += results.results.knowledge.map(item => `
                <div class="search-item">
                    <strong>${item.title}</strong>
                    <p>${item.content ? item.content.substring(0, 100) + '...' : 'No content'}</p>
                </div>
            `).join('');
            html += '</div>';
        }

        container.innerHTML = html || '<p>No results found</p>';
        container.style.display = 'block';

        // Hide current page and show search results
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
        });
        document.getElementById('search-results').style.display = 'block';
    }

    // WebSocket listeners
    setupWebSocketListeners() {
        document.addEventListener('ws-incident_created', (e) => {
            this.showNotification('New incident created', 'info');
            if (this.currentPage === 'incidents') {
                this.loadIncidents();
            }
        });

        document.addEventListener('ws-incident_updated', (e) => {
            this.showNotification('Incident updated', 'info');
            if (this.currentPage === 'incidents') {
                this.loadIncidents();
            }
        });

        document.addEventListener('ws-solution_created', (e) => {
            this.showNotification('New solution created', 'success');
            if (this.currentPage === 'solutions') {
                this.loadSolutions();
            }
        });

        document.addEventListener('ws-chat_message', (e) => {
            if (this.currentPage === 'chat') {
                this.addChatMessage(e.detail.data.response, 'assistant', e.detail.data.intent);
            }
        });
    }

    // Utilities
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '1000';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.color = 'white';

        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#10b981';
                break;
            case 'error':
                notification.style.backgroundColor = '#ef4444';
                break;
            case 'info':
                notification.style.backgroundColor = '#3b82f6';
                break;
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ui = new NoteByPineUI();
});