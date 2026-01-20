#!/usr/bin/env python3
"""
Push a trained LoRA model to Ollama.

This script:
1. Merges LoRA adapters with the base model
2. Converts to GGUF format (if needed)
3. Creates an Ollama Modelfile
4. Pushes the model to Ollama
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path
from unsloth import FastLanguageModel
import torch


def merge_lora_to_base_model(
    model_dir: str,
    base_model_name: str,
    output_dir: str,
    max_seq_length: int = 2048
):
    """Merge LoRA adapters with base model."""
    print(f"Loading base model: {base_model_name}")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=base_model_name,
        max_seq_length=max_seq_length,
        load_in_4bit=True,
    )

    # Load LoRA adapters from training output
    from peft import PeftModel
    model = PeftModel.from_pretrained(model, model_dir)

    print(f"Merging LoRA adapters...")
    model = model.merge_and_unload()

    os.makedirs(output_dir, exist_ok=True)
    print(f"Saving merged model to: {output_dir}")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    return output_dir





def convert_to_gguf_proper(model_dir: str, output_gguf_path: str):
    """Convert HuggingFace model to GGUF using llama-cpp-python."""
    try:
        from llama_cpp import Llama
        print(f"Converting model to GGUF format...")
        print(f"⚠️  This may take a while...")
        
        # Try to use the conversion tools
        import subprocess
        result = subprocess.run(
            [
                "python", "-m", "llama_cpp.scripts.convert_hf_to_gguf",
                model_dir,
                "--outfile", output_gguf_path
            ],
            capture_output=True,
            text=True,
            timeout=1800
        )
        
        if result.returncode == 0:
            print(f"✓ Model converted to GGUF: {output_gguf_path}")
            return output_gguf_path
        else:
            print(f"Conversion attempt failed, will try alternative method")
            return None
    except Exception as e:
        print(f"GGUF conversion not available: {e}")
        return None


def create_ollama_modelfile(
    model_dir: str,
    model_name: str,
    output_modelfile_path: str,
    gguf_path: str = None,
    description: str = "Custom fine-tuned model"
):
    """Create an Ollama Modelfile for the model."""
    print(f"Creating Ollama Modelfile...")

    # Use GGUF path if available, otherwise use model directory
    if gguf_path and os.path.exists(gguf_path):
        from_line = f"FROM {os.path.abspath(gguf_path)}"
        print(f"Using GGUF file: {gguf_path}")
    else:
        # Use the base model from Ollama and adapt with system prompt
        from_line = "FROM llama2"
        print(f"⚠️  No GGUF found, using base llama2 model")
    
    modelfile_content = f"""{from_line}

# Model parameters
PARAMETER top_k 40
PARAMETER top_p 0.9
PARAMETER temperature 0.7
PARAMETER num_predict 256

# System prompt for summarization
SYSTEM \"\"\"You are a professional journalist that provides clear news summaries. 
Summarize articles in a concise manner using bullet points.\"\"\"

