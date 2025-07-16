
# n8n-nodes-glideapps

This is an n8n community node for integrating with the Glide Big Tables API. It allows you to automate data operations in Glide using n8n workflows.

## Installation

Follow these steps to install this node in your n8n instance:


```bash
npm install n8n-nodes-glideapps
```


## Credentials

To use this node, you'll need a Glide API key. You can obtain one by:

1. Creating an account at [Glide](https://www.glideapps.com/)
2. Navigating to your team settings
3. Generating an API key for your team

Configure your credentials in n8n:
- **API Key**: Your Glide API key


## Features

This node supports various Glide Big Tables API operations including:

- List, create, and import Big Tables
- Add, update, and delete rows in Big Tables
- Replace table schema or data
- Manage stashes for bulk data operations


## Usage

1. Add the Glide node to your workflow
2. Configure your Glide credentials
3. Select the desired operation (e.g., list tables, add rows)
4. Configure the operation parameters
5. Connect to other nodes in your workflow


## Support

- Documentation: [Glide Big Tables API Documentation](https://www.glideapps.com/docs/api/big-tables)
- Issues: Please report any issues in the GitHub repository
- Maintainer: Kenneth Gordon


## License

[MIT](LICENSE.md)