#!/usr/bin/env node

/**
 * Interactive test script for the ScanPower MCP Server
 * Supports both predefined tests and custom MCP JSON input
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createInterface } from 'readline';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Predefined test cases based on ScanPower API spec
const predefinedTests = {
  '1': {
    name: 'List Tools',
    message: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    }
  },
  '2': {
    name: 'Get API Token (Basic Auth)',
    message: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'getApiToken',
        arguments: {}
      }
    }
  },
  '3': {
    name: 'Get Users (Bearer Auth Only)',
    description: 'Uses only Bearer Auth - api_token goes to Authorization header',
    message: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'getUsers',
        arguments: {
          api_token: 'YOUR_API_TOKEN_HERE'
        }
      }
    }
  },
  '4': {
    name: 'Get Proxy Users (Bearer Auth Only)',
    description: 'Uses only Bearer Auth - api_token goes to Authorization header',
    message: {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'getProxyUsers',
        arguments: {
          proxy: 'proxy',
          api_token: 'YOUR_API_TOKEN_HERE'
        }
      }
    }
  },
  '5': {
    name: 'Get Amazon Access Token (Bearer Auth Only)',
    description: 'Uses only Bearer Auth - api_token goes to Authorization header',
    message: {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'getAccessToken',
        arguments: {
          marketplace: 'US',
          api_token: 'YOUR_API_TOKEN_HERE'
        }
      }
    }
  },
  '6': {
    name: 'Search Catalog Items (Bearer Auth + x-access-token)',
    description: 'Uses BOTH Bearer Auth (api_token) AND x-access-token header (amazonAccessToken)',
    message: {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'searchCatalogItems',
        arguments: {
          keywords: 'laptop',
          marketplaceIds: ['ATVPDKIKX0DER'],
          pageSize: 10,
          api_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiN2ZjMjg0N2EtNWU3NC00MWZjLWFjNDgtMDAxOGQyYWQ4YzFmIiwiYnVzaW5lc3MiOiJMdXBpbmUgR2xhY2llciIsIm5hbWUiOiJQYXVsIFJldGhlcmZvcmQiLCJwYXJlbnQiOm51bGwsInJvbGVzIjpbImFkbWluIiwicmVwb3J0IiwibGl2ZS1hcmJpdHJhZ2UiLCJrZWVwYS1rZXkiLCJtb2JpbGUucHJvIiwiYm94dCIsInJlc3RyaWN0ZWQiLCJzY291dC1pbnZlbnRvcnkiLCJpbi1zdG9jay12YXJpYXRpb25zIiwic2NvdXQiLCJzY291dC1sYXN0LXB1cmNoYXNlZCIsIm5ldC1wYXlvdXQiLCJpcC1jbGFpbSIsInN1cHBsaWVyLXByb2ZpdGFiaWxpdHkiLCJib3h0LWNvc3QiLCJlZGl0LXNoaXBtZW50LXF1YW50aXR5IiwiZGFzaGJvYXJkIiwiaW52ZW50b3J5LW1hbmFnZW1lbnQiLCJzY291dC1zYWxlcyIsInB1cmNoYXNlLW9yZGVyIiwic2NvdXQubW9iaWxlIiwibWFuYWdlLXRlYW0iLCJtYW5hZ2UtaW52ZW50b3J5LWxvY2F0aW9uIiwiaW52ZW50b3J5IiwiYnJhbmQtcmVqZWN0IiwiYWNjZXB0LXJlamVjdCIsImxpc3QtbmV3LWFzaW4iLCJib3h0LXByaWNlIiwidmFyaWF0aW9ucy12aWV3ZXIiLCJpbnZlbnRvcnktZXhwaXJhdGlvbnMiLCJrZWVwYSIsIm1vYmlsZS1yZXN0cmljdGVkIiwibWFuYWdlLW1hcHBpbmciLCJsaXN0Il0sIm1lcmNoYW50Ijp7IkNBIjp7ImlkIjoiQTNDSENOMFNDRjZNUDIiLCJyZWZyZXNoVG9rZW4iOiJBdHpyfEl3RUJJTWhRRjgyMjFtdENlZzN3LVhTbmNIRGMxOUdzS19KcWZhSHBxMjF5OTJaLWlvaXU2YWppRGJiaFctVDVzSTlKaTV2TDBrcVhVSnJOcVNRb0ZoS0xXRm5hd3hZWE9HWHFrTHZ3S0RlZWtKOFZHeVBBai1uSXhmWGI3bUJoSk1lVWhtQThmZzVsZC11dXkwQWRrZmRFcDY5VnJWWndqR1FVeWVEZ3dHSGRhZ2l3NnpmeTh3SEhnalRnRFN2ZlRwQXI4WVE4aVlXRUdZMHNGVkk2RnpsLVRCSDNPTzh0T3V1QWtwejZWV2tzbFVwa3lBY2RES25fVEstSmRwclk1U1M5ZjlaZUdEZVVSaVY0LVlxQmxEV0k5SmFhLWFoLXRBZTdKd2RUaXpka1FiN3lrb0dhZWtOU3VqRnFxbnNIQ2ZWOEJ3OCJ9LCJERSI6eyJpZCI6IkFWVEdNREQ5N0RSQjEiLCJyZWZyZXNoVG9rZW4iOiJBdHpyfEl3RUJJR296bHdQd214dmFXSG9jbU0weGd3dFZ2eFduUTBTZk1namh3YUppYmJCd0pMaF9lRDlKbjhIb1piYjRURVhUSlN6RldGVXFBa3Y1eGU5UTljbW1vN3VLbXJ3OE5OZmJzMmlPcUJuX1N0czFZZWNrSWZqR0N3V1lNM2dRMXdSdFVPcTJwWDJ0bUwzUG94ZXJPbmVwLU14WHRZM2RTMFNwdnBDN1ZpcS1OSUlhVEROS3NNX1hFTXRnXzE4WHJzNTZvQm5OUTFuRDlfVmtoajZjNTVYTlJUNFcxSTJNc0VWR2dudzJ0MnpjQVBsdmgxUVN0bVFGSDZwTGl4bW02dk8tSGhkWEZkM1Boc05zVWhaeWpSemw4cWRFZi03elRVaTBGZkZsMWd4UGN0cWpLNU1KbG9CNkNaOGhsNmVfYzhKelRRRSJ9LCJNWCI6eyJpZCI6IkEzQ0hDTjBTQ0Y2TVAyIiwicmVmcmVzaFRva2VuIjoiQXR6cnxJd0VCSU1oUUY4MjIxbXRDZWczdy1YU25jSERjMTlHc0tfSnFmYUhwcTIxeTkyWi1pb2l1NmFqaURiYmhXLVQ1c0k5Smk1dkwwa3FYVUpyTnFTUW9GaEtMV0ZuYXd4WVhPR1hxa0x2d0tEZWVrSjhWR3lQQWotbkl4ZlhiN21CaEpNZVVobUE4Zmc1bGQtdXV5MEFka2ZkRXA2OVZyVlp3akdRVXllRGd3R0hkYWdpdzZ6Znk4d0hIZ2pUZ0RTdmZUcEFyOFlROGlZV0VHWTBzRlZJNkZ6bC1UQkgzT084dE91dUFrcHo2Vldrc2xVcGt5QWNkREtuX1RLLUpkcHJZNVNTOWY5WmVHRGVVUmlWNC1ZcUJsRFdJOUphYS1haC10QWU3SndkVGl6ZGtRYjd5a29HYWVrTlN1akZxcW5zSENmVjhCdzgifSwiVVMiOnsiaWQiOiJBM0NIQ04wU0NGNk1QMiIsInJlZnJlc2hUb2tlbiI6IkF0enJ8SXdFQklNaFFGODIyMW10Q2VnM3ctWFNuY0hEYzE5R3NLX0pxZmFIcHEyMXk5MlotaW9pdTZhamlEYmJoVy1UNXNJOUppNXZMMGtxWFVKck5xU1FvRmhLTFdGbmF3eFlYT0dYcWtMdndLRGVla0o4Vkd5UEFqLW5JeGZYYjdtQmhKTWVVaG1BOGZnNWxkLXV1eTBBZGtmZEVwNjlWclZad2pHUVV5ZURnd0dIZGFnaXc2emZ5OHdISGdqVGdEU3ZmVHBBcjhZUThpWVdFR1kwc0ZWSTZGemwtVEJIM09POHRPdXVBa3B6NlZXa3NsVXBreUFjZERLbl9USy1KZHByWTVTUzlmOVplR0RlVVJpVjQtWXFCbERXSTlKYWEtYWgtdEFlN0p3ZFRpemRrUWI3eWtvR2Fla05TdWpGcXFuc0hDZlY4Qnc4In19fSwiaWF0IjoxNzYwNDc4MDMzLCJleHAiOjE3NjEwODI4MzMsImF1ZCI6ImFwaSIsImlzcyI6IlNjYW5Qb3dlciJ9.D2htAsD1oDab7iLrF8YwFy4qUNHkD8p0DAf2a08nf3maen5-ZyuxJV2GWc3hOJTLz0SHiUlSb0DFoeZFrQa73AlwXfvVmbi7RQ7JD9L6It8M7utNP-HdfTl8BWNAAyuWWxAVBWB4i-lg7IOqwbPtn1nccwIP0giN2Fn_M7alsRB7C8bWdkCHYLersiCJ8YJtIDN-t0t5TdRxWG7LvqZmzwXoQyjVgP4W7Zls8f8TlqLA6i-Rmx8A5ksS9EOx0dmE9u61FL-8O8PnAKn-Hl7WjNKPcUfwapx4E4AAYMFX0EGE4gurLVgG_pXiIoGvMsDIWqfNRLQ0En7_BZxOALM_CA'
          // Note: x-access-token header is automatically added using amazonAccessToken
        }
      }
    }
  },
  '7': {
    name: 'List Inbound Plans (Bearer Auth + x-access-token)',
    description: 'Uses BOTH Bearer Auth (api_token) AND x-access-token header (amazonAccessToken)',
    message: {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'listInboundPlans',
        arguments: {
          pageSize: 10,
          status: 'ACTIVE',
          sortBy: 'LAST_UPDATED_TIME',
          sortOrder: 'DESC',
          api_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiN2ZjMjg0N2EtNWU3NC00MWZjLWFjNDgtMDAxOGQyYWQ4YzFmIiwiYnVzaW5lc3MiOiJMdXBpbmUgR2xhY2llciIsIm5hbWUiOiJQYXVsIFJldGhlcmZvcmQiLCJwYXJlbnQiOm51bGwsInJvbGVzIjpbImFkbWluIiwicmVwb3J0IiwibGl2ZS1hcmJpdHJhZ2UiLCJrZWVwYS1rZXkiLCJtb2JpbGUucHJvIiwiYm94dCIsInJlc3RyaWN0ZWQiLCJzY291dC1pbnZlbnRvcnkiLCJpbi1zdG9jay12YXJpYXRpb25zIiwic2NvdXQiLCJzY291dC1sYXN0LXB1cmNoYXNlZCIsIm5ldC1wYXlvdXQiLCJpcC1jbGFpbSIsInN1cHBsaWVyLXByb2ZpdGFiaWxpdHkiLCJib3h0LWNvc3QiLCJlZGl0LXNoaXBtZW50LXF1YW50aXR5IiwiZGFzaGJvYXJkIiwiaW52ZW50b3J5LW1hbmFnZW1lbnQiLCJzY291dC1zYWxlcyIsInB1cmNoYXNlLW9yZGVyIiwic2NvdXQubW9iaWxlIiwibWFuYWdlLXRlYW0iLCJtYW5hZ2UtaW52ZW50b3J5LWxvY2F0aW9uIiwiaW52ZW50b3J5IiwiYnJhbmQtcmVqZWN0IiwiYWNjZXB0LXJlamVjdCIsImxpc3QtbmV3LWFzaW4iLCJib3h0LXByaWNlIiwidmFyaWF0aW9ucy12aWV3ZXIiLCJpbnZlbnRvcnktZXhwaXJhdGlvbnMiLCJrZWVwYSIsIm1vYmlsZS1yZXN0cmljdGVkIiwibWFuYWdlLW1hcHBpbmciLCJsaXN0Il0sIm1lcmNoYW50Ijp7IkNBIjp7ImlkIjoiQTNDSENOMFNDRjZNUDIiLCJyZWZyZXNoVG9rZW4iOiJBdHpyfEl3RUJJTWhRRjgyMjFtdENlZzN3LVhTbmNIRGMxOUdzS19KcWZhSHBxMjF5OTJaLWlvaXU2YWppRGJiaFctVDVzSTlKaTV2TDBrcVhVSnJOcVNRb0ZoS0xXRm5hd3hZWE9HWHFrTHZ3S0RlZWtKOFZHeVBBai1uSXhmWGI3bUJoSk1lVWhtQThmZzVsZC11dXkwQWRrZmRFcDY5VnJWWndqR1FVeWVEZ3dHSGRhZ2l3NnpmeTh3SEhnalRnRFN2ZlRwQXI4WVE4aVlXRUdZMHNGVkk2RnpsLVRCSDNPTzh0T3V1QWtwejZWV2tzbFVwa3lBY2RES25fVEstSmRwclk1U1M5ZjlaZUdEZVVSaVY0LVlxQmxEV0k5SmFhLWFoLXRBZTdKd2RUaXpka1FiN3lrb0dhZWtOU3VqRnFxbnNIQ2ZWOEJ3OCJ9LCJERSI6eyJpZCI6IkFWVEdNREQ5N0RSQjEiLCJyZWZyZXNoVG9rZW4iOiJBdHpyfEl3RUJJR296bHdQd214dmFXSG9jbU0weGd3dFZ2eFduUTBTZk1namh3YUppYmJCd0pMaF9lRDlKbjhIb1piYjRURVhUSlN6RldGVXFBa3Y1eGU5UTljbW1vN3VLbXJ3OE5OZmJzMmlPcUJuX1N0czFZZWNrSWZqR0N3V1lNM2dRMXdSdFVPcTJwWDJ0bUwzUG94ZXJPbmVwLU14WHRZM2RTMFNwdnBDN1ZpcS1OSUlhVEROS3NNX1hFTXRnXzE4WHJzNTZvQm5OUTFuRDlfVmtoajZjNTVYTlJUNFcxSTJNc0VWR2dudzJ0MnpjQVBsdmgxUVN0bVFGSDZwTGl4bW02dk8tSGhkWEZkM1Boc05zVWhaeWpSemw4cWRFZi03elRVaTBGZkZsMWd4UGN0cWpLNU1KbG9CNkNaOGhsNmVfYzhKelRRRSJ9LCJNWCI6eyJpZCI6IkEzQ0hDTjBTQ0Y2TVAyIiwicmVmcmVzaFRva2VuIjoiQXR6cnxJd0VCSU1oUUY4MjIxbXRDZWczdy1YU25jSERjMTlHc0tfSnFmYUhwcTIxeTkyWi1pb2l1NmFqaURiYmhXLVQ1c0k5Smk1dkwwa3FYVUpyTnFTUW9GaEtMV0ZuYXd4WVhPR1hxa0x2d0tEZWVrSjhWR3lQQWotbkl4ZlhiN21CaEpNZVVobUE4Zmc1bGQtdXV5MEFka2ZkRXA2OVZyVlp3akdRVXllRGd3R0hkYWdpdzZ6Znk4d0hIZ2pUZ0RTdmZUcEFyOFlROGlZV0VHWTBzRlZJNkZ6bC1UQkgzT084dE91dUFrcHo2Vldrc2xVcGt5QWNkREtuX1RLLUpkcHJZNVNTOWY5WmVHRGVVUmlWNC1ZcUJsRFdJOUphYS1haC10QWU3SndkVGl6ZGtRYjd5a29HYWVrTlN1akZxcW5zSENmVjhCdzgifSwiVVMiOnsiaWQiOiJBM0NIQ04wU0NGNk1QMiIsInJlZnJlc2hUb2tlbiI6IkF0enJ8SXdFQklNaFFGODIyMW10Q2VnM3ctWFNuY0hEYzE5R3NLX0pxZmFIcHEyMXk5MlotaW9pdTZhamlEYmJoVy1UNXNJOUppNXZMMGtxWFVKck5xU1FvRmhLTFdGbmF3eFlYT0dYcWtMdndLRGVla0o4Vkd5UEFqLW5JeGZYYjdtQmhKTWVVaG1BOGZnNWxkLXV1eTBBZGtmZEVwNjlWclZad2pHUVV5ZURnd0dIZGFnaXc2emZ5OHdISGdqVGdEU3ZmVHBBcjhZUThpWVdFR1kwc0ZWSTZGemwtVEJIM09POHRPdXVBa3B6NlZXa3NsVXBreUFjZERLbl9USy1KZHByWTVTUzlmOVplR0RlVVJpVjQtWXFCbERXSTlKYWEtYWgtdEFlN0p3ZFRpemRrUWI3eWtvR2Fla05TdWpGcXFuc0hDZlY4Qnc4In19fSwiaWF0IjoxNzYwNDc4MDMzLCJleHAiOjE3NjEwODI4MzMsImF1ZCI6ImFwaSIsImlzcyI6IlNjYW5Qb3dlciJ9.D2htAsD1oDab7iLrF8YwFy4qUNHkD8p0DAf2a08nf3maen5-ZyuxJV2GWc3hOJTLz0SHiUlSb0DFoeZFrQa73AlwXfvVmbi7RQ7JD9L6It8M7utNP-HdfTl8BWNAAyuWWxAVBWB4i-lg7IOqwbPtn1nccwIP0giN2Fn_M7alsRB7C8bWdkCHYLersiCJ8YJtIDN-t0t5TdRxWG7LvqZmzwXoQyjVgP4W7Zls8f8TlqLA6i-Rmx8A5ksS9EOx0dmE9u61FL-8O8PnAKn-Hl7WjNKPcUfwapx4E4AAYMFX0EGE4gurLVgG_pXiIoGvMsDIWqfNRLQ0En7_BZxOALM_CA'
          // Note: x-access-token header is automatically added using amazonAccessToken
        }
      }
    }
  },
  '8': {
    name: 'List Inbound Plan Items (Bearer Auth + x-access-token)',
    description: 'Uses BOTH Bearer Auth (api_token) AND x-access-token header (amazonAccessToken)',
    message: {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'listInboundPlanItems',
        arguments: {
          inboundPlanId: 'YOUR_INBOUND_PLAN_ID',
          pageSize: 10,
          api_token: 'YOUR_API_TOKEN_HERE'
          // Note: x-access-token header is automatically added using amazonAccessToken
        }
      }
    }
  }
};

class InteractiveTestServer {
  constructor() {
    this.server = null;
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.messageId = 1000; // Start custom messages at 1000
  }

  async start() {
    console.log('🧪 Interactive ScanPower MCP Server Test Harness\n');
    
    // Check if server is built
    if (!this.isServerBuilt()) {
      console.log('❌ Server not built. Please run "npm run build" first.');
      process.exit(1);
    }

    // Start the MCP server
    this.startMCPServer();
    
    // Wait for server to start
    await this.sleep(2000);
    
    // Show menu
    this.showMenu();
  }

  isServerBuilt() {
    return existsSync(join(__dirname, 'dist', 'index.js'));
  }

  startMCPServer() {
    const serverPath = join(__dirname, 'dist', 'index.js');
    this.server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.server.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          console.log('\n✅ Received response:');
          console.log(JSON.stringify(response, null, 2));
          console.log('\n' + '='.repeat(50) + '\n');
        } catch (error) {
          console.log('📝 Server output:', line);
        }
      }
    });

    this.server.stderr.on('data', (data) => {
      console.log('📝 Server log:', data.toString());
    });

    this.server.on('close', (code) => {
      if (code !== 0) {
        console.log(`❌ Server exited with code ${code}`);
      }
    });
  }

  showMenu() {
    if (this.rl.closed) {
      return;
    }
    
    console.log('\n📋 Available Options:');
    console.log('1. List Tools');
    console.log('2. Get API Token (Basic Auth)');
    console.log('3. Get Users (Bearer Auth Only)');
    console.log('4. Get Proxy Users (Bearer Auth Only)');
    console.log('5. Get Amazon Access Token (Bearer Auth Only)');
    console.log('6. Search Catalog Items (Bearer Auth + x-access-token)');
    console.log('7. List Inbound Plans (Bearer Auth + x-access-token)');
    console.log('8. List Inbound Plan Items (Bearer Auth + x-access-token)');
    console.log('9. Custom JSON Input');
    console.log('10. Run All Predefined Tests');
    console.log('11. Exit');
    console.log('\n🔐 Authentication Types:');
    console.log('   • Bearer Auth Only: Uses api_token for Authorization header');
    console.log('   • Bearer Auth + x-access-token: Uses api_token for Authorization header AND amazonAccessToken for x-access-token header');
    console.log('\nNote: Tests 3-8 require valid API tokens. Replace "YOUR_API_TOKEN_HERE" with actual tokens.');
    console.log('\nEnter your choice (1-11):');

    this.rl.question('> ', (answer) => {
      this.handleChoice(answer.trim());
    });
  }

  async handleChoice(choice) {
    switch (choice) {
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
        this.runPredefinedTest(choice);
        break;
      case '9':
        this.promptCustomJSON();
        break;
      case '10':
        this.runAllTests();
        break;
      case '11':
        this.exit();
        break;
      default:
        console.log('❌ Invalid choice. Please enter 1-11.');
        this.showMenu();
    }
  }

  runPredefinedTest(testId) {
    const test = predefinedTests[testId];
    if (test) {
      console.log(`\n📤 Running: ${test.name}`);
      if (test.description) {
        console.log(`📝 Description: ${test.description}`);
      }
      
      // Check if test requires API token and prompt for it
      const messageStr = JSON.stringify(test.message, null, 2);
      if (messageStr.includes('YOUR_API_TOKEN_HERE')) {
        console.log('⚠️  This test requires an API token. Using placeholder - replace with actual token for real testing.');
        console.log('💡 Tip: Use option 2 to get an API token first, then use custom JSON input with your token.');
      }
      
      console.log('📤 Sending message:', messageStr);
      this.server.stdin.write(JSON.stringify(test.message) + '\n');
      
      setTimeout(() => {
        this.showMenu();
      }, 1000);
    }
  }

  promptCustomJSON() {
    if (this.rl.closed) {
      return;
    }
    
    console.log('\n📝 Enter MCP JSON message (or "back" to return to menu):');
    console.log('Example: {"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}');
    
    this.rl.question('JSON> ', (input) => {
      if (input.trim().toLowerCase() === 'back') {
        this.showMenu();
        return;
      }

      try {
        const message = JSON.parse(input);
        message.id = this.messageId++; // Ensure unique ID
        
        console.log(`\n📤 Sending custom message:`, JSON.stringify(message, null, 2));
        this.server.stdin.write(JSON.stringify(message) + '\n');
        
        setTimeout(() => {
          this.showMenu();
        }, 1000);
      } catch (error) {
        console.log('❌ Invalid JSON:', error.message);
        this.promptCustomJSON();
      }
    });
  }

  async runAllTests() {
    console.log('\n🚀 Running all predefined tests...\n');
    
    for (const [id, test] of Object.entries(predefinedTests)) {
      console.log(`📤 Running: ${test.name}`);
      console.log('📤 Sending:', JSON.stringify(test.message, null, 2));
      this.server.stdin.write(JSON.stringify(test.message) + '\n');
      
      // Wait between tests
      await this.sleep(2000);
    }
    
    console.log('\n🎉 All tests completed!');
    this.showMenu();
  }

  exit() {
    console.log('\n👋 Goodbye!');
    if (this.server) {
      this.server.kill();
    }
    this.rl.close();
    process.exit(0);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start the interactive test server
const testServer = new InteractiveTestServer();
testServer.start().catch(console.error);
