import argparse
import os
import torch
from datasets import load_dataset
from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments


def parse_args():
    parser = argparse.ArgumentParser(description="Finetune Qwen with Unsloth on CNN/DailyMail")
    parser.add_argument('--model_name', type=str, required=True)
    parser.add_argument('--cache_dir', type=str, default=None)
    parser.add_argument('--output_dir', type=str, required=True)

    parser.add_argument('--max_seq_length', type=int, default=2048)
    parser.add_argument('--batch_size', type=int, default=2)
    parser.add_argument('--grad_accum', type=int, default=4)
    parser.add_argument('--max_steps', type=int, default=30)

    parser.add_argument('--learning_rate', type=float, default=2e-4)
    parser.add_argument('--weight_decay', type=float, default=0.001)
    parser.add_argument('--seed', type=int, default=3407)

    parser.add_argument('--save_16bit', action='store_true')
    return parser.parse_args()

