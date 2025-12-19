import { agentRouter } from "@/agents/agentRouter";
import type { AgentAction } from "@/agents/agentTypes";

export async function POST(request: Request) {
  const action = (await request.json()) as AgentAction;
  const result = await agentRouter(action);
  return Response.json(result);
}
