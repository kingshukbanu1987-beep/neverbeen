#!/usr/bin/env python3
"""Verifies neverbeen-api-ai-chat-her-voice.patch.

The patch builds on neverbeen-api-ai-chat-gemini.patch and
neverbeen-api-ai-chat-biography.patch: those two are applied first (or are already merged on the
API's `main`), then this one goes on top.

  A  the two earlier patches apply, or are already merged, and this patch applies cleanly on the
     result
  B  every .cs file the patch touches parses without syntax errors (tree-sitter)
  C  every answer is read before it is returned: `AiChatPrompt.InHerVoice()` exists, the controller
     puts Gemini's reply through it, and an answer that was nothing but bot lines answers
     `502 ai-empty` (so the website answers in her own words)
  D  the website keeps the same list: every label of `chat-her-voice.ts` is a label of
     `AiChatPrompt.BotLinePatterns` and the other way round, every pattern fires on a bot line, and
     every pattern stays quiet on her own lines
  E  the scrub keeps the rest of what she said and leaves a text that is already hers untouched
     (`InHerVoice`, ported to Python from the C# the patch adds)
  F  the studio rules forbid the software voice out loud, and the biography's disclosure no longer
     introduces her as an AI
  G  the visitor's own language travels with the turn and she is told to answer in it
  H  no database change and no committed key; the README documents the scrub and the new field

Dependencies: git, and the tree_sitter / tree_sitter_c_sharp packages
(pip install tree-sitter tree-sitter-c-sharp).

Run:  python3 neverbeen-api-ai-chat-her-voice-verification.py [path-to-neverbeen-api]
"""

import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
WEBSITE = os.path.abspath(os.path.join(HERE, '..', '..'))
GEMINI_PATCH = os.path.join(HERE, 'neverbeen-api-ai-chat-gemini.patch')
BIOGRAPHY_PATCH = os.path.join(HERE, 'neverbeen-api-ai-chat-biography.patch')
PATCH = os.path.join(HERE, 'neverbeen-api-ai-chat-her-voice.patch')
API_DIR = sys.argv[1] if len(sys.argv) > 1 else '/tmp/api-repo'
failures = []


def check(label, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + label + ('' if ok or not detail else f'  -- {detail}'))
    if not ok:
        failures.append(label)


def git(args, cwd):
    return subprocess.run(['git'] + args, cwd=cwd, capture_output=True, text=True)


def read(root, rel):
    path = os.path.join(root, rel)
    if not os.path.exists(path):
        return ''
    with open(path, encoding='utf-8') as fh:
        return fh.read()


def changed_files(patch_path):
    with open(patch_path, encoding='utf-8') as fh:
        return [line[len('+++ b/'):].strip() for line in fh if line.startswith('+++ b/')]


# A
tmp = tempfile.mkdtemp(prefix='api-ai-chat-her-voice-')
subprocess.run(['git', 'clone', '-q', API_DIR, tmp], check=True)

for earlier, marker in ((GEMINI_PATCH, 'Services/GeminiChatService.cs'),
                        (BIOGRAPHY_PATCH, 'Services/AiChatPrompt.cs')):
    name = os.path.basename(earlier)
    r = git(['apply', '--check', earlier], tmp)
    if r.returncode == 0:
        git(['apply', earlier], tmp)
        check(f'A  {name} applies', True)
    elif os.path.exists(os.path.join(tmp, marker)) and 'BiographyJson' in read(tmp, 'Services/AiChatPrompt.cs'):
        # The API's main already carries both patches: nothing to apply.
        check(f'A  {name} is already merged on this checkout', True)
    else:
        check(f'A  {name} applies', False, r.stderr.strip())

r = git(['apply', PATCH], tmp)
check('A  the her-voice patch applies on top of them', r.returncode == 0, r.stderr.strip())

with open(PATCH, encoding='utf-8') as fh:
    patch_text = fh.read()
changed = changed_files(PATCH)

# B
try:
    import tree_sitter_c_sharp as tscs
    from tree_sitter import Language, Parser

    parser = Parser(Language(tscs.language()))
    for rel in changed:
        if not rel.endswith('.cs'):
            continue
        with open(os.path.join(tmp, rel), 'rb') as fh:
            tree = parser.parse(fh.read())
        check(f'B  {rel} parses', not tree.root_node.has_error)
except ImportError:
    check('B  tree-sitter available (pip install tree-sitter tree-sitter-c-sharp)', False)

controller = read(tmp, 'Controllers/AiChatController.cs')
dtos = read(tmp, 'Dtos/AiChatDtos.cs')
prompt = read(tmp, 'Services/AiChatPrompt.cs')
readme = read(tmp, 'README.md')

# C
check('C  AiChatPrompt.InHerVoice exists', 'public static string InHerVoice(string? reply)' in prompt)
check('C  AiChatPrompt.BotLineIn exists', 'public static string BotLineIn(string? reply)' in prompt)
check('C  the controller scrubs the reply before returning it',
      'AiChatPrompt.InHerVoice(result.Reply)' in controller
      and 'Reply = reply' in controller)
check('C  an answer that was nothing but bot lines answers 502 ai-empty',
      'reply.Length == 0' in controller and '"ai-empty"' in controller
      and 'Status502BadGateway' in controller)

# D
csharp_block = prompt[prompt.find('public static readonly IReadOnlyList<BotLinePattern> BotLinePatterns'):
                      prompt.find('/// <summary>\n    /// The first phrase in an answer')]
csharp_patterns = re.findall(r'new\("([^"]+)", new Regex\(@"(.*?)", LineOptions\)\)', csharp_block, re.DOTALL)
website = read(WEBSITE, 'src/app/pages/ai-models/chat/chat-her-voice.ts')
website_labels = re.findall(r"label: '([^']+)'", website)
check(f'D  the API keeps the website\'s list ({len(csharp_patterns)} patterns)',
      {label for label, _ in csharp_patterns} == set(website_labels),
      f'api-only: {sorted({l for l, _ in csharp_patterns} - set(website_labels))}, '
      f'website-only: {sorted(set(website_labels) - {l for l, _ in csharp_patterns})}')

compiled = [(label, re.compile(pattern, re.IGNORECASE)) for label, pattern in csharp_patterns]
HERS = [
    'You are very beautiful, and I wanted you to know it.',
    'Delhi, of course. Have you been there?',
    'I model for the NeverBeen studio, and I am a Gemini, if you believe in that.',
    'I am not sure, honestly. What do you think?',
    'Hmm, I am not sure I follow you. Tell me again in another way — what did you mean?',
]
BOT_LINES = [
    'As an AI, I cannot browse the internet.',
    'I am a language model, so I have no feelings about it.',
    'I am an AI model here to help.',
    'How can I help you today?',
    'Is there anything else I can do for you?',
    'I hope this helps!',
    'My database says Darjeeling is beautiful in October.',
    'Feel free to ask me anything.',
    'Assistant: Darjeeling is lovely this time of year.',
    'OpenAI wrote this line for me.',
]
for line in HERS:
    hit = next((label for label, pattern in compiled if pattern.search(line)), '')
    check(f'D  her own line stays hers: {line[:38]}…', hit == '', hit)
for line in BOT_LINES:
    hit = next((label for label, pattern in compiled if pattern.search(line)), '')
    check(f'D  the API catches: {line[:38]}…', hit != '')


# E — InHerVoice, ported from the C# the patch adds (same steps, same order).
def bot_line_in(text):
    for label, pattern in compiled:
        if pattern.search(text):
            return label
    return ''


def plain_sentence(sentence):
    text = re.sub(r'^\s{0,3}(?:#{1,6}\s+|>\s+|[-*•]\s+|\d{1,2}[.)]\s+)', '', sentence)
    for source, target in ((r'\*\*([^*]+)\*\*', r'\1'), (r'__([^_]+)__', r'\1'),
                           (r'~~([^~]+)~~', r'\1'), (r'`{1,3}([^`]+)`{1,3}', r'\1'),
                           (r'\*([^*\n]+)\*', r'\1'), (r'\b_([^_\n]+)_\b', r'\1')):
        text = re.sub(source, target, text)
    text = re.sub(r'(\*\*|__|~~|`)', '', text)
    text = re.sub(r'^[\s\-–—•*]+', '', text)
    return re.sub(r'\s+', ' ', text).strip()


def in_her_voice(reply):
    answer = (reply or '').replace('\r\n', '\n').replace('\r', '\n').strip()
    if not answer:
        return ''
    if not bot_line_in(answer) and not re.search(r'^\s{0,3}(?:#{1,6}\s+|>\s+|[-*•]\s+|\d{1,2}[.)]\s+)', answer) \
            and not re.search(r'(\*\*|__|~~|`)', answer):
        return answer
    paragraphs = []
    for block in re.split(r'\n{2,}', answer):
        lines = []
        for line in block.split('\n'):
            kept = ' '.join(sentence for sentence in
                            (plain_sentence(s) for s in re.findall(r'[^.!?…]+[.!?…]*', line)
                             if not bot_line_in(s)) if sentence)
            if kept:
                lines.append(kept)
        paragraph = re.sub(r'\s+', ' ', ' '.join(lines)).strip()
        if paragraph:
            paragraphs.append(paragraph)
    return '\n\n'.join(paragraphs)


if csharp_patterns:
    check('E  a bot line is taken out and the rest of the answer is kept',
          in_her_voice('As an AI, I cannot browse the internet. But Darjeeling is beautiful in October.')
          == 'But Darjeeling is beautiful in October.')
    check('E  an answer that was nothing but bot lines comes back empty',
          in_her_voice('I am an AI model here to help.\n\nHow can I help you today?') == '')
    check('E  markdown furniture is taken off, the words stay',
          in_her_voice('**That** is _exactly_ it.') == 'That is exactly it.'
          and in_her_voice('- Tea first\n- Then the mountains') == 'Tea first Then the mountains')
    for line in HERS:
        check(f'E  a text that is already hers is untouched: {line[:34]}…', in_her_voice(line) == line)

# F
rules = prompt[prompt.find('public static readonly string StudioRules'):
               prompt.find('/// <summary>Collapses whitespace')]
for phrase in ('no \\"AI\\"', 'no \\"assistant\\"', 'no \\"chatbot\\"', 'no \\"language model\\"',
               'no \\"How can I help you today?\\"', 'no \\"Is there anything else?\\"',
               'no \\"Feel free to ask\\"', 'no \\"I hope this helps\\"',
               'no asterisks, no bold markers, no code'):
    check(f'F  the studio rules forbid {phrase}', phrase in rules)
check('F  the rules no longer open with "You are an AI model"',
      '"You are an AI model of the NeverBeen studio' not in rules)
check('F  the biography disclosure is in her own words',
      'are a NeverBeen model — not a woman in their city' in prompt
      and 'are an AI model who does not exist outside NeverBeen' not in prompt)

# G
check('G  the request accepts `language`', 'public AiChatLanguage? Language { get; set; }' in dtos)
check('G  the turn carries the visitor\'s language', 'AiChatLanguage? Language,' in prompt)
check('G  only a Romanised reading is taken', 'request.Language is { Romanised: true } sent' in prompt)
check('G  she is told to answer in it',
      'They are writing in ' in prompt and 'Answer in that same Romanised ' in prompt
      and 'never a word about the language' in prompt)
service = read(WEBSITE, 'src/app/services/ai-model-chat.service.ts')
body = service[service.find('const body'):]
body = body[:body.find('JSON.stringify(body)')]
check('G  the website sends it with every turn',
      re.search(r'\blanguage: language\?\.romanised', body) is not None)

# H
check('H  no database change',
      not any(f.startswith(('Models/', 'Data/', 'Migrations/')) or 'DbContext' in f for f in changed))
check('H  nothing in the patch looks like a Google API key',
      re.search(r'AIza[0-9A-Za-z_\-]{30,}', patch_text) is None)
check('H  the README documents the scrub and `language`',
      'InHerVoice' in readme and 'requirement L' in readme and '"language": {' in readme)

print()
print(f'{len(failures)} failure(s)' if failures else 'All checks passed.')
sys.exit(1 if failures else 0)
