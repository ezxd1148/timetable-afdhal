"""Tom the cat agent (LangGraph)."""

from __future__ import annotations

import asyncio
import logging
import os

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langgraph.checkpoint.memory import InMemorySaver

from characters import generate_tom_prompt

from band import Agent, configure_logging
from band.adapters import LangGraphAdapter, LangGraphAdapterConfig

configure_logging(logging.INFO)
logger = logging.getLogger(__name__)


async def main() -> None:
    load_dotenv()

    # Load Tom's credentials from agent_config.yaml
    # Create adapter with Tom's character prompt
    adapter = LangGraphAdapter(
        LangGraphAdapterConfig(custom_section=generate_tom_prompt("Tom")),
        llm=ChatAnthropic(model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")),
        checkpointer=InMemorySaver(),
    )

    logger.info("Tom is on the prowl, looking for Jerry...")
    async with Agent.from_config(
        "tom_agent",
        adapter=adapter,
    ) as agent:
        await agent.run_forever()


if __name__ == "__main__":
    asyncio.run(main())
