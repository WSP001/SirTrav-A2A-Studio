import os
from azure.ai.evaluation import evaluate, RelevanceEvaluator, CoherenceEvaluator, OpenAIModelConfiguration
from dotenv import load_dotenv

load_dotenv()

def main():
    # Check for API Key
    if not os.environ.get("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY not found in environment variables.")
        print("Please set OPENAI_API_KEY in your .env file or environment.")
        return

    # Configure Model - OpenAI API requires base_url
    model_config = OpenAIModelConfiguration(
        type="openai",
        model="gpt-4o-mini",
        api_key=os.environ["OPENAI_API_KEY"],
        base_url="https://api.openai.com/v1"
    )

    # Initialize Evaluators
    relevance_eval = RelevanceEvaluator(model_config)
    coherence_eval = CoherenceEvaluator(model_config)

    print("Starting evaluation...")

    # Run Evaluation
    try:
        result = evaluate(
            data="data/evaluation_dataset.jsonl",
            evaluators={
                "relevance": relevance_eval,
                "coherence": coherence_eval
            },
            evaluator_config={
                "relevance": {
                    "column_mapping": {
                        "query": "${data.query}",
                        "response": "${data.response}"
                    }
                },
                "coherence": {
                    "column_mapping": {
                        "query": "${data.query}",
                        "response": "${data.response}"
                    }
                }
            },
            output_path="evaluation_results.json"
        )

        print("Evaluation complete!")
        print("Aggregate Results:")
        print(result["metrics"])
        print(f"Detailed results saved to evaluation_results.json")
        
    except Exception as e:
        print(f"Evaluation failed: {e}")

if __name__ == "__main__":
    main()
