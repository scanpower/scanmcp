#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import https from 'https';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface ScanPowerConfig {
  baseUrl: string;
  username: string;
  password: string;
  proxyUserId?: string;
}

interface AmazonConfig {
  marketplaceId: string;
  accessKeyId: string;
  secretAccessKey: string;
  roleArn: string;
}

class ScanPowerAPIClient {
  private client: AxiosInstance;
  private config: ScanPowerConfig;
  private amazonConfig: AmazonConfig;
  private apiToken: string | null = null;
  private amazonAccessToken: string | null = null;

  constructor(config: ScanPowerConfig, amazonConfig: AmazonConfig) {
    this.config = config;
    this.amazonConfig = amazonConfig;
    
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ScanPower-MCP-Server/1.0.0',
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    // Add request interceptor for logging only (no path-based auth logic)
    this.client.interceptors.request.use(async (config) => {
      // Ensure headers object exists
      config.headers = config.headers || {};

      // Log the outgoing request with masked credentials for debugging
      try {
        const method = (config.method || 'GET').toUpperCase();
        const urlForLog = config.baseURL
          ? `${config.baseURL}${config.url || ''}`
          : (config.url || '');
        const maskedHeaders: Record<string, any> = { ...(config.headers as any) };
        if (maskedHeaders['Authorization']) {
          const token = String(maskedHeaders['Authorization']);
          if (token.toLowerCase().startsWith('basic ')) {
            maskedHeaders['Authorization'] = 'Basic ***';
          } else {
            maskedHeaders['Authorization'] = token.replace(/(Bearer\s+)(.+)/i, (_m, p1, p2) => {
              const tail = p2.slice(-4);
              return `${p1}***${tail}`;
            });
          }
        }
        // Also log if auth option is set (axios will convert this to Authorization header)
        if (config.auth) {
          console.error('[HTTP REQUEST] Auth option present - username:', config.auth.username ? '***' : 'missing');
        }
        if (maskedHeaders['X-Access-Token']) {
          const t = String(maskedHeaders['X-Access-Token']);
          maskedHeaders['X-Access-Token'] = `***${t.slice(-4)}`;
        }
        console.error('[HTTP REQUEST]', JSON.stringify({
          method,
          url: urlForLog,
          params: config.params || undefined,
          data: config.data || undefined,
          headers: maskedHeaders,
        }));
      } catch {
        // ignore logging errors
      }

      return config;
    });

    // Add response interceptor to log errors/responses helpful for auth debugging
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        try {
          const status = error?.response?.status;
          const data = error?.response?.data;
          const req = error?.config || {};
          const method = (req.method || 'GET').toUpperCase();
          const urlForLog = req.baseURL ? `${req.baseURL}${req.url || ''}` : (req.url || '');
          console.error('[HTTP ERROR]', JSON.stringify({ status, method, url: urlForLog, data }));
        } catch {
          // ignore logging errors
        }
        return Promise.reject(error);
      }
    );
  }

  setApiToken(token: string): void {
    this.apiToken = token;
  }

  setProxyUserId(proxyUserId: string | undefined): void {
    this.config.proxyUserId = proxyUserId;
  }

  async authenticate(): Promise<void> {
    try {
      const response = await this.client.get('/api/v2/token', {
        auth: {
          username: this.config.username,
          password: this.config.password,
        },
        headers: this.config.proxyUserId ? {
          'X-Proxy': this.config.proxyUserId,
        } : {},
      });

      this.apiToken = response.data.token;
    } catch (error) {
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  async getAmazonAccessToken(): Promise<string> {
    if (this.amazonAccessToken) {
      return this.amazonAccessToken;
    }

    try {
      const response = await this.client.get('/api/az/access-token', {
        params: {
          marketplace: this.amazonConfig.marketplaceId,
        },
      });

      this.amazonAccessToken = response.data.access_token;
      return this.amazonAccessToken!;
    } catch (error) {
      throw new Error(`Failed to get Amazon access token: ${error}`);
    }
  }

  async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    params?: any,
    apiToken?: string
  ): Promise<T> {
    // Use provided token if available
    if (apiToken) {
      this.setApiToken(apiToken);
    }

    const response: AxiosResponse<T> = await this.client.request({
      method,
      url: endpoint,
      data,
      params,
    });

    return response.data;
  }
}

