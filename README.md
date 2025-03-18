# n8n-nodes-shippo

This is an n8n community node for integrating with the Shippo API. It allows you to automate shipping operations using n8n workflows.

## Installation

Follow these steps to install this node in your n8n instance:

```bash
npm install n8n-nodes-shippo
```

## Credentials

To use this node, you'll need a Shippo API token. You can obtain one by:

1. Creating an account at [Shippo](https://goshippo.com)
2. Navigate to Settings → API
3. Generate either a Test or Live API token

Configure your credentials in n8n:
- **Environment**: Choose between Test (sandbox) or Live (production)
- **API Token**: Your Shippo API token (starts with either `shippo_test_` or `shippo_live_`)

## Features

This node supports various Shippo API operations including:

- Address validation
- Shipping rate calculations
- Label creation
- Tracking information
- Parcel management
- Customs declarations

## Usage

1. Add the Shippo node to your workflow
2. Configure your Shippo credentials
3. Select the desired operation
4. Configure the operation parameters
5. Connect to other nodes in your workflow

## Support

- Documentation: [Shippo API Documentation](https://docs.goshippo.com/)
- Issues: Please report any issues in the GitHub repository
- Maintainer: Your Name/Organization

## License

[MIT](LICENSE.md)
