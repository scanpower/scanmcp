# ScanPower MCP Server

A Model Context Protocol (MCP) server that provides access to the ScanPower API for Amazon FBA and e-commerce operations.

## Overview

This MCP server enables you to interact with the ScanPower API through MCP-compatible clients. ScanPower is a platform that helps sellers manage their Amazon FBA operations, including inbound shipments, inventory management, and catalog operations.

## Features

- **Flexible Authentication**: Supports both automatic authentication and manual API token passing
- **Token Management**: Automatic token retrieval when not provided, with optional manual token passing
- **Amazon SP-API Integration**: Provides access to Amazon's Selling Partner API through ScanPower
- **FBA Operations**: Manage inbound shipments, packing options, and inventory
- **Catalog Operations**: Search and manage Amazon catalog items
- **User Management**: Access user accounts and proxy user functionality

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your ScanPower credentials:
   ```env
   # ScanPower API Configuration
   SCANPOWER_BASE_URL=https://api.scanpower.com
   SCANPOWER_USERNAME=your_username
   SCANPOWER_PASSWORD=your_password
   
   # Optional: Proxy user ID for making calls on behalf of another user
   SCANPOWER_PROXY_USER_ID=
   
   # Amazon SP-API Configuration (for Amazon-specific operations)
   AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER
   AMAZON_ACCESS_KEY_ID=your_access_key
   AMAZON_SECRET_ACCESS_KEY=your_secret_key
   AMAZON_ROLE_ARN=your_role_arn
   ```

## Usage

### Running the Server

```bash
npm start
```

Or for development:
```bash
npm run dev
```

### Available Tools

The server provides the following MCP tools:

#### Authentication & User Management

- **`get_users`**: Get a list of active users (parent and sub users)
  - Parameters: `api_token` (optional) - API token for authentication
- **`get_proxy_users`**: Get a list of client proxy users
  - Parameters: `proxy` (optional) - Proxy indicator, `api_token` (optional) - API token
- **`get_api_token`**: Get an API token for authentication
  - Parameters: `proxy_user_id` (optional) - User ID for proxy access
- **`get_amazon_access_token`**: Get an access token from Amazon for SP-API calls
  - Parameters: `marketplace` (optional) - Marketplace ID, `api_token` (optional) - API token

#### Catalog Operations

- **`search_catalog_items`**: Search Amazon catalog items
  - Parameters:
    - `keywords` (string, required): Keywords to search for
    - `marketplace_ids` (array, required): Marketplace IDs to search in
    - `page_size` (number, optional): Number of results per page (default: 10)
    - `page_token` (string, optional): Token for pagination
    - `api_token` (string, optional): API token for authentication

#### FBA Inbound Operations

- **`list_inbound_plans`**: List FBA inbound shipment plans
  - Parameters:
    - `page_size` (number, optional): Number of results per page (default: 10)
    - `page_token` (string, optional): Token for pagination
    - `api_token` (string, optional): API token for authentication

- **`get_inbound_plan`**: Get details of a specific inbound plan
  - Parameters:
    - `inbound_plan_id` (string, required): The ID of the inbound plan
    - `api_token` (string, optional): API token for authentication

- **`list_inbound_plan_items`**: List items in an inbound plan
  - Parameters:
    - `inbound_plan_id` (string, required): The ID of the inbound plan
    - `page_size` (number, optional): Number of results per page (default: 10)
    - `page_token` (string, optional): Token for pagination
    - `api_token` (string, optional): API token for authentication

- **`list_packing_options`**: List available packing options for an inbound plan
  - Parameters:
    - `inbound_plan_id` (string, required): The ID of the inbound plan
    - `api_token` (string, optional): API token for authentication

- **`generate_packing_options`**: Generate packing options for an inbound plan
  - Parameters:
    - `inbound_plan_id` (string, required): The ID of the inbound plan
    - `list` (boolean, optional): Whether to list and save the generated options (default: false)
    - `api_token` (string, optional): API token for authentication

## Example Usage

### Search for Catalog Items

```json
{
  "tool": "search_catalog_items",
  "arguments": {
    "keywords": "wireless headphones",
    "marketplace_ids": ["ATVPDKIKX0DER"],
    "page_size": 20
  }
}
```

### Using API Token (Optional)

```json
{
  "tool": "search_catalog_items",
  "arguments": {
    "keywords": "wireless headphones",
    "marketplace_ids": ["ATVPDKIKX0DER"],
    "page_size": 20,
    "api_token": "your_api_token_here"
  }
}
```

### List Inbound Plans

```json
{
  "tool": "list_inbound_plans",
  "arguments": {
    "page_size": 10
  }
}
```

### Get Inbound Plan Details

```json
{
  "tool": "get_inbound_plan",
  "arguments": {
    "inbound_plan_id": "your-plan-id-here"
  }
}
```

## Error Handling

The server includes comprehensive error handling for:

- Authentication failures
- API rate limiting
- Invalid parameters
- Network connectivity issues
- Amazon SP-API errors

All errors are returned in a standardized format with descriptive error messages.

## Development

### Project Structure

```
scanpower-mcp-server/
├── src/
│   └── index.ts          # Main server implementation
├── dist/                 # Compiled JavaScript output
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Environment variables template
└── README.md            # This file
```

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Watching for Changes

```bash
npm run watch
```

## API Reference

This MCP server is based on the ScanPower API v2.0 specification. For detailed information about the underlying API endpoints and their parameters, refer to the [ScanPower API documentation](https://www.scanpower.com).

### Authentication

The server uses basic authentication for initial API access and then manages bearer tokens for subsequent requests. Amazon SP-API operations require additional OAuth2-style authentication which is handled automatically.

### Rate Limiting

The server respects ScanPower's rate limiting policies. If you encounter rate limit errors, the server will return appropriate error messages.

## Support

For issues related to:

- **ScanPower API**: Contact [ScanPower Support](mailto:support@scanpower.com)
- **This MCP Server**: Create an issue in this repository
- **MCP Protocol**: Refer to the [MCP documentation](https://modelcontextprotocol.io)

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Changelog

### v1.0.0
- Initial release
- Support for core ScanPower API operations
- Authentication and token management
- Amazon SP-API integration
- Comprehensive error handling
