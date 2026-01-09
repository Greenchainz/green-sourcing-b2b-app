/**
 * Office.js Utilities
 * 
 * Wrapper functions for interacting with Excel from the GreenChainz Add-in
 * Handles selection, data extraction, and writing results back to cells
 */

export interface ExcelRange {
    values: unknown[][];
    rowCount: number;
    columnCount: number;
    address: string;
}

export interface ExcelRangeObject {
    values: unknown[][];
    rowCount: number;
    columnCount: number;
    load(properties: string): void;
    getOffsetRange(rowOffset: number, columnOffset: number): ExcelRangeObject;
    getResizedRange(deltaRows: number, deltaColumns: number): ExcelRangeObject;
    format: {
        font: { size: number };
        autofitColumns(): void;
    };
}

export interface ExcelSyncContext {
    workbook: {
        getSelectedRange(): ExcelRangeObject;
    };
    sync(): Promise<void>;
}

/**
 * Get selected range from Excel with full context
 */
export async function getSelectedMaterials(): Promise<string[]> {
    if (!window.Excel) {
        throw new Error("Excel.js library not loaded");
    }

    return new Promise((resolve, reject) => {
        window.Excel.run(async (context: ExcelSyncContext) => {
            try {
                const range = context.workbook.getSelectedRange();
                range.load("values, rowCount, columnCount");
                await context.sync();

                if (!range.values || range.values.length === 0) {
                    reject(new Error("No cells selected"));
                    return;
                }

                // Extract single column (assumes user selected a column)
                const materials = range.values
                    .map((row: unknown[]) => row[0])
                    .filter((item: unknown) => item && String(item).trim().length > 0)
                    .map((item: unknown) => String(item).trim());

                resolve(materials);
            } catch (error) {
                reject(error);
            }
        });
    });
}

export interface AuditResult {
    carbon_score?: number;
    health_grade?: string;
    red_list_status?: string;
}

/**
 * Write audit results back to Excel (3 columns to the right of selection)
 */
export async function writeAuditResults(results: AuditResult[]): Promise<void> {
    if (!window.Excel) {
        throw new Error("Excel.js library not loaded");
    }

    return new Promise((resolve, reject) => {
        window.Excel.run(async (context: ExcelSyncContext) => {
            try {
                const range = context.workbook.getSelectedRange();
                range.load("rowCount, columnCount");
                await context.sync();

                // Target range: 3 columns to the right, same number of rows
                const resultRange = range
                    .getOffsetRange(0, 1)
                    .getResizedRange(range.rowCount - 1, 3);

                // Format results for Excel
                const writeValues = results.map((item: AuditResult) => [
                    item.carbon_score?.toFixed(1) ?? "N/A", // Carbon (kgCO2e)
                    getHealthGradeEmoji(item.health_grade), // Health Grade
                    getComplianceStatus(item.red_list_status), // Compliance
                ]);

                resultRange.values = writeValues;
                resultRange.format.font.size = 11;
                resultRange.format.autofitColumns();

                await context.sync();
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

/**
 * Helper: Convert health grade to emoji + text
 */
function getHealthGradeEmoji(grade?: string): string {
    switch (grade) {
        case "A":
            return "🟢 Grade A";
        case "C":
            return "🟡 Grade C";
        case "F":
            return "🔴 Grade F";
        default:
            return "⚪ Unknown";
    }
}

/**
 * Helper: Convert compliance status to human-readable format
 */
function getComplianceStatus(status?: string): string {
    switch (status) {
        case "Free":
            return "✅ Red List Free";
        case "Approved":
            return "⚠️ LBC Approved";
        case "None":
            return "❌ Not Verified";
        default:
            return "⚪ Unknown";
    }
}

/**
 * Declare Office.js globals
 */
declare global {
    interface Window {
        Excel?: {
            run<T>(callback: (context: ExcelSyncContext) => Promise<T>): Promise<T>;
        };
        Office?: unknown;
    }
}
