import json
from os import makedirs
from os.path import join, exists
from story_telling_agent.storytelling_agent import StoryAgent
from story_telling_agent.plan import Plan


def write(filename, data):
    with open(filename, "w") as f:
        f.write(data)

def read(filename):
    with open(filename, "r") as f:
        return f.read()


writer = StoryAgent("http://localhost:1234/v1", form="novel")
if not exists(join(".", "isekai")):
    makedirs(join(".", "isekai"))

if exists(join(".", "isekai", "book-spec-draft")):
  book_spec = read(join(".", "isekai", "book-spec-draft"))
else:
  _, book_spec = writer.init_book_spec("""
Title: The Glass Horizon
Genre: Speculative Fiction / Mystery Thriller
Target Audience: Adult (18+)
Word Count: 90,000–100,000 words
Tone and Style: Atmospheric, suspenseful, with lyrical prose and sharp dialogue

Concept:
In a near-future world where memories can be extracted, stored, and sold, The Glass Horizon follows Mara Voss, a "memory diver" — a specialist who retrieves lost memories from clients’ minds. When a high-profile politician hires her to recover a stolen memory that could expose a government conspiracy, Mara becomes entangled in a dangerous game of deception and betrayal.

As Mara navigates a city where memories are currency and truth is fluid, she discovers that someone is altering memories on a massive scale. The deeper she dives, the more uncertain she becomes about her own past — and the line between what she remembers and what she’s been made to forget.

Key Themes:

The fragility of memory and identity
The ethical dilemmas of technological advancement
Power, corruption, and the nature of truth
Unique Selling Points:

A fresh take on the classic noir detective story, set in a dystopian future
Strong, morally complex protagonist
A richly built world where science and emotion collide
""")
  write(join(".", "isekai", "book-spec-draft"), book_spec)

if exists(join(".", "isekai", "book-spec")):
  book_spec = read(join(".", "isekai", "book-spec"))
else:
  _, book_spec = writer.enhance_book_spec(book_spec)
  write(join(".", "isekai", "book-spec"), book_spec)

if exists(join(".", "isekai", "plan-draft.json")):
  plan = json.loads(read(join(".", "isekai", "plan-draft.json")))
else:
  _, plan = writer.create_plot_chapters(book_spec)
  write(join(".", "isekai", "plan-draft.json"), json.dumps(plan))

if exists(join(".", "isekai", "plan.json")):
  plan = json.loads(read(join(".", "isekai", "plan.json")))
else:
  _, plan = writer.enhance_plot_chapters(book_spec, plan)
  write(join(".", "isekai", "plan.json"), json.dumps(plan))

if exists(join(".", "isekai", "scenes.json")):
  plan = json.loads(read(join(".", "isekai", "scenes.json")))
else:
  _, plan = writer.split_chapters_into_scenes(plan)
  write(join(".", "isekai", "scenes.json"), json.dumps(plan))

form_text = []
for act_num, act in enumerate(plan):
    for ch_num, chapter in act["chapter_scenes"].items():

        chapter_path = join(".", "isekai", f"act_{act_num}", f"chapter_{ch_num}")
        if not exists(chapter_path):
            makedirs(chapter_path)

        sc_num = 1
        for scene in chapter:
            if exists(join(chapter_path, f"scene_{sc_num}.txt")):
                form_text.append(read(join(chapter_path, f"scene_{sc_num}.txt")))
            else:
                previous_scene = form_text[-1] if form_text else None
                _, generated_scene = writer.write_a_scene(
                    scene, sc_num, ch_num, plan, previous_scene=previous_scene
                )

                form_text.append(generated_scene)
                write(join(chapter_path, f"scene_{sc_num}.txt"), generated_scene)

            sc_num += 1
