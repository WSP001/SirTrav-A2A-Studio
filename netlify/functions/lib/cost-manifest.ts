export interface AgentCost {
    agent: string;
    task: string;
    baseCost: number;
    markup: number;
    total: number;
}

export interface Manifest {
    jobId: string;
    timestamp: string;
    items: AgentCost[];
    subtotal: number;
    markupTotal: number;
    totalDue: number;
    currency: string;
    verified: boolean;
    commonsGoodContribution: boolean;
}

/**
 * Enterprise "FinOps" Auditor
 * Implements the Cost Plus model: Base Cost + 20% Markup
 */
export class ManifestGenerator {
    private items: AgentCost[] = [];
    private readonly MARKUP_RATE = 0.20; // 20% Commons Good Markup

    /**
     * Record a completed task and calculate the cost "on the ledger"
     * @param agent Name of the agent (e.g., 'Visionary', 'Narrator')
     * @param task Description of work (e.g., 'Image Analysis', 'TTS Generation')
     * @param baseCost The raw cost of the underlying API call (e.g., $0.04)
     */
    addEntry(agent: string, task: string, baseCost: number) {
        const markup = Number((baseCost * this.MARKUP_RATE).toFixed(4));
        const total = Number((baseCost + markup).toFixed(4));

        this.items.push({
            agent,
            task,
            baseCost,
            markup,
            total
        });
    }

    /**
     * Generate the final Invoice Manifest
     * @param jobId The Run ID
     */
    generate(jobId: string): Manifest {
        const subtotal = this.items.reduce((sum, item) => sum + item.baseCost, 0);
        const markupTotal = this.items.reduce((sum, item) => sum + item.markup, 0);
        const totalDue = this.items.reduce((sum, item) => sum + item.total, 0);

        return {
            jobId,
            timestamp: new Date().toISOString(),
            items: this.items,
            subtotal: Number(subtotal.toFixed(4)),
            markupTotal: Number(markupTotal.toFixed(4)),
            totalDue: Number(totalDue.toFixed(4)),
            currency: 'USD',
            verified: true,
            commonsGoodContribution: true
        };
    }
}
