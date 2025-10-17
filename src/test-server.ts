#!/usr/bin/env node

/**
 * Interactive test script for the ScanPower MCP Server
 * Supports both predefined tests and custom MCP JSON input
 */

import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createInterface, Interface } from 'readline';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type definitions
interface MCPMessage {
  jsonrpc: string;
  id: number;
  method: string;
  params: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: {
    content: Array<{
      type: string;
      text: string;
    }>;
  };
  error?: {
    code: number;
    message: string;
  };
}

interface PredefinedTest {
  name: string;
  description?: string;
  message: MCPMessage;
}

interface PredefinedTests {
  [key: string]: PredefinedTest;
}

type ResponseHandler = (response: MCPResponse) => void;

// Predefined test cases based on ScanPower API spec
const predefinedTests: PredefinedTests = {
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
          marketplace: 'ATVPDKIKX0DER',
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
          api_token: 'YOUR_API_TOKEN_HERE'
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
          api_token: 'YOUR_API_TOKEN_HERE'
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
  private server: ChildProcess | null = null;
  private rl: Interface;
  private messageId: number = 1000; // Start custom messages at 1000
  private apiToken: string | null = null;
  private responseHandlers: ResponseHandler[] = [];

  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start(): Promise<void> {
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
    // Initialize API token automatically using Basic Auth
    try {
      await this.initializeApiToken();
    } catch (e) {
      const error = e as Error;
      console.log('⚠️  Failed to initialize API token automatically:', error?.message || String(e));
    }

    // Show menu
    this.showMenu();
  }

  private isServerBuilt(): boolean {
    return existsSync(join(__dirname, '..', 'dist', 'index.js'));
  }

  private startMCPServer(): void {
    const serverPath = join(__dirname, '..', 'dist', 'index.js');
    this.server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.server.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const response: MCPResponse = JSON.parse(line);
          console.log('\n✅ Received response:');
          console.log(JSON.stringify(response, null, 2));
          console.log('\n' + '='.repeat(50) + '\n');

          // Notify any response handlers
          for (const handler of this.responseHandlers) {
            try { 
              handler(response); 
            } catch (error) {
              // Ignore handler errors
            }
          }
        } catch (error) {
          console.log('📝 Server output:', line);
        }
      }
    });

    this.server.stderr?.on('data', (data: Buffer) => {
      console.log('📝 Server log:', data.toString());
    });

    this.server.on('close', (code: number | null) => {
      if (code !== 0) {
        console.log(`❌ Server exited with code ${code}`);
      }
    });
  }

  private async initializeApiToken(): Promise<void> {
    const id = this.messageId++;
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: {
        name: 'getApiToken',
        arguments: {}
      }
    };

    console.log('🔐 Initializing API token via getApiToken...');

    const token = await new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 8000);
      const handler: ResponseHandler = (response: MCPResponse) => {
        if (response && response.id === id) {
          // Only handle once
          this.responseHandlers = this.responseHandlers.filter((h) => h !== handler);
          clearTimeout(timeout);
          try {
            const content = response?.result?.content;
            const text = Array.isArray(content) && content[0]?.text;
            if (typeof text === 'string') {
              // The response is a JSON string wrapped in quotes, so we need to parse it twice
              const parsed = JSON.parse(text);
              // The token is directly the parsed value (it's already a JWT token string)
              const found = parsed || null;
              resolve(found);
              return;
            }
          } catch (error) {
            // Ignore parsing errors
          }
          resolve(null);
        }
      };
      this.responseHandlers.push(handler);
      this.server?.stdin?.write(JSON.stringify(message) + '\n');
    });

    if (token) {
      this.apiToken = token;
      console.log('✅ Retrieved API token. Subsequent tests will use it automatically.');
    } else {
      console.log('⚠️  No API token obtained. Some tests may require manual tokens.');
    }
  }

  private showMenu(): void {
    if (!this.rl) {
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

    this.rl.question('> ', (answer: string) => {
      this.handleChoice(answer.trim());
    });
  }

  private async handleChoice(choice: string): Promise<void> {
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
        await this.runAllTests();
        break;
      case '11':
        this.exit();
        break;
      default:
        console.log('❌ Invalid choice. Please enter 1-11.');
        this.showMenu();
    }
  }

  private runPredefinedTest(testId: string): void {
    const test = predefinedTests[testId];
    if (test) {
      console.log(`\n📤 Running: ${test.name}`);
      if (test.description) {
        console.log(`📝 Description: ${test.description}`);
      }
      
      // Prepare message, injecting api_token if available
      const prepared: MCPMessage = JSON.parse(JSON.stringify(test.message));
      if (this.apiToken) {
        const replaceTokens = (obj: any): void => {
          if (!obj || typeof obj !== 'object') return;
          for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (key === 'api_token') {
              obj[key] = this.apiToken;
            } else if (typeof val === 'string' && val === 'YOUR_API_TOKEN_HERE') {
              obj[key] = this.apiToken;
            } else if (val && typeof val === 'object') {
              replaceTokens(val);
            }
          }
        };
        replaceTokens(prepared);
        console.log('🔐 Injected API token into request.');
      } else {
        const messageStrCheck = JSON.stringify(prepared);
        if (messageStrCheck.includes('YOUR_API_TOKEN_HERE')) {
          console.log('⚠️  This test requires an API token. No token available - placeholder will be used.');
          console.log('💡 Run option 2 or set credentials to retrieve a token automatically.');
        }
      }

      console.log('📤 Sending message:', JSON.stringify(prepared, null, 2));
      this.server?.stdin?.write(JSON.stringify(prepared) + '\n');
      
      setTimeout(() => {
        this.showMenu();
      }, 1000);
    }
  }

  private promptCustomJSON(): void {
    if (!this.rl) {
      return;
    }
    
    console.log('\n📝 Enter MCP JSON message (or "back" to return to menu):');
    console.log('Example: {"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}');
    
    this.rl.question('JSON> ', (input: string) => {
      if (input.trim().toLowerCase() === 'back') {
        this.showMenu();
        return;
      }

      try {
        const message: MCPMessage = JSON.parse(input);
        message.id = this.messageId++; // Ensure unique ID
        
        console.log(`\n📤 Sending custom message:`, JSON.stringify(message, null, 2));
        this.server?.stdin?.write(JSON.stringify(message) + '\n');
        
        setTimeout(() => {
          this.showMenu();
        }, 1000);
      } catch (error) {
        const err = error as Error;
        console.log('❌ Invalid JSON:', err.message);
        this.promptCustomJSON();
      }
    });
  }

  private async runAllTests(): Promise<void> {
    console.log('\n🚀 Running all predefined tests...\n');
    
    for (const [id, test] of Object.entries(predefinedTests)) {
      console.log(`📤 Running: ${test.name}`);
      const prepared: MCPMessage = JSON.parse(JSON.stringify(test.message));
      if (this.apiToken) {
        const replaceTokens = (obj: any): void => {
          if (!obj || typeof obj !== 'object') return;
          for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (key === 'api_token') {
              obj[key] = this.apiToken;
            } else if (typeof val === 'string' && val === 'YOUR_API_TOKEN_HERE') {
              obj[key] = this.apiToken;
            } else if (val && typeof val === 'object') {
              replaceTokens(val);
            }
          }
        };
        replaceTokens(prepared);
      }
      console.log('📤 Sending:', JSON.stringify(prepared, null, 2));
      this.server?.stdin?.write(JSON.stringify(prepared) + '\n');
      
      // Wait between tests
      await this.sleep(2000);
    }
    
    console.log('\n🎉 All tests completed!');
    this.showMenu();
  }

  private exit(): void {
    console.log('\n👋 Goodbye!');
    if (this.server) {
      this.server.kill();
    }
    this.rl.close();
    process.exit(0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start the interactive test server
const testServer = new InteractiveTestServer();
testServer.start().catch(console.error);