class ScanPowerMCPServer {
  private server: Server;
  private apiClient: ScanPowerAPIClient;
  private openApi: any | null = null;
  private operationMap: Map<string, any> = new Map();
  private generatedTools: Tool[] = [];
  private isReady: boolean = false;

  constructor() {
    const scanPowerConfig: ScanPowerConfig = {
      baseUrl: process.env.SCANPOWER_BASE_URL || 'https://api.scanpower.com',
      username: process.env.SCANPOWER_USERNAME || '',
      password: process.env.SCANPOWER_PASSWORD || '',
      proxyUserId: process.env.SCANPOWER_PROXY_USER_ID,
    };

    const amazonConfig: AmazonConfig = {
      marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER',
      accessKeyId: process.env.AMAZON_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY || '',
      roleArn: process.env.AMAZON_ROLE_ARN || '',
    };

    this.apiClient = new ScanPowerAPIClient(scanPowerConfig, amazonConfig);

    this.server = new Server(
      {
        name: 'scanpower-mcp-server',
        version: '1.0.0',
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      if (!this.isReady) {
        return {
          tools: [],
        };
      }
      return {
        tools: this.generatedTools,
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.isReady) {
        return {
          content: [
            {
              type: 'text',
              text: 'Server is not ready yet. Please wait for OpenAPI spec to load.',
            },
          ],
          isError: true,
        };
      }

      const { name, arguments: args } = request.params;
      const typedArgs = args as Record<string, any> | undefined;

      let urlPath: string = '';
      let queryParams: Record<string, any> = {};
      let headers: Record<string, any> = {};
      let data: any = undefined;
      let op: any = null;

      try {
        // If a proxy_user_id is provided, set it immediately so subsequent calls use it
        if (typedArgs && typeof typedArgs.proxy_user_id === 'string' && typedArgs.proxy_user_id.trim().length > 0) {
          this.apiClient.setProxyUserId(typedArgs.proxy_user_id.trim());
          console.error('[AUTH] Proxy user set to:', typedArgs.proxy_user_id.trim());
          // If the intent was just to set proxy, acknowledge and return early with confirmation
          if (name === 'getProxyUsers') {
            return {
              content: [
                {
                  type: 'text',
                  text: `✅ Proxy user successfully set to: ${typedArgs.proxy_user_id.trim()}\n\nThis proxy user will be used for all subsequent API calls until changed.`,
                },
              ],
            };
          }
        }
        op = this.operationMap.get(name);
        if (!op) {
          throw new Error(`Unknown tool: ${name}`);
        }

        const argsOrEmpty = typedArgs || {};

        // Build URL with path params
        // Use stored flag indicating if original path had trailing slash
        const originalPathHasTrailingSlash = op.pathHasTrailingSlash === true;
        console.error('originalPathHasTrailingSlash', originalPathHasTrailingSlash);
        console.error('op.path', op.path);
        urlPath = op.path;
        const missingInputs: Array<{ name: string; description?: string; in?: string; schema?: any }> = [];
        if (op.pathParams && op.pathParams.length > 0) {
          for (const p of op.pathParams) {
            const v = argsOrEmpty[p] ?? argsOrEmpty[p.replace(/[-.]/g, '_')];
            if (v === undefined) {
              // Collect for elicitation instead of throwing
              const def = (op.paramDefs?.path || []).find((pd: any) => pd.name === p);
              missingInputs.push({ name: p.replace(/[-.]/g, '_'), description: def?.description, in: 'path', schema: def?.schema });
            } else {
              urlPath = urlPath.replace(`{${p}}`, encodeURIComponent(String(v)));
            }
          }
        }
        // Restore trailing slash if it was present in the original path from OpenAPI spec
        if (originalPathHasTrailingSlash && !urlPath.endsWith('/')) {
          urlPath = urlPath + '/';
        }

        // Query params
        queryParams = {};
        if (op.queryParams && op.queryParams.length > 0) {
          for (const q of op.queryParams) {
            const val = argsOrEmpty[q] ?? argsOrEmpty[q.replace(/[-.]/g, '_')];
            if (val !== undefined) {
              queryParams[q] = val;
            } else {
              // If required by spec, elicit
              const def = (op.paramDefs?.query || []).find((pd: any) => pd.name === q);
              if (def?.required) missingInputs.push({ name: q.replace(/[-.]/g, '_'), description: def?.description, in: 'query', schema: def?.schema });
            }
          }
        }

        // Headers (from parameters only; security handled below)
        headers = {};
        if (op.headerParams && op.headerParams.length > 0) {
          for (const h of op.headerParams) {
            let val = argsOrEmpty[h] ?? argsOrEmpty[h.replace(/[-.]/g, '_')];
            
            // Special case: x-access-token uses amazonAccessToken
            if (h === 'x-access-token' && !val) {
              // Try to get Amazon access token if not provided
              if (!this.apiClient['amazonAccessToken']) {
                try {
                  await this.apiClient.getAmazonAccessToken();
                } catch (error) {
                  // If we can't get Amazon token, continue without it
                }
              }
              val = this.apiClient['amazonAccessToken'];
            }
            
            if (val !== undefined) {
              headers[h] = val;
            } else {
              const def = (op.paramDefs?.header || []).find((pd: any) => pd.name === h);
              if (def?.required) {
                missingInputs.push({ name: h.replace(/[-.]/g, '_'), description: def?.description, in: 'header', schema: def?.schema });
              }
            }
          }
        }

        // Request body
        data = argsOrEmpty.body !== undefined ? argsOrEmpty.body : undefined;
        if (op.bodyRequired && data === undefined) {
          missingInputs.push({ name: 'body', description: 'Request body', in: 'body', schema: op.bodySchema || { type: 'object' } });
        }

        // Elicit missing inputs (exclude tokens)
        const filteredMissing = missingInputs.filter((mi) => mi.name !== 'api_token');
        if (filteredMissing.length > 0) {
            return {
            content: [],
            requires: filteredMissing.map((mi) => ({ name: mi.name, description: mi.description, schema: mi.schema })),
            isError: false,
          } as any;
        }

        // Apply per-operation security based on OpenAPI spec
        const security = op.security as any[] | undefined;
        let useBasicAuth = false;
        if (security && security.length > 0) {
          // Security is an array of requirement objects; treat as OR, pick first applicable
          const requirement = security[0];
          
          // First, check if any scheme requires basic_auth (priority check)
          for (const schemeName of Object.keys(requirement)) {
            const scheme = this.openApi?.components?.securitySchemes?.[schemeName];
            if (!scheme) continue;
            const type = String(scheme.type || '').toLowerCase();
            // Check for basic auth in http, https, or any scheme that specifies 'basic'
            if (type === 'http' || type === 'https') {
              const httpScheme = String(scheme.scheme || '').toLowerCase();
              if (httpScheme === 'basic') {
                useBasicAuth = true;
                break;
              }
            }
            // Also check if scheme name or other properties indicate basic auth
            const schemeNameLower = String(schemeName || '').toLowerCase();
            if (schemeNameLower.includes('basic') || schemeNameLower.includes('basic_auth')) {
              useBasicAuth = true;
              break;
            }
          }
          
          // If basic auth is required, explicitly remove Authorization header
          if (useBasicAuth) {
            delete headers['Authorization'];
            console.error('[AUTH] Using basic_auth for operation:', name, 'path:', urlPath);
          } else {
            // If basic auth is not required, check for bearer token
            for (const schemeName of Object.keys(requirement)) {
              const scheme = this.openApi?.components?.securitySchemes?.[schemeName];
              if (!scheme) continue;
              const type = String(scheme.type || '').toLowerCase();
              // Check for bearer auth in http, https, or any scheme that specifies 'bearer'
              if (type === 'http' || type === 'https') {
                const httpScheme = String(scheme.scheme || '').toLowerCase();
                if (httpScheme === 'bearer') {
                  const token = argsOrEmpty.api_token || this.apiClient['apiToken'];
                  if (!token) {
                    // Attempt authenticate to obtain token
                    await this.apiClient.authenticate();
                  }
                  const finalToken = argsOrEmpty.api_token || this.apiClient['apiToken'];
                  if (!finalToken) throw new Error('Missing bearer token (api_token)');
                  headers['Authorization'] = `Bearer ${finalToken}`;
                  break; // Only need one bearer token
                }
              }
            }
          }
        }
        op.useBasicAuth = useBasicAuth;

        const axiosConfig: any = {
          method: op.method,
          url: urlPath,
          params: Object.keys(queryParams).length ? queryParams : undefined,
          data,
          headers,
        };
        if (op.useBasicAuth === true) {
          const username = this.apiClient['config'].username;
          const password = this.apiClient['config'].password;
          if (!username || !password) {
            throw new Error('SCANPOWER_USERNAME and SCANPOWER_PASSWORD are required for basic authentication');
          }
          axiosConfig.auth = {
            username,
            password,
          };
          console.error('[AUTH] Basic auth credentials configured for:', urlPath, 'username:', username);
        }

        const response = await this.apiClient['client'].request(axiosConfig);

        // Special behavior: for getProxyUsers, return formatted list with selection instructions
        if (name === 'getProxyUsers') {
          const dataOut = response.data;
          let users: Array<{ id: string; name?: string }> = [];
          if (Array.isArray(dataOut)) {
            users = (dataOut as Array<Record<string, any>>)
              .map((u: Record<string, any>) => ({ id: String(u?.id ?? ''), name: u?.name ? String(u.name) : undefined }))
              .filter((u: { id: string; name?: string }) => !!u.id);
          } else if (dataOut && Array.isArray((dataOut as any).items)) {
            users = ((dataOut as any).items as Array<Record<string, any>>)
              .map((u: Record<string, any>) => ({ id: String(u?.id ?? ''), name: u?.name ? String(u.name) : undefined }))
              .filter((u: { id: string; name?: string }) => !!u.id);
          }

          if (users.length > 0) {
            // Format the response to include structured data and instructions
            const usersList = users.map((u, idx) => `${idx + 1}. ${u.name || 'Unnamed'} (ID: ${u.id})`).join('\n');
            const responseText = `Available Proxy Users:\n\n${usersList}\n\nTo set a proxy user for subsequent API calls, call getProxyUsers again with the 'proxy_user_id' parameter set to one of the IDs above.\n\nExample: Call getProxyUsers with arguments: {"proxy_user_id": "${users[0].id}"}`;
            
            // Also include structured JSON for parsing
            return {
              content: [
                {
                  type: 'text',
                  text: responseText,
                },
                {
                  type: 'text',
                  text: `\n\n[STRUCTURED_DATA]\n${JSON.stringify({ proxyUsers: users, selected: null }, null, 2)}\n[/STRUCTURED_DATA]`,
                },
              ],
            };
          }
          // If no users found, fall through to return raw data
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error) {
        // Build full request details for debugging
        const requestDetails = {
          toolName: name,
          arguments: typedArgs,
          axiosConfig: {
            method: op.method,
            url: urlPath,
            params: Object.keys(queryParams).length ? queryParams : undefined,
            data,
            headers,
          },
        };  
        console.error('Request Details:', JSON.stringify(requestDetails, null, 2));
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}\n\nFull Request Details:\n${JSON.stringify(requestDetails, null, 2)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async loadOpenApiAndGenerateTools(): Promise<void> {
    const specSource = process.env.SCANPOWER_OPENAPI_SPEC;

    const generateFromCurrentOpenApi = () => {
      if (!this.openApi) {
        this.generatedTools = [];
        this.operationMap.clear();
        return;
      }

      // Override server URLs with configured base URL
      if (this.apiClient['config'].baseUrl) {
        this.openApi.servers = [{ url: this.apiClient['config'].baseUrl }];
      }

      const tools: Tool[] = [];
      const opMap: Map<string, any> = new Map();
      const paths = this.openApi.paths || {};
      const methods = ['get', 'post', 'put', 'delete', 'patch'];

      // Debug: Check if /account/ exists in paths object
      if (paths['/account/'] || paths['/account']) {
        console.error('[DEBUG] Path /account/ exists:', !!paths['/account/'], 'Path /account exists:', !!paths['/account']);
      }

      for (const pathKey of Object.keys(paths)) {
        //console.error('pathKey', pathKey);
        const pathItem = paths[pathKey] || {};
        for (const m of methods) {
          const op = pathItem[m];
          if (!op) continue;
          const operationId = op.operationId || `${m}_${pathKey.replace(/[^a-zA-Z0-9]+/g, '_')}`;
          const description = op.summary || op.description || `${m.toUpperCase()} ${pathKey}`;

          // Collect parameters and resolve references
          const rawParams = [...(pathItem.parameters || []), ...(op.parameters || [])];
          const params = rawParams.map((p: any) => {
            if (p.$ref) {
              // Resolve reference
              const refPath = p.$ref.replace('#/', '').split('/');
              let resolved = this.openApi;
              for (const part of refPath) {
                resolved = resolved?.[part];
              }
              return resolved || p;
            }
            return p;
          });
          const pathParams = params.filter((p: any) => p.in === 'path').map((p: any) => p.name);
          const queryParams = params.filter((p: any) => p.in === 'query').map((p: any) => p.name);
          const headerParams = params.filter((p: any) => p.in === 'header').map((p: any) => p.name);
          const paramDefsByIn: any = { path: [], query: [], header: [] };
          for (const p of params) {
            if (p.in === 'path') paramDefsByIn.path.push(p);
            if (p.in === 'query') paramDefsByIn.query.push(p);
            if (p.in === 'header') paramDefsByIn.header.push(p);
          }

          const inputSchemaProps: any = {};
          for (const p of pathParams) inputSchemaProps[p.replace(/[-.]/g, '_')] = { type: 'string' };
          for (const q of queryParams) inputSchemaProps[q.replace(/[-.]/g, '_')] = { type: ['string', 'number', 'boolean', 'array', 'object'] };
          for (const h of headerParams) inputSchemaProps[h.replace(/[-.]/g, '_')] = { type: 'string' };

          // Request body support (JSON only)
          let requiresBody = false;
          let bodySchema: any = undefined;
          if (op.requestBody && op.requestBody.content) {
            const contentTypes = Object.keys(op.requestBody.content);
            if (contentTypes.includes('application/json')) {
              requiresBody = true;
              bodySchema = op.requestBody.content['application/json']?.schema;
            }
          }
          if (requiresBody) {
            inputSchemaProps['body'] = { type: ['object', 'array', 'string', 'number', 'boolean', 'null'] };
          }

          // Add api_token for auth convenience
          inputSchemaProps['api_token'] = { type: 'string', description: 'Optional token for bearer/apiKey auth' };

          const required: string[] = [];
          // Path params are typically required
          for (const p of pathParams) required.push(p.replace(/[-.]/g, '_'));

          tools.push({
            name: operationId,
            description,
            inputSchema: {
              type: 'object',
              properties: inputSchemaProps,
              required: required.length ? required : undefined,
            },
          });

          // Store whether the original path has a trailing slash
          // Also check the paths object directly to see if /account/ exists separately
          let pathHasTrailingSlash = pathKey && pathKey.endsWith('/');
          
          // Special case: if path is /account but the API requires /account/
          // Check if this operation is known to need trailing slash (getProxyUsers)
          if (!pathHasTrailingSlash && pathKey === '/account' && operationId === 'getProxyUsers') {
            // Check if /account/ also exists in paths (it shouldn't if we're in /account branch)
            // But if the API requires /account/, we should add it
            pathHasTrailingSlash = true; // Force trailing slash for getProxyUsers
            console.error('[TOOLS] Forcing trailing slash for getProxyUsers - path will be /account/');
          }
          
          // Debug: verify trailing slash handling for specific operations
          if (operationId === 'getProxyUsers') {
            console.error('[TOOLS] getProxyUsers path:', pathKey, 'pathHasTrailingSlash:', pathHasTrailingSlash);
          }
          opMap.set(operationId, {
            method: m.toUpperCase(),
            path: pathKey, // Preserve original path including trailing slash
            pathHasTrailingSlash, // Store flag to restore trailing slash later
            pathParams,
            queryParams,
            headerParams,
            paramDefs: paramDefsByIn,
            security: op.security || this.openApi.security || [],
            bodyRequired: requiresBody,
            bodySchema,
          });
        }
      }

      this.generatedTools = tools;
      //console.error('generatedTools', this.generatedTools);
      this.operationMap = opMap;
      this.isReady = true;
    };

    // Check if specSource is a URL (http/https) or blob URL
    if (specSource && (/^https?:\/\//i.test(specSource) || /^blob:https?:\/\//i.test(specSource))) {
      // Load asynchronously from URL
      console.error(`Loading OpenAPI spec from URL: ${specSource}`);
      this.openApi = null;
      this.generatedTools = [];
      this.operationMap.clear();
      
      // Skip blob URLs as they can't be fetched via HTTP
      if (/^blob:https?:\/\//i.test(specSource)) {
        console.error('Blob URLs cannot be fetched via HTTP. Please provide a direct HTTP/HTTPS URL to the OpenAPI spec.');
        this.isReady = true; // Set ready even if no spec
        return;
      }
      
      try {
        const resp = await axios.get(specSource, { 
          timeout: 30000, 
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ScanPower-MCP-Server/1.0.0'
          }
        });
        
        try {
          let data = resp.data;
          
          // If response is a string, try to parse it as JSON
          if (typeof data === 'string') {
            // Try to fix common JSON issues like trailing commas
            data = data.replace(/,(\s*[}\]])/g, '$1');
            this.openApi = JSON.parse(data);
          } else {
            this.openApi = data;
          }
          
          generateFromCurrentOpenApi();
          console.error('OpenAPI spec loaded from URL. Tools generated.');
        } catch (e) {
          console.error('Failed to parse OpenAPI spec from URL. Dynamic tools disabled.', e);
          this.openApi = null;
          this.generatedTools = [];
          this.operationMap.clear();
          this.isReady = true; // Set ready even if no spec
        }
      } catch (e) {
        console.error('Failed to fetch OpenAPI spec from URL. Dynamic tools disabled.', e);
        this.openApi = null;
        this.generatedTools = [];
        this.operationMap.clear();
        this.isReady = true; // Set ready even if no spec
      }
      return;
    }
  }

  async run(): Promise<void> {
    // Load OpenAPI spec and generate tools first
    await this.loadOpenApiAndGenerateTools();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('ScanPower MCP server running on stdio');
  }
}

// Start the server
const server = new ScanPowerMCPServer();
server.run().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
