const { v4: uuidv4 } = require('uuid');

class RunIdGenerator {
    constructor() {
        this.activeRuns = new Map();
        this.correlationChains = new Map();
    }

    /**
     * Generate a new run ID for a pipeline execution
     * @param {Object} options - Options for run ID generation
     * @param {string} options.type - Type of run (pipeline, validation, generation, etc.)
     * @param {string} options.siteId - Site ID if applicable
     * @param {string} options.parentRunId - Parent run ID for correlation
     * @param {Object} options.metadata - Additional metadata
     * @returns {string} Generated run ID
     */
    generateRunId(options = {}) {
        const {
            type = 'pipeline',
            siteId = null,
            parentRunId = null,
            metadata = {}
        } = options;

        const runId = uuidv4();
        const timestamp = new Date().toISOString();

        // Create run context
        const runContext = {
            runId,
            type,
            siteId,
            parentRunId,
            timestamp,
            status: 'started',
            metadata: {
                ...metadata,
                generatedAt: timestamp,
                version: '1.0.0'
            }
        };

        // Store active run
        this.activeRuns.set(runId, runContext);

        // Handle correlation chain
        if (parentRunId) {
            this._addToCorrelationChain(runId, parentRunId);
        }

        return runId;
    }

    /**
     * Get run context by run ID
     * @param {string} runId - Run ID to look up
     * @returns {Object|null} Run context or null if not found
     */
    getRunContext(runId) {
        return this.activeRuns.get(runId) || null;
    }

    /**
     * Update run status
     * @param {string} runId - Run ID to update
     * @param {string} status - New status (started, running, completed, failed)
     * @param {Object} metadata - Additional metadata
     */
    updateRunStatus(runId, status, metadata = {}) {
        const runContext = this.activeRuns.get(runId);
        if (runContext) {
            runContext.status = status;
            runContext.lastUpdated = new Date().toISOString();
            runContext.metadata = {
                ...runContext.metadata,
                ...metadata
            };

            // If completed or failed, move to completed runs after a delay
            if (status === 'completed' || status === 'failed') {
                setTimeout(() => {
                    this._archiveRun(runId);
                }, 300000); // Archive after 5 minutes
            }
        }
    }

    /**
     * Get correlation chain for a run ID
     * @param {string} runId - Run ID to get correlation chain for
     * @returns {Array} Array of run IDs in correlation chain
     */
    getCorrelationChain(runId) {
        return this.correlationChains.get(runId) || [runId];
    }

    /**
     * Get all active runs
     * @returns {Array} Array of active run contexts
     */
    getActiveRuns() {
        return Array.from(this.activeRuns.values());
    }

    /**
     * Get runs by type
     * @param {string} type - Run type to filter by
     * @returns {Array} Array of run contexts of specified type
     */
    getRunsByType(type) {
        return Array.from(this.activeRuns.values())
            .filter(run => run.type === type);
    }

    /**
     * Get runs by site ID
     * @param {string} siteId - Site ID to filter by
     * @returns {Array} Array of run contexts for specified site
     */
    getRunsBySite(siteId) {
        return Array.from(this.activeRuns.values())
            .filter(run => run.siteId === siteId);
    }

    /**
     * Clean up old runs (call periodically)
     * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
     */
    cleanupOldRuns(maxAge = 3600000) {
        const cutoffTime = new Date(Date.now() - maxAge);
        
        for (const [runId, runContext] of this.activeRuns.entries()) {
            const runTime = new Date(runContext.timestamp);
            if (runTime < cutoffTime) {
                this.activeRuns.delete(runId);
                this.correlationChains.delete(runId);
            }
        }
    }

    /**
     * Generate a child run ID for a sub-process
     * @param {string} parentRunId - Parent run ID
     * @param {Object} options - Options for child run
     * @returns {string} Child run ID
     */
    generateChildRunId(parentRunId, options = {}) {
        const parentContext = this.getRunContext(parentRunId);
        if (!parentContext) {
            throw new Error(`Parent run ID ${parentRunId} not found`);
        }

        return this.generateRunId({
            ...options,
            parentRunId,
            type: options.type || `${parentContext.type}-child`,
            siteId: options.siteId || parentContext.siteId
        });
    }

    /**
     * Add run to correlation chain
     * @private
     */
    _addToCorrelationChain(runId, parentRunId) {
        const parentChain = this.correlationChains.get(parentRunId) || [parentRunId];
        const newChain = [...parentChain, runId];
        
        // Update all runs in the chain
        newChain.forEach(id => {
            this.correlationChains.set(id, newChain);
        });
    }

    /**
     * Archive completed run
     * @private
     */
    _archiveRun(runId) {
        const runContext = this.activeRuns.get(runId);
        if (runContext) {
            // In a real implementation, you might want to store this in a database
            // For now, we'll just remove it from active runs
            this.activeRuns.delete(runId);
            this.correlationChains.delete(runId);
        }
    }

    /**
     * Get run statistics
     * @returns {Object} Run statistics
     */
    getStats() {
        const runs = Array.from(this.activeRuns.values());
        const stats = {
            totalRuns: runs.length,
            byType: {},
            byStatus: {},
            bySite: {},
            averageDuration: 0
        };

        runs.forEach(run => {
            // Count by type
            stats.byType[run.type] = (stats.byType[run.type] || 0) + 1;
            
            // Count by status
            stats.byStatus[run.status] = (stats.byStatus[run.status] || 0) + 1;
            
            // Count by site
            if (run.siteId) {
                stats.bySite[run.siteId] = (stats.bySite[run.siteId] || 0) + 1;
            }
        });

        return stats;
    }
}

module.exports = RunIdGenerator;
