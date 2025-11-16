#!/usr/bin/env node

/**
 * PERFORMANCE TESTING SUITE
 * 
 * Focused on measuring endpoint performance and system behavior under load
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

class PerformanceTester {
  constructor() {
    this.results = {
      endpoints: {},
      loadTests: {},
      errors: [],
      startTime: Date.now()
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📊',
      success: '✅', 
      error: '❌',
      timing: '⏱️',
      load: '🔄'
    }[type] || '📊';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async measureEndpoint(name, fn, iterations = 1) {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      try {
        const result = await fn();
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; // Convert to milliseconds
        
        results.push({
          success: true,
          duration,
          size: JSON.stringify(result).length
        });
        
      } catch (error) {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000;
        
        results.push({
          success: false,
          duration,
          error: error.message
        });
        
        this.results.errors.push({
          endpoint: name,
          iteration: i + 1,
          error: error.message,
          duration
        });
      }
    }
    
    // Calculate statistics
    const successfulResults = results.filter(r => r.success);
    const stats = {
      totalRequests: iterations,
      successful: successfulResults.length,
      failed: results.length - successfulResults.length,
      successRate: (successfulResults.length / iterations) * 100,
      avgDuration: successfulResults.length > 0 
        ? successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length 
        : 0,
      minDuration: successfulResults.length > 0 
        ? Math.min(...successfulResults.map(r => r.duration)) 
        : 0,
      maxDuration: successfulResults.length > 0 
        ? Math.max(...successfulResults.map(r => r.duration)) 
        : 0,
      avgSize: successfulResults.length > 0 
        ? successfulResults.reduce((sum, r) => sum + (r.size || 0), 0) / successfulResults.length 
        : 0
    };
    
    this.results.endpoints[name] = stats;
    
    this.log(`${name}: ${stats.avgDuration.toFixed(2)}ms avg, ${stats.successRate.toFixed(1)}% success (${iterations} requests)`, 'timing');
    
    return stats;
  }

  async testCriticalEndpoints() {
    this.log('🎯 Testing critical endpoints performance...', 'info');
    
    // First, let's create some test data
    const testClient = await axios.post(`${BASE_URL}/api/admin/clients`, {
      name: 'Performance Test Client',
      email: 'perf@test.com',
      company: 'Performance Testing Inc'
    }).catch(() => null);

    const testAgent = testClient ? await axios.post(`${BASE_URL}/api/admin/agents`, {
      name: 'Performance Test Agent',
      description: 'Agent for performance testing',
      clientId: testClient.data.data.id,
      status: 'active'
    }).catch(() => null) : null;

    // Test critical endpoints
    const endpoints = [
      {
        name: 'GET /health',
        fn: () => axios.get(`${BASE_URL}/health`),
        iterations: 10
      },
      {
        name: 'GET /admin/dashboard',
        fn: () => axios.get(`${BASE_URL}/api/admin/dashboard`),
        iterations: 5
      },
      {
        name: 'GET /admin/clients',
        fn: () => axios.get(`${BASE_URL}/api/admin/clients`),
        iterations: 5
      },
      {
        name: 'GET /admin/agents',
        fn: () => axios.get(`${BASE_URL}/api/admin/agents`),
        iterations: 5
      }
    ];

    // Add agent-specific tests if we have a test agent
    if (testAgent) {
      endpoints.push(
        {
          name: 'POST /admin/agents/:id/test',
          fn: () => axios.post(`${BASE_URL}/api/admin/agents/${testAgent.data.data.id}/test`, {
            inputText: 'Performance test contract generation for load testing purposes.'
          }),
          iterations: 3
        },
        {
          name: 'POST /agent/run',
          fn: () => axios.post(`${BASE_URL}/api/agent/run`, 
            { inputText: 'Performance test direct workflow execution for load testing.' },
            { headers: { 'x-api-key': testAgent.data.data.apiKey } }
          ),
          iterations: 3
        }
      );

      if (testClient) {
        endpoints.push({
          name: 'GET /admin/clients/:id/analytics',
          fn: () => axios.get(`${BASE_URL}/api/admin/clients/${testClient.data.data.id}/analytics`),
          iterations: 3
        });
      }
    }

    // Execute all endpoint tests
    for (const endpoint of endpoints) {
      try {
        await this.measureEndpoint(endpoint.name, endpoint.fn, endpoint.iterations);
        
        // Small delay between different endpoints
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        this.log(`Failed to test ${endpoint.name}: ${error.message}`, 'error');
      }
    }
  }

  async testLoadBehavior() {
    this.log('🔄 Testing system behavior under load...', 'load');
    
    try {
      // Create a test client and agent first
      const client = await axios.post(`${BASE_URL}/api/admin/clients`, {
        name: 'Load Test Client',
        email: 'load@test.com',
        company: 'Load Testing Corp'
      });

      const agent = await axios.post(`${BASE_URL}/api/admin/agents`, {
        name: 'Load Test Agent',
        clientId: client.data.data.id,
        description: 'Agent for load testing',
        status: 'active'
      });

      // Test concurrent requests
      const concurrentRequests = 5;
      const requestsPerBatch = 3;
      
      this.log(`Testing ${concurrentRequests} concurrent batches of ${requestsPerBatch} requests each`, 'load');
      
      const loadTestStart = Date.now();
      
      for (let batch = 0; batch < concurrentRequests; batch++) {
        const batchStart = Date.now();
        
        const promises = Array(requestsPerBatch).fill(null).map((_, index) => 
          axios.post(`${BASE_URL}/api/admin/agents/${agent.data.data.id}/test`, {
            inputText: `Load test batch ${batch + 1}, request ${index + 1}. Testing system performance under concurrent load with multiple simultaneous contract generation requests.`
          }).catch(error => ({ error: error.message }))
        );
        
        const batchResults = await Promise.all(promises);
        const batchDuration = Date.now() - batchStart;
        
        const successful = batchResults.filter(r => !r.error).length;
        const failed = batchResults.length - successful;
        
        this.results.loadTests[`batch_${batch + 1}`] = {
          duration: batchDuration,
          successful,
          failed,
          successRate: (successful / requestsPerBatch) * 100
        };
        
        this.log(`Batch ${batch + 1}: ${successful}/${requestsPerBatch} successful, ${batchDuration}ms`, 'load');
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      const totalLoadDuration = Date.now() - loadTestStart;
      this.log(`Load test completed in ${totalLoadDuration}ms`, 'success');
      
    } catch (error) {
      this.log(`Load test setup failed: ${error.message}`, 'error');
    }
  }

  async testDatabasePersistence() {
    this.log('💾 Testing database persistence and consistency...', 'info');
    
    try {
      // Create test data
      const client = await axios.post(`${BASE_URL}/api/admin/clients`, {
        name: 'DB Test Client',
        email: 'db@test.com',
        company: 'Database Testing LLC'
      });

      const agent = await axios.post(`${BASE_URL}/api/admin/agents`, {
        name: 'DB Test Agent',
        clientId: client.data.data.id,
        status: 'active'
      });

      // Generate a session
      const session = await axios.post(`${BASE_URL}/api/admin/agents/${agent.data.data.id}/test`, {
        inputText: 'Database persistence test - this session should be stored in PostgreSQL and retrievable via various endpoints.'
      });

      const sessionId = session.data.data.sessionId;
      
      // Wait a moment for data to be persisted
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify data persistence through different endpoints
      const tests = [
        {
          name: 'Dashboard reflects new data',
          fn: async () => {
            const dashboard = await axios.get(`${BASE_URL}/api/admin/dashboard`);
            return dashboard.data.data.overview.totalSessions > 0;
          }
        },
        {
          name: 'Client analytics includes session',
          fn: async () => {
            const analytics = await axios.get(`${BASE_URL}/api/admin/clients/${client.data.data.id}/analytics`);
            return analytics.data;
          }
        },
        {
          name: 'Agent sessions include new session',
          fn: async () => {
            const sessions = await axios.get(`${BASE_URL}/api/admin/agents/${agent.data.data.id}/sessions`);
            return sessions.data.data.some(s => s.id === sessionId);
          }
        }
      ];
      
      for (const test of tests) {
        try {
          const result = await test.fn();
          this.log(`✅ ${test.name}: ${result ? 'PASS' : 'FAIL'}`, result ? 'success' : 'error');
        } catch (error) {
          this.log(`❌ ${test.name}: ERROR - ${error.message}`, 'error');
        }
      }
      
    } catch (error) {
      this.log(`Database persistence test failed: ${error.message}`, 'error');
    }
  }

  generatePerformanceReport() {
    const duration = Date.now() - this.results.startTime;
    
    const report = {
      summary: {
        testDuration: `${Math.round(duration / 1000)}s`,
        endpointsTested: Object.keys(this.results.endpoints).length,
        totalErrors: this.results.errors.length,
        avgResponseTime: Object.values(this.results.endpoints)
          .reduce((sum, ep) => sum + ep.avgDuration, 0) / Object.keys(this.results.endpoints).length || 0
      },
      endpoints: this.results.endpoints,
      loadTests: this.results.loadTests,
      errors: this.results.errors,
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    const reportPath = path.join(__dirname, 'performance-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Analyze endpoint performance
    Object.entries(this.results.endpoints).forEach(([name, stats]) => {
      if (stats.avgDuration > 5000) {
        recommendations.push(`⚠️ ${name} is slow (${stats.avgDuration.toFixed(0)}ms avg) - consider optimization`);
      }
      if (stats.successRate < 95) {
        recommendations.push(`⚠️ ${name} has low success rate (${stats.successRate.toFixed(1)}%) - investigate errors`);
      }
    });
    
    // Analyze load test results
    const loadTestResults = Object.values(this.results.loadTests);
    if (loadTestResults.length > 0) {
      const avgLoadSuccessRate = loadTestResults.reduce((sum, test) => sum + test.successRate, 0) / loadTestResults.length;
      if (avgLoadSuccessRate < 90) {
        recommendations.push(`⚠️ System struggles under load (${avgLoadSuccessRate.toFixed(1)}% success rate) - consider scaling`);
      }
    }
    
    // General recommendations
    if (this.results.errors.length > 0) {
      recommendations.push(`⚠️ ${this.results.errors.length} errors detected - review error logs`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ All performance metrics look good!');
    }
    
    return recommendations;
  }

  async runPerformanceTests() {
    try {
      await this.testCriticalEndpoints();
      await this.testLoadBehavior();
      await this.testDatabasePersistence();
      
      const report = this.generatePerformanceReport();
      
      this.log('🎯 PERFORMANCE TESTING COMPLETED', 'success');
      this.log(`📊 Summary: ${report.summary.endpointsTested} endpoints tested, ${report.summary.avgResponseTime.toFixed(2)}ms avg response time`, 'success');
      this.log(`⏱️ Duration: ${report.summary.testDuration}`, 'timing');
      this.log(`❌ Errors: ${report.summary.totalErrors}`, report.summary.totalErrors > 0 ? 'error' : 'success');
      
      console.log('\n📈 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => console.log(rec));
      
      return report;
      
    } catch (error) {
      this.log(`CRITICAL ERROR: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const tester = new PerformanceTester();
  
  tester.runPerformanceTests()
    .then(report => {
      console.log('\n🎯 PERFORMANCE REPORT:');
      console.log('=====================');
      console.log(JSON.stringify(report.summary, null, 2));
      
      if (Object.keys(report.endpoints).length > 0) {
        console.log('\n⏱️ ENDPOINT PERFORMANCE:');
        Object.entries(report.endpoints).forEach(([endpoint, stats]) => {
          console.log(`${endpoint}: ${stats.avgDuration.toFixed(2)}ms avg (${stats.successRate.toFixed(1)}% success)`);
        });
      }
      
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 PERFORMANCE TESTS FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = PerformanceTester;