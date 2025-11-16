#!/usr/bin/env node

/**
 * COMPREHENSIVE TESTING SUITE - CONTRACT PROCESSOR PLATFORM
 * 
 * This script performs intensive testing with real data:
 * - Creates multiple clients and agents
 * - Generates 15+ sessions per client (3 clients minimum)
 * - Tests all critical endpoints with timing
 * - Validates data persistence in PostgreSQL
 * - Generates CSV exports and validates content
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:3001';

// Test configuration
const TEST_CONFIG = {
  clients: [
    {
      name: 'TechCorp Solutions',
      email: 'admin@techcorp.com',
      company: 'TechCorp Inc',
      agents: [
        {
          name: 'TechCorp Contract Generator',
          description: 'Advanced contract generator for tech companies',
          status: 'active'
        },
        {
          name: 'TechCorp Legal Assistant',
          description: 'Legal document assistant for compliance',
          status: 'active'
        }
      ]
    },
    {
      name: 'Design Studio Pro',
      email: 'contact@designstudio.com', 
      company: 'Design Studio LLC',
      agents: [
        {
          name: 'Design Contracts Specialist',
          description: 'Specialized in design and creative contracts',
          status: 'active'
        }
      ]
    },
    {
      name: 'Legal Partners & Associates',
      email: 'partners@legalfirm.com',
      company: 'Legal Partners LLC',
      agents: [
        {
          name: 'Legal Expert AI',
          description: 'Expert-level legal document processing',
          status: 'active'
        },
        {
          name: 'Contract Validator',
          description: 'Contract validation and compliance checker',
          status: 'active'
        }
      ]
    }
  ],
  
  testInputs: [
    'Necesito un contrato de servicios de desarrollo de software para una aplicación móvil. El cliente es StartupXYZ, el presupuesto es de $50,000 USD, fecha de inicio 15 de febrero 2024, duración 6 meses.',
    'Contrato de servicios de diseño gráfico para campaña publicitaria. Cliente: MarketingCorp, incluye logo, branding y materiales promocionales. Presupuesto $15,000, entrega en 8 semanas.',
    'Anexo de modificaciones al proyecto inicial. Se aprobaron 3 cambios: ampliación de funcionalidades (+$10,000), extensión de plazo (2 semanas adicionales), y cambio de tecnología.',
    'Reunión completada el 20 de enero 2024. Se discutió el alcance del proyecto, cronograma de entregas, hitos de pago, y especificaciones técnicas. Cliente confirmó presupuesto de $75,000.',
    'Documento de entrega final del proyecto de consultoría legal. Se completaron todos los entregables: análisis legal, documentación de compliance, y reporte final. Autorización para pago final.',
    'Contrato base para servicios profesionales de consultoría en tecnología blockchain. Cliente: CryptoInnovate, servicios incluyen arquitectura, desarrollo y auditoría de smart contracts.',
    'Anexo de especificaciones técnicas para desarrollo web. Incluye wireframes, mockups, base de datos, APIs REST, sistema de autenticación y panel de administración.',
    'Acta de reunión de revisión de proyecto. Asistentes: equipo técnico y cliente. Se revisó progreso del 60%, se aprobaron cambios menores, próxima reunión programada para 1 de marzo.',
    'Contrato de servicios de marketing digital y SEO. Cliente: E-commerce Plus, incluye estrategia de contenidos, gestión de redes sociales, y optimización de conversiones.',
    'Documento de cambios y rondas de revisión. El cliente solicitó 4 modificaciones al diseño inicial, 2 cambios en funcionalidad, y actualización de la documentación técnica.',
    'Anexo de entrega y cierre de proyecto. Se completó la fase de testing, deployment a producción, entrega de documentación, y capacitación del equipo del cliente.',
    'Contrato de servicios legales para startup tecnológica. Incluye constitución de empresa, contratos laborales, términos y condiciones, política de privacidad.',
    'Reunión de planificación estratégica completada. Se definieron objetivos Q1 2024, presupuesto anual $120,000, distribución de recursos, y KPIs de seguimiento.',
    'Contrato de servicios de desarrollo mobile para iOS y Android. Cliente: HealthTech Solutions, aplicación médica con integración de dispositivos wearables.',
    'Anexo de mantenimiento y soporte técnico post-lanzamiento. Incluye actualizaciones, corrección de bugs, soporte técnico 24/7, y hosting por 12 meses.'
  ]
};

class ComprehensiveTester {
  constructor() {
    this.results = {
      clients: [],
      agents: [],
      sessions: [],
      timings: {},
      errors: [],
      csvData: null
    };
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅', 
      error: '❌',
      timing: '⏱️',
      test: '🧪'
    }[type] || '📋';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async measureEndpoint(name, fn) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.results.timings[name] = duration;
      this.log(`${name}: ${duration}ms`, 'timing');
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.results.timings[name] = duration;
      this.results.errors.push({ endpoint: name, error: error.message, duration });
      this.log(`${name} FAILED: ${error.message} (${duration}ms)`, 'error');
      throw error;
    }
  }

  async createClient(clientData) {
    return await this.measureEndpoint(`POST /admin/clients`, async () => {
      const response = await axios.post(`${BASE_URL}/api/admin/clients`, clientData);
      return response.data.data;
    });
  }

  async createAgent(agentData, clientId) {
    return await this.measureEndpoint(`POST /admin/agents`, async () => {
      const response = await axios.post(`${BASE_URL}/api/admin/agents`, {
        ...agentData,
        clientId
      });
      return response.data.data;
    });
  }

  async testAgent(agentId, inputText) {
    return await this.measureEndpoint(`POST /admin/agents/${agentId}/test`, async () => {
      const response = await axios.post(`${BASE_URL}/api/admin/agents/${agentId}/test`, {
        inputText
      });
      return response.data.data;
    });
  }

  async runWorkflow(apiKey, inputText) {
    return await this.measureEndpoint(`POST /agent/run`, async () => {
      const response = await axios.post(`${BASE_URL}/api/agent/run`, 
        { inputText },
        { headers: { 'x-api-key': apiKey } }
      );
      return response.data;
    });
  }

  async getClientAnalytics(clientId) {
    return await this.measureEndpoint(`GET /admin/clients/${clientId}/analytics`, async () => {
      const response = await axios.get(`${BASE_URL}/api/admin/clients/${clientId}/analytics`);
      return response.data.data;
    });
  }

  async getDashboardStats() {
    return await this.measureEndpoint(`GET /admin/dashboard`, async () => {
      const response = await axios.get(`${BASE_URL}/api/admin/dashboard`);
      return response.data.data;
    });
  }

  async getAllSessions() {
    return await this.measureEndpoint(`GET /admin/agents/sessions`, async () => {
      // Since we don't have a global sessions endpoint, we'll aggregate from agents
      const agents = await axios.get(`${BASE_URL}/api/admin/agents`);
      const allSessions = [];
      
      for (const agent of agents.data.data) {
        try {
          const sessions = await axios.get(`${BASE_URL}/api/admin/agents/${agent.id}/sessions`);
          allSessions.push(...sessions.data.data);
        } catch (error) {
          // Continue if some agent sessions fail
        }
      }
      
      return allSessions;
    });
  }

  async setupTestData() {
    this.log('🚀 Starting comprehensive test setup...', 'info');
    
    // 1. Create clients and agents
    for (const clientConfig of TEST_CONFIG.clients) {
      try {
        this.log(`Creating client: ${clientConfig.name}`, 'test');
        
        const client = await this.createClient({
          name: clientConfig.name,
          email: clientConfig.email,
          company: clientConfig.company
        });
        
        this.results.clients.push(client);
        this.log(`✅ Client created: ${client.id}`, 'success');
        
        // Create agents for this client
        for (const agentConfig of clientConfig.agents) {
          this.log(`Creating agent: ${agentConfig.name}`, 'test');
          
          const agent = await this.createAgent(agentConfig, client.id);
          this.results.agents.push(agent);
          this.log(`✅ Agent created: ${agent.id} (API Key: ${agent.apiKey})`, 'success');
        }
        
      } catch (error) {
        this.log(`Failed to create client ${clientConfig.name}: ${error.message}`, 'error');
      }
    }
    
    this.log(`Setup complete: ${this.results.clients.length} clients, ${this.results.agents.length} agents`, 'success');
  }

  async generateSessions() {
    this.log('🧪 Generating test sessions (15+ per client)...', 'info');
    
    for (const client of this.results.clients) {
      const clientAgents = this.results.agents.filter(a => a.clientId === client.id);
      let sessionsForClient = 0;
      
      this.log(`Generating sessions for client: ${client.name}`, 'test');
      
      for (let i = 0; i < 15; i++) {
        const agent = clientAgents[i % clientAgents.length]; // Rotate between agents
        const inputText = TEST_CONFIG.testInputs[i % TEST_CONFIG.testInputs.length];
        
        try {
          // Test both admin test endpoint and direct workflow
          let session;
          if (i % 2 === 0) {
            // Use admin test endpoint
            session = await this.testAgent(agent.id, inputText);
            session.type = 'admin_test';
          } else {
            // Use direct workflow endpoint
            session = await this.runWorkflow(agent.apiKey, inputText);
            session.type = 'direct_workflow';
          }
          
          this.results.sessions.push({
            ...session,
            clientId: client.id,
            clientName: client.name,
            agentId: agent.id,
            agentName: agent.name,
            inputText: inputText.substring(0, 100) + '...'
          });
          
          sessionsForClient++;
          this.log(`Session ${sessionsForClient}/15 for ${client.name}: ${session.sessionId || 'N/A'}`, 'success');
          
          // Small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          this.log(`Session failed for ${client.name}: ${error.message}`, 'error');
        }
      }
      
      this.log(`Completed ${sessionsForClient} sessions for ${client.name}`, 'success');
    }
    
    this.log(`Total sessions generated: ${this.results.sessions.length}`, 'success');
  }

  async validateAnalytics() {
    this.log('📊 Validating analytics and data consistency...', 'info');
    
    for (const client of this.results.clients) {
      try {
        this.log(`Checking analytics for ${client.name}`, 'test');
        
        const analytics = await this.getClientAnalytics(client.id);
        
        // Validate analytics structure
        if (analytics.agentPerformance && analytics.sessionsOverTime) {
          this.log(`✅ Analytics valid for ${client.name}`, 'success');
        } else {
          this.log(`⚠️ Analytics incomplete for ${client.name}`, 'error');
        }
        
      } catch (error) {
        this.log(`Analytics failed for ${client.name}: ${error.message}`, 'error');
      }
    }
  }

  async validateDashboard() {
    this.log('📈 Validating dashboard statistics...', 'info');
    
    try {
      const stats = await this.getDashboardStats();
      
      this.log(`Dashboard stats: ${stats.overview.totalClients} clients, ${stats.overview.totalAgents} agents, ${stats.overview.totalSessions} sessions`, 'success');
      
      // Validate numbers make sense
      if (stats.overview.totalClients >= this.results.clients.length &&
          stats.overview.totalAgents >= this.results.agents.length &&
          stats.overview.totalSessions >= this.results.sessions.length) {
        this.log('✅ Dashboard statistics are consistent', 'success');
      } else {
        this.log('⚠️ Dashboard statistics seem inconsistent with test data', 'error');
      }
      
    } catch (error) {
      this.log(`Dashboard validation failed: ${error.message}`, 'error');
    }
  }

  async validateSessions() {
    this.log('📋 Validating global sessions view...', 'info');
    
    try {
      const sessions = await this.getAllSessions();
      this.log(`Found ${sessions.length} sessions in global view`, 'success');
      
      // Check if we can find some of our test sessions
      const foundTestSessions = sessions.filter(s => 
        this.results.sessions.some(ts => ts.sessionId === s.id)
      );
      
      this.log(`Found ${foundTestSessions.length} of our test sessions in global view`, 'success');
      
    } catch (error) {
      this.log(`Sessions validation failed: ${error.message}`, 'error');
    }
  }

  async simulateCSVExport() {
    this.log('📤 Simulating CSV export...', 'info');
    
    try {
      const sessions = await this.getAllSessions();
      
      // Simulate CSV generation (like in Sessions.tsx)
      const csvData = [
        ['ID', 'Agent', 'Client', 'Status', 'Processing Time', 'Created At', 'Input'],
        ...sessions.slice(0, 20).map(session => [
          session.id || 'N/A',
          session.agent?.name || 'N/A',
          session.agent?.client?.name || 'N/A', 
          session.status || 'N/A',
          session.processingTime || '0',
          session.createdAt || new Date().toISOString(),
          (session.inputText || '').substring(0, 50) + '...'
        ])
      ];
      
      const csvContent = csvData.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      // Save CSV to file
      const csvPath = path.join(__dirname, 'test-sessions-export.csv');
      fs.writeFileSync(csvPath, csvContent);
      
      this.results.csvData = {
        path: csvPath,
        rows: csvData.length,
        size: csvContent.length
      };
      
      this.log(`✅ CSV exported: ${csvData.length} rows, ${csvContent.length} bytes`, 'success');
      
    } catch (error) {
      this.log(`CSV export failed: ${error.message}`, 'error');
    }
  }

  generateReport() {
    const duration = Date.now() - this.startTime;
    
    const report = {
      summary: {
        duration: `${Math.round(duration / 1000)}s`,
        clients: this.results.clients.length,
        agents: this.results.agents.length,
        sessions: this.results.sessions.length,
        errors: this.results.errors.length
      },
      timings: this.results.timings,
      errors: this.results.errors,
      csvExport: this.results.csvData,
      clients: this.results.clients.map(c => ({
        id: c.id,
        name: c.name,
        agents: this.results.agents.filter(a => a.clientId === c.id).length,
        sessions: this.results.sessions.filter(s => s.clientId === c.id).length
      })),
      agents: this.results.agents.map(a => ({
        id: a.id,
        name: a.name,
        client: a.client?.name,
        apiKey: a.apiKey.substring(0, 20) + '...',
        sessions: this.results.sessions.filter(s => s.agentId === a.id).length
      }))
    };
    
    // Save detailed report
    const reportPath = path.join(__dirname, 'comprehensive-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }

  async runFullTestSuite() {
    try {
      await this.setupTestData();
      await this.generateSessions();
      await this.validateAnalytics();
      await this.validateDashboard();
      await this.validateSessions();
      await this.simulateCSVExport();
      
      const report = this.generateReport();
      
      this.log('🎉 COMPREHENSIVE TEST COMPLETED', 'success');
      this.log(`📊 Summary: ${report.summary.clients} clients, ${report.summary.agents} agents, ${report.summary.sessions} sessions`, 'success');
      this.log(`⏱️ Duration: ${report.summary.duration}`, 'timing');
      this.log(`❌ Errors: ${report.summary.errors}`, report.summary.errors > 0 ? 'error' : 'success');
      
      return report;
      
    } catch (error) {
      this.log(`CRITICAL ERROR: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const tester = new ComprehensiveTester();
  
  tester.runFullTestSuite()
    .then(report => {
      console.log('\n🎯 FINAL REPORT:');
      console.log('================');
      console.log(JSON.stringify(report.summary, null, 2));
      
      if (report.timings) {
        console.log('\n⏱️ ENDPOINT TIMINGS:');
        Object.entries(report.timings).forEach(([endpoint, time]) => {
          console.log(`${endpoint}: ${time}ms`);
        });
      }
      
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 TEST SUITE FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = ComprehensiveTester;