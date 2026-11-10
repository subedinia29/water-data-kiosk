"""AI helper for the kiosk's "ask in your own words" feature (Project 3.2 demo).

It does ONE job: given a resident's typed question and the kiosk's list of known questions,
it asks Claude which known question (by number) means the same thing. It never writes answers.
The kiosk runs its safety gate BEFORE calling this helper, and checks the result again after.

How to run (needs internet and an Anthropic API key):
    pip install anthropic
    export ANTHROPIC_API_KEY=...        (Windows: set ANTHROPIC_API_KEY=...)
    python3 user-friendly/features/ai-helper.py

It listens only on this computer (localhost:8766). Stop it with Ctrl+C. If it isn't running,
the kiosk simply skips this step and uses its normal rules.
"""
import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import anthropic

PORT = 8766
MODEL = "claude-opus-5-5"
client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment

SYSTEM = (
    "You help a public library kiosk that shows official water and soil test results for East Palestine, Ohio. "
    "A resident typed a question. Pick the ONE numbered kiosk question that asks for the same information. "
    "Reply with only the number. "
    "If the resident asks whether anything is safe, healthy, dangerous or okay, or asks about health, risk, "
    "symptoms, legal matters or property, reply with only the word SAFETY. "
    "If no kiosk question fits, reply with only the word NONE."
)


def interpret(question, options):
    listing = "\n".join(f"{i}. {q}" for i, q in enumerate(options))
    response = client.beta.messages.create(
        model=MODEL,
        max_tokens=1024,
        output_config={"effort": "low"},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=SYSTEM,
        messages=[{"role": "user", "content": f"Kiosk questions:\n{listing}\n\nResident's question: {question}"}],
    )
    if response.stop_reason == "refusal":
        return {"safety": True}
    text = "".join(b.text for b in response.content if b.type == "text").strip().upper()
    if "SAFETY" in text:
        return {"safety": True}
    m = re.search(r"\d+", text)
    if not m or int(m.group()) >= len(options):
        return {"choice": None}
    return {"choice": int(m.group())}


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self._send(204, {})

    def do_POST(self):
        if self.path != "/interpret":
            return self._send(404, {"error": "not found"})
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
            question = str(body.get("question", ""))[:500]
            options = [str(o)[:200] for o in body.get("options", [])][:100]
            if not question or not options:
                return self._send(400, {"error": "question and options are required"})
            self._send(200, interpret(question, options))
        except anthropic.APIConnectionError:
            self._send(502, {"error": "Could not reach Claude (no internet?)"})
        except anthropic.AuthenticationError:
            self._send(502, {"error": "API key missing or not valid"})
        except anthropic.APIStatusError as e:
            self._send(502, {"error": f"Claude API error {e.status_code}"})
        except (ValueError, TypeError):
            self._send(400, {"error": "bad request"})

    def log_message(self, fmt, *args):  # don't print questions to the console
        pass


if __name__ == "__main__":
    print(f"AI helper running on http://localhost:{PORT} (Ctrl+C to stop)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
