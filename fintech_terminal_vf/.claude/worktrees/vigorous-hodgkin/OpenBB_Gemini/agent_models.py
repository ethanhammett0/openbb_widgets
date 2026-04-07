from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class AgentTask(BaseModel):
    intent: str = Field(description="The user's high-level goal (e.g., 'Research', 'Chat').")
    initial_question: str = Field(description="The original user query.")

class ExecutionStep(BaseModel):
    step_id: int = Field(description="Sequence number.")
    thought: str = Field(description="Reasoning for this step.")
    tool: str = Field(description="Name of the tool to call.")
    tool_args: Dict[str, Any] = Field(description="Arguments for the tool.")
    
class Plan(BaseModel):
    steps: List[ExecutionStep] = Field(description="The checklist of steps to execute.")
    definition_of_done: str = Field(description="Condition to check before terminating.")
