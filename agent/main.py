from agent.graph import graph

state = {
    "messages": [
        {
            "role": "user",
            "content": "What is the recent situtation of war between USA and Iran?",
        }
    ],
    "max_research_loops": 3,
    "initial_search_query_count": 3,
}


for step in graph.stream(state):
    for node, output in step.items():
        print(f"\n-- NODE {node} --")
        print(output)
