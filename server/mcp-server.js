const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { z } = require("zod");
const axios = require("axios");

// Configuration
const API_URL = "http://localhost:4000/api";
const PORT = process.env.PORT || 4000;

// Create server instance
const server = new Server(
    {
        name: "whatsapp-dashboard-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
            resources: {},
        },
    }
);

// Tools Definition
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_connections",
                description: "Get a list of all active WhatsApp connections",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "send_message",
                description: "Send a WhatsApp message via a specific connection",
                inputSchema: {
                    type: "object",
                    properties: {
                        connectionId: {
                            type: "string",
                            description: "The ID of the WhatsApp connection to use",
                        },
                        number: {
                            type: "string",
                            description: "The phone number to send the message to (e.g., 628123456789)",
                        },
                        message: {
                            type: "string",
                            description: "The text message content",
                        },
                    },
                    required: ["connectionId", "number", "message"],
                },
            },
            {
                name: "disconnect_connection",
                description: "Disconnect a specific WhatsApp session",
                inputSchema: {
                    type: "object",
                    properties: {
                        connectionId: {
                            type: "string",
                            description: "The ID of the connection to disconnect",
                        },
                    },
                    required: ["connectionId"],
                },
            },
        ],
    };
});

// Resources Definition
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    // We can dynamically list resources based on active connections
    try {
        const response = await axios.get(`${API_URL}/connections`);
        const connections = response.data;

        const resources = connections.map(conn => ({
            uri: `whatsapp://${conn.connectionId}/messages`,
            name: `Messages for ${conn.connectionId}`,
            mimeType: "application/json",
            description: `Recent messages for connection ${conn.connectionId}`
        }));

        return { resources };
    } catch (error) {
        // If server is down, return empty or static
        return { resources: [] };
    }
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.uri;
    const match = uri.match(/^whatsapp:\/\/([^/]+)\/messages$/);

    if (match) {
        const connectionId = match[1];
        try {
            const sentResponse = await axios.get(`${API_URL}/${connectionId}/outgoing-messages`);
            const receivedResponse = await axios.get(`${API_URL}/${connectionId}/messages`);

            const combined = [
                ...sentResponse.data.messages.map(m => ({ ...m, type: 'outgoing' })),
                ...receivedResponse.data.messages.map(m => ({ ...m, type: 'incoming' }))
            ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return {
                contents: [
                    {
                        uri: uri,
                        mimeType: "application/json",
                        text: JSON.stringify(combined, null, 2),
                    },
                ],
            };
        } catch (error) {
            throw new Error(`Failed to fetch messages for ${connectionId}: ${error.message}`);
        }
    }

    throw new Error(`Resource not found: ${uri}`);
});

// Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
        case "get_connections": {
            try {
                const response = await axios.get(`${API_URL}/connections`);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error: ${error.message}` }],
                    isError: true,
                };
            }
        }

        case "send_message": {
            const { connectionId, number, message } = request.params.arguments;
            try {
                const response = await axios.post(`${API_URL}/${connectionId}/send-message`, {
                    number,
                    message,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Message sent successfully: ${JSON.stringify(response.data)}`,
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error sending message: ${error.response?.data?.message || error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
        }

        case "disconnect_connection": {
            const { connectionId } = request.params.arguments;
            try {
                const response = await axios.post(`${API_URL}/connections/disconnect`, { connectionId });
                return {
                    content: [{ type: 'text', text: `Disconnected: ${JSON.stringify(response.data)}` }]
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error disconnecting: ${error.message}` }],
                    isError: true
                };
            }
        }

        default:
            throw new Error("Unknown tool");
    }
});

// Start Server
async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

runServer().catch(console.error);
