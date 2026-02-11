const Client = require('./Client');
const fs = require('fs');
const path = require('path');


class Manager {
    constructor(io) {
        this.connections = new Map();
        this.io = io;
    }

    startConnection(connectionId) {
        if (this.connections.has(connectionId)) {
            return this.connections.get(connectionId);
        }
        const connection = new Client(connectionId, this.io);
        this.connections.set(connectionId, connection);
        connection.connect();
        return connection;
    }

    async disconnectConnection(connectionId) {
        if (this.connections.has(connectionId)) {
            const connection = this.connections.get(connectionId);
            await connection.destroy();
            this.connections.delete(connectionId);
        }
    }

    async disconnectAll() {
        for (const connectionId of Array.from(this.connections.keys())) {
            await this.disconnectConnection(connectionId);
        }
    }

    getConnection(connectionId) {
        return this.connections.get(connectionId);
    }

    getAllConnections() {
        return Array.from(this.connections.values()).map(conn => ({
            connectionId: conn.connectionId,
            status: conn.connectionStatus,
        }));
    }
    async init() {
        // Restore connections from auth_info_multi_device directory
        const authDirBase = path.join(__dirname, '..', '..', '..', 'auth_info_multi_device');
        if (fs.existsSync(authDirBase)) {
            try {
                const dirs = fs.readdirSync(authDirBase, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);

                console.log(`[Manager] Found ${dirs.length} saved sessions.`);
                for (const dir of dirs) {
                    console.log(`[Manager] Restoring connection: ${dir}`);
                    this.startConnection(dir);
                    // Add a small delay between startups to avoid overwhelming
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (err) {
                console.error('[Manager] Failed to restore connections:', err);
            }
        } else {
            console.log('[Manager] No auth directory found, starting fresh.');
        }
    }
}


module.exports = Manager;
