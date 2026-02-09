const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const whatsappService = require('./whatsappService');
const express = require('express');

let mcpServer;

const initMCP = (app) => {
    mcpServer = new Server(
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

    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: "whatsapp_connection_status",
                    description: "Check status of WhatsApp connection",
                    inputSchema: {
                        type: "object",
                        properties: {
                            connectionId: { type: "string" }
                        },
                        required: ["connectionId"]
                    },
                },
                {
                    name: "whatsapp_list_connections",
                    description: "List all available WhatsApp connection IDs",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
                {
                    name: "whatsapp_login_qr",
                    description: "Get QR code for login",
                    inputSchema: {
                        type: "object",
                        properties: {
                            connectionId: { type: "string" }
                        },
                        required: ["connectionId"]
                    },
                },
                {
                    name: "whatsapp_logout",
                    description: "Logout session",
                    inputSchema: {
                        type: "object",
                        properties: {
                            connectionId: { type: "string" }
                        },
                        required: ["connectionId"]
                    },
                },
                {
                    name: "whatsapp_reconnect",
                    description: "Reconnect session",
                    inputSchema: {
                        type: "object",
                        properties: {
                            connectionId: { type: "string" }
                        },
                        required: ["connectionId"]
                    },
                },
                {
                    name: "whatsapp_send_text",
                    description: "Send text message",
                    inputSchema: {
                        type: "object",
                        properties: {
                            connectionId: { type: "string" },
                            to: { type: "string", description: "Phone number" },
                            message: { type: "string" }
                        },
                        required: ["connectionId", "to", "message"]
                    },
                },
                {
                    name: "whatsapp_list_chats",
                    description: "List recent chats",
                    inputSchema: {
                        type: "object",
                        properties: {
                            connectionId: { type: "string" }
                        },
                        required: ["connectionId"]
                    },
                }
            ],
        };
    });

    mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
        try {
            const connections = whatsappService.getAllConnections();

            const resources = connections.map(conn => ({
                uri: `whatsapp://${conn.connectionId}/messages`,
                name: `Messages for ${conn.connectionId}`,
                mimeType: "application/json",
                description: `Recent messages for connection ${conn.connectionId}`
            }));

            return { resources };
        } catch (error) {
            return { resources: [] };
        }
    });

    mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const uri = request.uri;
        const match = uri.match(/^whatsapp:\/\/([^/]+)\/messages$/);

        if (match) {
            const connectionId = match[1];
            try {
                const outgoingObj = await whatsappService.getOutgoingMessages(connectionId);
                const incomingObj = await whatsappService.getMessages(connectionId);

                const outgoing = outgoingObj.messages.map(m => ({ ...m, type: 'outgoing' }));
                const incoming = incomingObj.messages.map(m => ({ ...m, type: 'incoming' }));

                const combined = [...outgoing, ...incoming].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

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

    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const { connectionId } = args;

        switch (name) {
            case "whatsapp_connection_status": {
                if (!connectionId) throw new Error("connectionId is required");
                const status = whatsappService.getStatus(connectionId);
                return { content: [{ type: "text", text: JSON.stringify(status) }] };
            }
            case "whatsapp_list_connections": {
                const connections = whatsappService.getAllConnections();
                return { content: [{ type: "text", text: JSON.stringify(connections) }] };
            }
            case "whatsapp_login_qr": {
                whatsappService.startConnection(connectionId);
                const qr = whatsappService.getQRCode(connectionId);
                return {
                    content: [{
                        type: "text",
                        text: qr.qr ? `QR Code Data: ${qr.qr}` : "QR Code not available yet. Check status."
                    }]
                };
            }
            case "whatsapp_logout": {
                await whatsappService.disconnectConnection(connectionId);
                return { content: [{ type: "text", text: `Logged out ${connectionId}` }] };
            }
            case "whatsapp_reconnect": {
                await whatsappService.disconnectConnection(connectionId);
                whatsappService.startConnection(connectionId);
                return { content: [{ type: "text", text: `Reconnection initiated for ${connectionId}` }] };
            }
            case "whatsapp_send_text": {
                const { to, message } = args;
                await whatsappService.sendMessage(connectionId, to, message);
                return { content: [{ type: "text", text: `Message sent to ${to}` }] };
            }
            case "whatsapp_list_chats": {
                const msgs = await whatsappService.getMessages(connectionId);
                return { content: [{ type: "text", text: JSON.stringify(msgs) }] };
            }
            default:
                throw new Error(`Tool ${name} is not implemented.`);
        }
    });

    const router = express.Router();
    let transport;

    router.get("/sse", async (req, res) => {
        console.log("New MCP SSE connection");
        transport = new SSEServerTransport("/api/mcp/messages", res);
        await mcpServer.connect(transport);
    });

    router.post("/messages", async (req, res) => {
        if (transport) {
            await transport.handlePostMessage(req, res);
        } else {
            res.status(400).send("No active transport");
        }
    });

    app.use("/api/mcp", router);
    console.log("MCP Server initialized at /api/mcp/sse");
};

module.exports = { initMCP };
