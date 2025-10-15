# ScanPower MCP Server Usage Guide

## Quick Start

1. **Install the server:**
   ```bash
   ./install.sh
   ```

2. **Configure your credentials:**
   Edit the `.env` file with your ScanPower API credentials:
   ```env
   SCANPOWER_USERNAME=your_username
   SCANPOWER_PASSWORD=your_password
   ```

3. **Run the server:**
   ```bash
   npm start
   ```

## MCP Client Integration

### Claude Desktop Configuration

Add this to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "scanpower": {
      "command": "node",
      "args": ["/path/to/scanpower-mcp-server/dist/index.js"],
      "env": {
        "SCANPOWER_USERNAME": "your_username",
        "SCANPOWER_PASSWORD": "your_password"
      }
    }
  }
}
```

### Cursor IDE Integration

Add to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "scanpower": {
      "command": "node",
      "args": ["/path/to/scanpower-mcp-server/dist/index.js"]
    }
  }
}
```

## Common Use Cases

### 1. Search for Products

```javascript
// Search for wireless headphones in the US marketplace
{
  "tool": "search_catalog_items",
  "arguments": {
    "keywords": "wireless headphones",
    "marketplace_ids": ["ATVPDKIKX0DER"],
    "page_size": 20
  }
}
```

### 2. Manage FBA Shipments

```javascript
// List all inbound plans
{
  "tool": "list_inbound_plans",
  "arguments": {
    "page_size": 10
  }
}

// Get details of a specific plan
{
  "tool": "get_inbound_plan",
  "arguments": {
    "inbound_plan_id": "your-plan-id"
  }
}

// Generate packing options
{
  "tool": "generate_packing_options",
  "arguments": {
    "inbound_plan_id": "your-plan-id",
    "list": true
  }
}
```

### 3. User Management

```javascript
// Get all users
{
  "tool": "get_users",
  "arguments": {}
}

// Get proxy users
{
  "tool": "get_proxy_users",
  "arguments": {
    "proxy": "proxy"
  }
}
```

## Error Handling

The server provides detailed error messages for common issues:

- **Authentication errors**: Check your credentials in `.env`
- **Rate limiting**: The server will automatically handle rate limits
- **Invalid parameters**: Check the required parameters for each tool
- **Network issues**: Verify your internet connection and ScanPower API status

## Troubleshooting

### Server won't start
- Ensure Node.js 18+ is installed
- Check that all dependencies are installed: `npm install`
- Verify the build completed: `npm run build`

### Authentication fails
- Verify your ScanPower credentials in `.env`
- Check that your account has API access
- Ensure the base URL is correct

### API calls fail
- Check your internet connection
- Verify ScanPower API status
- Review the error messages for specific issues

## Development

### Adding New Tools

1. Add the tool definition to the `ListToolsRequestSchema` handler
2. Add the implementation to the `CallToolRequestSchema` handler
3. Update the documentation

### Testing

```bash
# Run the test suite
npm test

# Test specific functionality
node test-server.js
```

## Support

- **ScanPower API Issues**: Contact [ScanPower Support](mailto:support@scanpower.com)
- **MCP Server Issues**: Create an issue in this repository
- **General Questions**: Check the README.md for detailed information
