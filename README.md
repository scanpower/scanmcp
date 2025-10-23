# ScanPower MCP Server

A Model Context Protocol (MCP) server that provides access to the ScanPower API for Amazon FBA and e-commerce operations.

## Overview

This MCP server enables you to interact with the ScanPower API through MCP-compatible clients. ScanPower is a platform to sellers and 3PLs manage Amazon FBA operations, purchase orders, outbound shipments, item/box/pallet labeling, and catalog operations.

## Features

- **Flexible Authentication**: Supports both automatic authentication and manual API token passing
- **Token Management**: Automatic token retrieval when not provided, with optional manual token passing
- **Amazon SP-API Integration**: Provides access to Amazon's Selling Partner API through ScanPower
- **FBA Operations**: Manage inbound shipments, packing options, and inventory
- **Prep Billing**: Manage prep matrix, price tiers, and billing
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
   SCANPOWER_OPENAPI_SPEC=https://unity.scanpower.com/docs/api/scanpower-api-bundled.json

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

- **`getUsers`**: Get a list of active users (parent and sub users)
- **`getProxyUsers`**: Get a list of Client Proxy Users
- **`getApiToken`**: All other API calls require the token that this endpoint provides
- **`getAccessToken`**: Get an access token from Amazon with which to make SP-API calls

#### Catalog Operations

- **`searchCatalogItems`**: Search Catalog Items
- **`catalogSearch`**: Catalog Search

#### FBA Inbound Operations

- **`listInboundPlans`**: List InboundPlans
- **`createInboundPlan`**: Create Inbound Plan
- **`getInboundPlan`**: Get Inbound Plan
- **`listInboundPlanBoxes`**: List InboundPlan Boxes
- **`cancelInboundPlan`**: Cancel InboundPlan
- **`listInboundPlanItems`**: List InboundPlan Items
- **`updateInboundPlanName`**: Update InboundPlan Name
- **`listPackingGroupBoxes`**: List PackingGroup Boxes
- **`listPackingGroupItems`**: List PackingGroup Items
- **`setPackingInformation`**: Set Packing Information
- **`listPackingOptions`**: List Packing Options
- **`generatePackingOptions`**: Generate Packing Options
- **`confirmPackingOption`**: Confirm Packing Option
- **`listInboundPlanPallets`**: List InboundPlan Pallets
- **`listPlacementOptions`**: List Placement Options
- **`generatePlacementOptions`**: Generate Placement Options
- **`confirmPlacementOption`**: Confirm Placement Option

#### Shipment Operations

- **`getShipment`**: Get Shipment
- **`listShipmentBoxes`**: List Shipment Boxes
- **`listShipmentContentUpdatePreviews`**: List ShipmentContent UpdatePreviews
- **`generateShipmentContentUpdatePreviews`**: Generate ShipmentContent UpdatePreviews
- **`getShipmentContentUpdatePreview`**: Get ShipmentContent UpdatePreview
- **`confirmShipmentContentUpdatePreview`**: Confirm ShipmentContent UpdatePreview
- **`getDeliveryChallanDocument`**: Get DeliveryChallan Document
- **`listDeliveryWindowOptions`**: List DeliveryWindow Options
- **`generateDeliveryWindowOptions`**: Generate DeliveryWindow Options
- **`confirmDeliveryWindowOptions`**: Confirm DeliveryWindow Options
- **`listShipmentItems`**: List ShipmentItems
- **`updateShipmentName`**: Update Shipment Name
- **`listShipmentPallets`**: List Shipment Pallets
- **`cancelSelfShipAppointment`**: Cancel SelfShip Appointment
- **`getSelfShipAppointmentSlots`**: Get SelfShip Appointment Slots
- **`generateSelfShipAppointmentSlots`**: Generate SelfShip Appointment Slots
- **`scheduleSelfShipAppointment`**: Schedule SelfShip Appointment
- **`updateShipmentSourceAddress`**: Update ShipmentSource Address
- **`updateShipmentTrackingDetails`**: Update Shipment TrackingDetails
- **`listTransportationOptions`**: List Transportation Options
- **`generateTransportationOptions`**: Generate Transportation Options
- **`confirmTransportationOptions`**: Confirm Transportation Options

#### Compliance & Prep Operations

- **`listItemComplianceDetails`**: List ItemCompliance Details
- **`updateItemComplianceDetails`**: Update ItemCompliance Details
- **`createMarketplaceItemLabels`**: Create Marketplace ItemLabels
- **`listPrepDetails`**: List Prep Details
- **`setPrepDetails`**: Set Prep Details
- **`getInboundOperationStatus`**: Get InboundOperation Status
- **`getBillOfLading`**: Get BillOfLading
- **`getLabels`**: Get Labels

#### Inventory & Batch Operations

- **`getInboundPlans`**: Get InboundPlans
- **`createInboundPlanFromBatch`**: Create an inbound plan from the items in the provided batch
- **`submitBoxes`**: Submit Boxes
- **`scoutSearch`**: Wrapper around several SP-API calls for loading product, offers, and pricing data
- **`selectBoxes`**: List boxes for a v1 Amazon batch
- **`insertBox`**: Insert a Box
- **`deleteBox`**: Delete a Box
- **`selectBox`**: Get a Box
- **`updateBox`**: Delete Box
- **`selectBoxItems`**: List BoxItems
- **`insertBoxItem`**: Insert BoxItem
- **`deleteBoxItem`**: Delete BoxItem
- **`updateBoxItem`**: Update BoxItem
- **`selectInventory`**: Select Inventory
- **`selectPallets`**: List Pallets
- **`insertPallet`**: Insert Pallet
- **`getMobileInventory`**: Returns found Inventory and Buylist quantities from the database grouped by Condition
- **`deletePallet`**: Delete Pallet
- **`selectPallet`**: List Pallet
- **`updatePallet`**: Update Pallet

