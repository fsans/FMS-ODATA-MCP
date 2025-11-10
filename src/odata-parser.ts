import { ODataResponse } from "./odata-client.js";

/**
 * OData Response Parser
 * Formats OData responses for MCP tools
 */
export class ODataParser {
  /**
   * Format OData response for MCP tool output
   */
  static formatResponse(data: any, pretty: boolean = true): string {
    if (pretty) {
      return JSON.stringify(data, null, 2);
    }
    return JSON.stringify(data);
  }

  /**
   * Format query response with count information
   */
  static formatQueryResponse<T>(
    response: ODataResponse<T>,
    includeContext: boolean = false
  ): string {
    const result: any = {
      count: response["@odata.count"],
      records: response.value,
    };

    if (includeContext) {
      result.context = response["@odata.context"];
    }

    return this.formatResponse(result);
  }

  /**
   * Format single record response
   */
  static formatRecordResponse(record: any): string {
    return this.formatResponse(record);
  }

  /**
   * Format metadata response
   */
  static formatMetadata(metadata: string): string {
    // For XML metadata, we can add formatting hints
    return metadata;
  }

  /**
   * Format service document
   */
  static formatServiceDocument(serviceDoc: any): string {
    return this.formatResponse(serviceDoc);
  }

  /**
   * Format error for MCP tool
   */
  static formatError(error: Error): string {
    return `Error: ${error.message}`;
  }

  /**
   * Parse OData $metadata XML to extract table information
   */
  static parseMetadataForTables(metadataXml: string): string[] {
    const tables: string[] = [];
    
    // Simple regex to extract EntitySet names from metadata
    const entitySetRegex = /<EntitySet\s+Name="([^"]+)"/g;
    let match;
    
    while ((match = entitySetRegex.exec(metadataXml)) !== null) {
      tables.push(match[1]);
    }
    
    return tables;
  }

  /**
   * Parse OData $metadata XML to extract field information for a table
   */
  static parseMetadataForFields(
    metadataXml: string,
    tableName: string
  ): FieldInfo[] {
    const fields: FieldInfo[] = [];
    
    // Find the EntityType definition for this table
    const entityTypeRegex = new RegExp(
      `<EntityType\\s+Name="${tableName}"[^>]*>([\\s\\S]*?)</EntityType>`,
      "i"
    );
    const entityTypeMatch = metadataXml.match(entityTypeRegex);
    
    if (entityTypeMatch) {
      const entityTypeContent = entityTypeMatch[1];
      
      // Extract properties
      const propertyRegex = /<Property\s+Name="([^"]+)"\s+Type="([^"]+)"([^>]*?)\/>/g;
      let match;
      
      while ((match = propertyRegex.exec(entityTypeContent)) !== null) {
        const name = match[1];
        const type = match[2];
        const attributes = match[3];
        
        const nullable = !attributes.includes('Nullable="false"');
        const maxLength = attributes.match(/MaxLength="(\d+)"/)?.[1];
        
        fields.push({
          name,
          type,
          nullable,
          maxLength: maxLength ? parseInt(maxLength) : undefined,
        });
      }
    }
    
    return fields;
  }

  /**
   * Create a summary of query results
   */
  static createQuerySummary(response: ODataResponse): string {
    const count = response["@odata.count"];
    const recordsReturned = response.value.length;
    
    let summary = `Returned ${recordsReturned} record(s)`;
    
    if (count !== undefined && count !== recordsReturned) {
      summary += ` (${count} total matching records)`;
    }
    
    return summary;
  }

  /**
   * Extract field names from a record
   */
  static extractFieldNames(record: any): string[] {
    return Object.keys(record).filter(
      (key) => !key.startsWith("@odata")
    );
  }

  /**
   * Format batch operation results
   */
  static formatBatchResults(results: BatchResult[]): string {
    const summary = {
      total: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results: results,
    };
    
    return this.formatResponse(summary);
  }
}

export interface FieldInfo {
  name: string;
  type: string;
  nullable: boolean;
  maxLength?: number;
}

export interface BatchResult {
  success: boolean;
  status: number;
  data?: any;
  error?: string;
}
