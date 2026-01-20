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


def main():
    args = parse_args()

    # ----------------------------
    # Load model
    # ----------------------------
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=args.model_name,
        max_seq_length=args.max_seq_length,
        load_in_4bit=True,
        full_finetuning=False,
    )

    model = FastLanguageModel.get_peft_model(
        model,
        r=32,
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj"
        ],
        lora_alpha=32,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=args.seed,
    )

    # ----------------------------
    # Load dataset
    # ----------------------------
    dataset = load_dataset(
        "cnn_dailymail",
        "3.0.0",
        split="train",
        cache_dir=args.cache_dir,
    )

    def format_example(example):
        return {
            "text": (
                "Summarize the following article:\n\n"
                f"{example['article']}\n\n"
                "Summary:\n"
                f"{example['highlights']}"
            )
        }

    dataset = dataset.map(
        format_example,
        remove_columns=dataset.column_names,
        num_proc=8,
    )

    # ----------------------------
    # Training arguments (FIXED)
    # ----------------------------
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        warmup_steps=5,
        max_steps=args.max_steps,
        learning_rate=args.learning_rate,
        logging_steps=1,
        optim="adamw_8bit",
        weight_decay=args.weight_decay,
        lr_scheduler_type="linear",
        seed=args.seed,
        report_to="none",
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
    )

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        args=training_args,
    )

    # ----------------------------
    # Train
    # ----------------------------
    trainer.train()

    # ----------------------------
    # Save
    # ----------------------------
    os.makedirs(args.output_dir, exist_ok=True)

    if args.save_16bit:
        model.save_pretrained_merged(
            args.output_dir,
            tokenizer,
            save_method="merged_16bit"
        )
    else:
        model.save_pretrained(args.output_dir)
        tokenizer.save_pretrained(args.output_dir)


if __name__ == "__main__":
    main()
