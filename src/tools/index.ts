import { odataTools, handleODataTool } from "./odata.js";
import { connectionTools, handleConnectionTool } from "./connection.js";
import { configurationTools, handleConfigurationTool } from "./configuration.js";

/**
 * All tool definitions
 */
export const allTools = [
  ...odataTools,
  ...connectionTools,
  ...configurationTools,
];

/**
 * Route tool calls to appropriate handler
 */
export async function handleToolCall(name: string, args: any): Promise<any> {
  // OData tools
  if (name.startsWith("fm_odata_get_") || 
      name.startsWith("fm_odata_query_") ||
      name.startsWith("fm_odata_list_") ||
      name.startsWith("fm_odata_count_") ||
      name.startsWith("fm_odata_create_") ||
      name.startsWith("fm_odata_update_") ||
      name.startsWith("fm_odata_delete_")) {
    return await handleODataTool(name, args);
  }

  // Connection tools
  if (name === "fm_odata_connect" ||
      name === "fm_odata_set_connection" ||
      name === "fm_odata_list_connections" ||
      name === "fm_odata_get_current_connection") {
    return await handleConnectionTool(name, args);
  }

  // Configuration tools
  if (name.startsWith("fm_odata_config_")) {
    return await handleConfigurationTool(name, args);
  }

  // Unknown tool
  return {
    content: [
      {
        type: "text",
        text: `Unknown tool: ${name}`,
      },
    ],
    isError: true,
  };
}
