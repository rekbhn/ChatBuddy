"""
model_loader.py
Loads and runs the local instruction-tuned model.
"""

from typing import Dict, List

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

DEFAULT_MODEL = "Qwen/Qwen2.5-3B-Instruct"
DEFAULT_TEMPERATURE = 0.75
MAX_NEW_TOKENS = 120


class ModelLoader:
    """Loads and manages the instruction-tuned chat model."""

    def __init__(self, model_name: str = DEFAULT_MODEL):
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    def load(self) -> None:
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        if self.tokenizer.chat_template is None:
            raise RuntimeError(
                f"{self.model_name} has no chat template. Use an instruction model."
            )

        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            dtype=torch.bfloat16,
        )
        self.model.to(self.device)
        self.model.eval()

    def generate_reply(
        self,
        messages: List[Dict[str, str]],
        temperature: float = DEFAULT_TEMPERATURE,
        max_new_tokens: int = MAX_NEW_TOKENS,
    ) -> str:
        prompt = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
        prompt_length = inputs["input_ids"].shape[-1]

        with torch.no_grad():
            output = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=True,
                temperature=temperature,
                top_p=0.85,
                repetition_penalty=1.1,
                stop_strings=["\n\n"],
                tokenizer=self.tokenizer,
                pad_token_id=self.tokenizer.pad_token_id,
            )

        return self.tokenizer.decode(
            output[0][prompt_length:],
            skip_special_tokens=True,
        ).strip()