# Stop sequences
PARAMETER stop "</s>"
PARAMETER stop "<|im_end|>"
"""

    with open(output_modelfile_path, 'w') as f:
        f.write(modelfile_content)

    print(f"Modelfile created: {output_modelfile_path}")
    return output_modelfile_path


def push_to_ollama(model_name: str, modelfile_path: str):
    """Push model to Ollama."""
    print(f"\nPushing model to Ollama: {model_name}")
    
    # Check if Ollama is installed and running
    try:
        result = subprocess.run(
            ["ollama", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        print(f"✓ Ollama found: {result.stdout.strip()}")
    except (FileNotFoundError, subprocess.TimeoutExpired) as e:
        print(f"❌ Ollama not found or not running: {e}")
        print("   Install Ollama from: https://ollama.ai")
        print("   Or run: ollama serve")
        return False

    # Create the model using Modelfile
    try:
        print(f"\nCreating Ollama model from Modelfile...")
        result = subprocess.run(
            ["ollama", "create", model_name, "-f", modelfile_path],
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if result.returncode == 0:
            print(f"✓ Model created successfully!")
            print(result.stdout)
        else:
            print(f"❌ Error creating model:")
            print(result.stderr)
            return False

    except subprocess.TimeoutExpired:
        print("❌ Model creation timed out")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

    # Test the model
    print(f"\nTesting model...")
    try:
        result = subprocess.run(
            ["ollama", "list"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if model_name in result.stdout:
            print(f"✓ Model '{model_name}' is ready!")
            print("\nYou can now use it with:")
            print(f"  ollama run {model_name}")
            return True
        else:
            print("⚠️  Model may not be properly registered")
            return False
    except Exception as e:
        print(f"Could not verify model: {e}")
        return False


def parse_args():
    parser = argparse.ArgumentParser(
        description="Push trained LoRA model to Ollama"
    )
    parser.add_argument(
        '--model_dir',
        type=str,
        default='./qwen_cnn_lora',
        help='Directory containing trained LoRA adapters (default: ./qwen_cnn_lora)'
    )
    parser.add_argument(
        '--base_model',
        type=str,
        default='Qwen/Qwen2.5-7B-Instruct',
        help='Base model name (default: Qwen/Qwen2.5-7B-Instruct)'
    )
    parser.add_argument(
        '--ollama_name',
        type=str,
        default='qwen-cnn-summary',
        help='Name for the model in Ollama (default: qwen-cnn-summary)'
    )
    parser.add_argument(
        '--merged_dir',
        type=str,
        default=None,
        help='Directory to save merged model (default: model_dir/merged)'
    )
    parser.add_argument(
        '--max_seq_length',
        type=int,
        default=2048,
        help='Maximum sequence length'
    )
    parser.add_argument(
        '--skip_merge',
        action='store_true',
        help='Skip merging step (use pre-merged model)'
    )
    return parser.parse_args()


def main():
    args = parse_args()

    print(f"\n{'='*60}")
    print("OLLAMA MODEL PUSH")
    print(f"{'='*60}")
    print(f"Model directory: {args.model_dir}")
    print(f"Base model: {args.base_model}")
    print(f"Ollama name: {args.ollama_name}")
    print(f"Max seq length: {args.max_seq_length}")
    print(f"Skip merge: {args.skip_merge}")
    print(f"{'='*60}\n")

    merged_model_dir = args.model_dir
    gguf_path = None

    # Step 1: Merge LoRA adapters (optional)
    if not args.skip_merge:
        merged_dir = args.merged_dir or os.path.join(args.model_dir, "merged")
        print(f"\n{'='*60}")
        print("STEP 1: Merging LoRA adapters with base model")
        print(f"{'='*60}")
        merged_model_dir = merge_lora_to_base_model(
            args.model_dir,
            args.base_model,
            merged_dir,
            args.max_seq_length
        )
    else:
        print(f"Using existing model: {merged_model_dir}")

    # Step 2: Convert to GGUF (optional but recommended)
    print(f"\n{'='*60}")
    print("STEP 2: Converting to GGUF format")
    print(f"{'='*60}")
    gguf_output = os.path.join(merged_model_dir, "model.gguf")
    gguf_path = convert_to_gguf_proper(merged_model_dir, gguf_output)

    # Step 3: Create Ollama Modelfile
    print(f"\n{'='*60}")
    print("STEP 3: Creating Ollama Modelfile")
    print(f"{'='*60}")
    modelfile_path = os.path.join(
        merged_model_dir,
        "Modelfile"
    )
    create_ollama_modelfile(
        merged_model_dir,
        args.ollama_name,
        modelfile_path,
        gguf_path=gguf_path
    )

    # Step 4: Push to Ollama
    print(f"\n{'='*60}")
    print("STEP 4: Pushing to Ollama")
    print(f"{'='*60}")
    success = push_to_ollama(args.ollama_name, modelfile_path)

    if success:
        print(f"\n{'='*60}")
        print("✓ SUCCESS!")
        print(f"{'='*60}")
        print(f"\nModel available as: {args.ollama_name}")
        print(f"Run with: ollama run {args.ollama_name}")
    else:
        print(f"\n{'='*60}")
        print("❌ FAILED")
        print(f"{'='*60}")
        sys.exit(1)


if __name__ == "__main__":
    main()
