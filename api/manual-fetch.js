"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const supabase_js_1 = require("@supabase/supabase-js");
const data_orchestrator_1 = require("../src/services/data-orchestrator");
/**
 * Manual endpoint to fetch Toast data for a specific venue and date range
 */
async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const { venueId = 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c', startDate, endDate, apis = ['toast'] } = req.body;
        console.log(`[MANUAL FETCH] Starting data fetch for venue ${venueId}`);
        // Initialize Supabase client
        const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        // Initialize orchestrator
        const orchestrator = new data_orchestrator_1.DataOrchestrator(supabase);
        // Parse dates
        const dateRange = {
            start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
            end: endDate ? new Date(endDate) : new Date(),
        };
        console.log(`[MANUAL FETCH] Fetching from ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`);
        // Fetch data
        const result = await orchestrator.fetchAllData({
            venueId,
            apis,
            dateRange,
            locationId: 'bfb355cb-55e4-4f57-af16-d0d18c11ad3c', // Jack's location ID
        });
        // Calculate KPIs for the date range
        if (result.success && result.results.toast?.success) {
            console.log(`[MANUAL FETCH] Successfully fetched ${result.results.toast.recordCount} Toast transactions`);
            // Trigger KPI calculation for each day in the range
            const { KPICalculator } = await Promise.resolve().then(() => __importStar(require('../src/services/kpi-calculator')));
            const kpiCalculator = new KPICalculator(supabase);
            const currentDate = new Date(dateRange.start);
            while (currentDate <= dateRange.end) {
                try {
                    await kpiCalculator.calculateDailyKPIs(venueId, new Date(currentDate));
                    console.log(`[MANUAL FETCH] Calculated KPIs for ${currentDate.toISOString().split('T')[0]}`);
                }
                catch (error) {
                    console.error(`[MANUAL FETCH] Error calculating KPIs for ${currentDate.toISOString().split('T')[0]}:`, error);
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        console.log(`[MANUAL FETCH] Completed in ${result.duration}ms`);
        return res.status(200).json({
            success: true,
            message: 'Data fetch completed',
            result,
        });
    }
    catch (error) {
        console.error('[MANUAL FETCH] Error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
//# sourceMappingURL=manual-fetch.js.map