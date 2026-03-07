import os
from pydantic import BaseModel, Field
from typing import Any, Optional
from langchain_core.runnables import RunnableConfig


class Configuration(BaseModel):
    query_generator_model: str = Field(
        default="gemini-2.5-flash",
        description="The name of the language model to use for the agent's reflection",
    )

    reflection_model: str = Field(
        default="gemini-2.5-flash",
        description="The name of the language model to use for the agent's reflection",
    )

    answer_model: str = Field(
        default="gemini-2.5-flash",
        description="The name of the language model to use for the agent's final answer generation",
    )

    number_of_initial_queries: int = Field(
        default=3,
        description="The number of initial search queries to generate",
    )

    max_research_loops: int = Field(
        default=2, description="The maximum number of research loops to perform"
    )

    @classmethod
    def from_runnable_config(
        cls, config: Optional[RunnableConfig] = None
    ) -> "Configuration":
        configurable = (
            config["configurable"] if config and "configurable" in config else {}
        )

        raw_values: dict[str, Any] = {
            name: os.environ.get(name.upper(), configurable.get(name))
            for name in cls.model_fields.keys()
        }

        values = {k: v for k, v in raw_values.items() if v is not None}

        return cls(**values)
