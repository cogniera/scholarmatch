from google.adk.agents.llm_agent import Agent
from app.utills.config import MCP_BASE_URL
from google.adk.tools.mcp_tool import McpToolset


# Mock tool implementation
# def get_current_time(city: str) -> dict:
#     """Returns the current time in a specified city."""
#     return {"status": "success", "city": city, "time": "10:30 AM"}


root_agent = Agent(
    model="gemini-2.5-flash",
    name="root_agent",
    description="A helpful assistant for user questions.",
    instruction="Answer user questions to the best of your knowledge",
    tools=[
        McpToolset(
            connection_params=()
            ),
            # Optional: Filter which tools from the MCP server are exposed
            # tool_filter=['list_directory', 'read_file']
        )
    ],
)
