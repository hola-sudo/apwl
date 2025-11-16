#!/usr/bin/env node

/**
 * MANUAL TEST EXECUTION - REAL DATA VALIDATION
 * 
 * This script performs manual testing with real data validation
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function runManualTests() {
  console.log('🚀 STARTING MANUAL TESTING WITH REAL DATA');
  console.log('==========================================\n');

  try {
    // 1. Test Health Endpoint
    console.log('1️⃣ TESTING HEALTH ENDPOINT');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Health Check: ${health.data.status} (${health.data.uptime}s uptime)`);
    console.log(`📊 Response Time: ${health.headers['x-response-time'] || 'N/A'}\n`);

    // 2. Test Dashboard
    console.log('2️⃣ TESTING DASHBOARD ENDPOINT');
    const dashboard = await axios.get(`${BASE_URL}/api/admin/dashboard`);
    console.log(`✅ Dashboard loaded: ${dashboard.data.data.overview.totalClients} clients, ${dashboard.data.data.overview.totalAgents} agents`);
    console.log(`📊 Total Sessions: ${dashboard.data.data.overview.totalSessions}`);
    console.log(`🔝 Top Agents: ${dashboard.data.data.topAgents.length}\n`);

    // 3. Get existing clients
    console.log('3️⃣ GETTING EXISTING CLIENTS');
    const clients = await axios.get(`${BASE_URL}/api/admin/clients`);
    console.log(`✅ Found ${clients.data.data.length} clients:`);
    clients.data.data.forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.name} (ID: ${client.id})`);
    });
    console.log();

    // 4. Create a test agent for the first client
    if (clients.data.data.length > 0) {
      const firstClient = clients.data.data[0];
      console.log('4️⃣ CREATING TEST AGENT');
      
      try {
        const agent = await axios.post(`${BASE_URL}/api/admin/agents`, {
          name: `Test Agent ${Date.now()}`,
          description: 'Agent created for comprehensive testing',
          clientId: firstClient.id,
          status: 'active'
        });
        
        console.log(`✅ Agent created: ${agent.data.data.name}`);
        console.log(`🔑 API Key: ${agent.data.data.apiKey.substring(0, 20)}...`);
        console.log(`🏢 Client: ${firstClient.name}\n`);

        // 5. Test the agent
        console.log('5️⃣ TESTING AGENT WITH REAL DATA');
        const testInputs = [
          'Necesito un contrato de servicios de desarrollo web para mi empresa. Incluye diseño, programación y mantenimiento por 6 meses.',
          'Reunión completada el 10 de enero. Se discutieron los alcances del proyecto, presupuesto de $25,000 y cronograma de entrega.',
          'Anexo de modificaciones: Se aprobaron 2 cambios en el diseño original y extensión de plazo por 2 semanas adicionales.'
        ];

        for (let i = 0; i < testInputs.length; i++) {
          console.log(`\n   Test ${i + 1}/3: Testing agent with admin endpoint`);
          try {
            const start = Date.now();
            const testResult = await axios.post(`${BASE_URL}/api/admin/agents/${agent.data.data.id}/test`, {
              inputText: testInputs[i]
            });
            const duration = Date.now() - start;
            
            console.log(`   ✅ Success: Session ${testResult.data.data.sessionId} (${duration}ms)`);
            console.log(`   📄 Result length: ${testResult.data.data.message.length} characters`);
            
          } catch (error) {
            console.log(`   ❌ Failed: ${error.response?.data?.message || error.message}`);
          }

          // Test direct workflow endpoint
          console.log(`   Test ${i + 1}/3: Testing direct workflow endpoint`);
          try {
            const start = Date.now();
            const directResult = await axios.post(`${BASE_URL}/api/agent/run`, 
              { inputText: testInputs[i] },
              { headers: { 'x-api-key': agent.data.data.apiKey } }
            );
            const duration = Date.now() - start;
            
            console.log(`   ✅ Direct Success: Session ${directResult.data.sessionId} (${duration}ms)`);
            console.log(`   📄 Result length: ${directResult.data.message.length} characters`);
            
          } catch (error) {
            console.log(`   ❌ Direct Failed: ${error.response?.data?.message || error.message}`);
          }
        }

        // 6. Test Analytics
        console.log('\n6️⃣ TESTING CLIENT ANALYTICS');
        try {
          const analytics = await axios.get(`${BASE_URL}/api/admin/clients/${firstClient.id}/analytics`);
          console.log(`✅ Analytics loaded for ${firstClient.name}`);
          console.log(`📊 Agent Performance entries: ${analytics.data.data.agentPerformance.length}`);
          console.log(`📈 Sessions over time entries: ${analytics.data.data.sessionsOverTime.length}`);
        } catch (error) {
          console.log(`❌ Analytics failed: ${error.response?.data?.message || error.message}`);
        }

        // 7. Test Agent Sessions
        console.log('\n7️⃣ TESTING AGENT SESSIONS');
        try {
          const sessions = await axios.get(`${BASE_URL}/api/admin/agents/${agent.data.data.id}/sessions`);
          console.log(`✅ Sessions loaded: ${sessions.data.data.length} sessions found`);
          if (sessions.data.data.length > 0) {
            console.log(`📋 Latest session: ${sessions.data.data[0].status} at ${sessions.data.data[0].createdAt}`);
          }
        } catch (error) {
          console.log(`❌ Sessions failed: ${error.response?.data?.message || error.message}`);
        }

        // 8. Test Session Retrieval
        if (sessions && sessions.data.data.length > 0) {
          console.log('\n8️⃣ TESTING SESSION RETRIEVAL');
          try {
            const sessionId = sessions.data.data[0].id;
            const sessionDetail = await axios.get(`${BASE_URL}/api/agent/session/${sessionId}`, {
              headers: { 'x-api-key': agent.data.data.apiKey }
            });
            console.log(`✅ Session detail retrieved: ${sessionDetail.data.status}`);
            console.log(`📄 Processing time: ${sessionDetail.data.processingTime}ms`);
          } catch (error) {
            console.log(`❌ Session retrieval failed: ${error.response?.data?.message || error.message}`);
          }
        }

      } catch (error) {
        console.log(`❌ Agent creation failed: ${error.response?.data?.message || error.message}\n`);
      }
    }

    // 9. Final Dashboard Check
    console.log('\n9️⃣ FINAL DASHBOARD CHECK');
    const finalDashboard = await axios.get(`${BASE_URL}/api/admin/dashboard`);
    console.log(`✅ Final stats: ${finalDashboard.data.data.overview.totalClients} clients, ${finalDashboard.data.data.overview.totalAgents} agents, ${finalDashboard.data.data.overview.totalSessions} sessions`);
    
    console.log('\n🎉 MANUAL TESTING COMPLETED SUCCESSFULLY');
    console.log('========================================');

  } catch (error) {
    console.error('\n💥 CRITICAL ERROR:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

runManualTests();