#### Purchase Orders

- **`PurchaseOrders`**: Get a list of Purchase Orders
- **`CreatePurchaseOrder`**: Create a single purchase order
- **`UpdatePurchaseOrder`**: Update a purchase order. This does not change any of the items in the PO
- **`PurchaseOrderItems`**: Get a list of purchase order items
- **`CreatePurchaseOrderItems`**: Add items to a purchase order
- **`UpdatePurchaseOrderItem`**: Update a single purchase order item

#### Batch Operations

- **`Batches`**: Get Batches
- **`CreateBatch`**: Create Batch
- **`UpdateBatch`**: Update Batch
- **`BatchItems`**: Get BatchItems
- **`CreateBatchItems`**: CreateBatchItems
- **`UpdateBatchItemGql`**: Update BatchItem
- **`ImportPurchaseOrderItems`**: Import PurchaseOrderItems
- **`Buylist`**: Get Buylist items
- **`Inventory`**: Get Inventory
- **`UpdateInventoryItems`**: Update InventoryItems
- **`createBuylist`**: Create Buylist items
- **`getPackHistory`**: Get PackHistory

#### Walmart Operations

- **`getWmAccessToken`**: Get Walmart AccessToken
- **`itemSetupByMatch`**: Get ItemSetup by Match
- **`bulkInventoryUpdate`**: Bulk Inventory Update
- **`allFeedStatuses`**: Get All FeedStatuses
- **`retireAnItem`**: Retire an Inventory Item
- **`itemLabel`**: Generate item labels
- **`selectBatches`**: List Batches
- **`insertBatches`**: Insert Batches
- **`selectBatch`**: Get Walmart Batch by ID
- **`updateBatches`**: Update Batches
- **`deleteBatches`**: Delete Batches
- **`selectBatchItems`**: List BatchItems
- **`insertBatchItems`**: Insert BatchItems
- **`updateBatchItems`**: Update BatchItems
- **`updateBatchItem`**: Update BatchItem
- **`deleteBatchItems`**: Delete BatchItems
- **`getInboundShipments`**: Get InboundShipments
- **`createInboundShipment`**: Create InboundShipment
- **`fetchInboundPreview`**: Fetch InboundPreview
- **`updateShipmentQuantities`**: Update Shipment Quantities
- **`updateWmShipmentTrackingDetails`**: Update Walmart Shipment Tracking Details
- **`createCarrierRateQuote`**: Create Carrier RateQuote
- **`selectWmShipments`**: Select Walmart Shipments from the database
- **`selectWmShipment`**: Select a single Walmart Shipment by Id
- **`selectWmBoxes`**: Select Walmart Boxes from the database
- **`insertWmBoxes`**: Insert Walmart Boxes into our database
- **`updateWmBoxes`**: Update Walmart Boxes into our database
- **`selectWmBox`**: Select a single Walmart Box by Id
- **`deleteWmBoxes`**: Delete one or more Walmart Boxes by Id
- **`createInboundShipmentLabel`**: Create InboundShipment Label
- **`printCarrierLabel`**: Print Walmart Carrier Label
- **`getInboundShipmentErrors`**: Get InboundShipment Errors
- **`getInboundShipmentItems`**: Get InboundShipment Items
- **`cancelInboundShipment`**: Cancel InboundShipment

#### Prep Matrix & Billing

- **`selectPrepMatrixProducts`**: Get all Prep Matrix Product mappings
- **`insertPrepMatrixProducts`**: Create multiple Prep Matrix Product mappings
- **`selectPrepMatrixProduct`**: Get a specific Prep Matrix Product mapping by external_id
- **`updatePrepMatrixProducts`**: Update a Prep Matrix Product mapping by external_id
- **`deletePrepMatrixProducts`**: Delete one or more Prep Matrix Product mapping by external_id
- **`selectPrepMatrices`**: Get all Prep Types
- **`insertPrepMatrices`**: Create multiple Prep Type matrices
- **`prepCenterBillingReport`**: Get the billing report for a given time period
- **`prepCenterBillingReportPost`**: Get the billing report for a given time period
- **`selectShipmentPrepMatrices`**: Get shipment-level ad hoc charges
- **`selectShipmentPrepMatricesPost`**: Get shipment-level ad hoc charges
- **`insertShipmentPrepMatrices`**: Add one or more shipment-level ad hoc charges
- **`updateShipmentPrepMatrices`**: Update or delete one or more shipment-level ad hoc charges
- **`selectPrepMatrix`**: Get a specific Prep Type Matrix by ID
- **`updatePrepMatrices`**: Update one or more Prep Type Matrices by ID
- **`deletePrepMatrices`**: Delete one or more Prep Type Matrices by ID

#### Webhooks & Carrier Operations

- **`selectWebHooks`**: List WebHooks
- **`generateWebHookSecretKey`**: Generate WebHook SecretKey
- **`testWebHook`**: Test WebHook
- **`updateWebHook`**: Update WebHook
- **`deleteWebHook`**: Delete WebHook
- **`getCarrierRateQuote`**: Get Carrier RateQuote
- **`confirmCarrierRateQuote`**: Confirm Carrier RateQuote
- **`cancelCarrierRateQuote`**: Cancel Carrier RateQutoe

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

This MCP server is based on the ScanPower API v2.0 specification. For detailed information about the underlying API endpoints and their parameters, refer to the [ScanPower API documentation](https://unity.scanpower.com/docs/api/index.html).

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
