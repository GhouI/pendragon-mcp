import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const DEFAULT_URL = "http://127.0.0.1:3000/mcp";

async function main(): Promise<void> {
  const [command, toolName, ...argParts] = process.argv.slice(2);
  const rawArgs = argParts.join(" ");
  const url = process.env.PENDRAGON_URL ?? DEFAULT_URL;
  const token = process.env.PENDRAGON_TOKEN;

  if (!token) {
    throw new Error("PENDRAGON_TOKEN is required");
  }

  const client = new Client({
    name: "pendragon-diagnostic-client",
    version: "0.1.0"
  });

  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  await client.connect(transport);

  try {
    if (command === "exec") {
      const powershellCommand = [toolName, ...argParts].filter(Boolean).join(" ");
      const result = await client.callTool({
        name: "powershell_execute",
        arguments: {
          command: powershellCommand
        }
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (command === "list-tools") {
      const result = await client.listTools();
      console.log(JSON.stringify(result.tools, null, 2));
      return;
    }

    if (command === "call-tool" && toolName) {
      const args = rawArgs ? JSON.parse(rawArgs) : {};
      const result = await client.callTool({
        name: toolName,
        arguments: args
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log("Usage:");
    console.log("  npm run client -- list-tools");
    console.log("  npm run client -- exec Write-Output hello");
    console.log("  npm run client -- call-tool powershell_execute '{\"command\":\"Write-Output hello\"}'");
  } finally {
    await transport.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
