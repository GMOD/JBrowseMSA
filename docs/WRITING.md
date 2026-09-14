# Writing patterns to fix

Write plain technical English in ordinary declarative sentences. This checklist
names the habits this repo has had to rewrite, each with a pair taken from the
repo, so the fix is a shape to copy. It covers code comments, the captions in
`packages/examples/src/examples/catalog.ts`, tutorials, READMEs, agent-docs and
`CLAUDE.md`. The habits compound: one of them reads as a choice, and a page of
them reads as generated.

## A value given knowledge or a stance

A component may act: the parser rejects a file, the CLI warns, the viewer draws.
A value, a track, a file, a sequence or a figure is a thing being described, so
it knows nothing, says nothing, disagrees with nothing and earns nothing.

> A layer the alignment cannot know → ClinVar pathogenic variants per residue
>
> The boxes say the family is SH3 + SH2 + kinase; the arcs say how they pack →
> The boxes mark the SH3, SH2 and kinase domains, and the arcs mark residue
> pairs in contact between them.
>
> the height its frequency earns → a height proportional to its frequency

The same covers an artifact given a purpose: "the failure this layer exists to
avoid". The test: could the subject perform the verb if you ran the program? A
parser can reject; a column cannot know. When it could not, name the actor, or
use a verb of description (marks, contains, shows, is).

## A figure of speech where a literal word exists

For each verb or noun that is not literally true of its subject, ask what
literal word it stands for, and write that word. Keep a figure only when no
literal phrase exists or the field uses it as a term ("memory leak").

| Figure | Literal |
|---|---|
| earns its place | is needed, is used |
| buys the room | saves N characters |
| a one-way door | irreversible |
| rots, drifts | falls out of date when X changes |
| fight over it | both write it |
| the edge | the exception |
| a second door | a second entry point |
| reads loud / quiet | has high / low values |
| the dangerous shape | the case that breaks: name it |

## A cleft sentence

"X is what does Y" turns a plain verb into a verdict. Write the verb.

> column-locking is what stacks them → the overlay places domains by column,
> which lines them up
>
> the SIFTS mapping is what converts one into the other → the SIFTS mapping
> converts between them

## The point, the honest answer, the payoff

These words announce significance without adding a fact. Delete the announcement
and state the fact.

> which is the honest answer to the question it was asked → because
> AlphaMissense predicts whether a substitution breaks the fold, and sickle
> hemoglobin folds

## The viewer computes none of it

The rule that analysis happens outside the viewer belongs in `CLAUDE.md` and
`docs/layers.md`. A caption, a tutorial opening or an example comment that ends
by restating it carries no fact about the data on screen.

> Conservation says where this family has not changed; this says where changing
> it causes disease, and the viewer computes none of it. → The conservation
> track shows where the family has not changed, and the ClinVar track shows
> where a change causes disease.

## Dramatic negation

A sentence whose subject is "nothing", or a "not X's job", reads as a
pronouncement. Say what does happen.

> Nothing is prepared for the viewer → The example loads the URL on the InterPro
> entry page as is.
>
> Producing the file is not the viewer's job → `react-msaview-cli interpro`
> produces the file.

## Silently, quietly, invisibly

An adverb standing in for the mechanism of a failure. Name what the reader sees
instead, or drop the adverb.

> returning whichever came first would be the same class of wrong, quieter →
> returning the first match would place the highlight on a wrong residue with
> no error

## An aphorism opening or closing a section

A short balanced sentence that sounds like a conclusion and carries no fact.

> The snapshot is the API. → Every field below is a property of the `MsaView`
> model.
>
> Synthetic sequences, real overlay. → The sequences are synthetic, and the
> overlay is the one real data uses.

## Contrastive framing where the positive half says it

"X, not Y", "rather than", "instead of". Keep one only where the reader needs
the distinction to choose correctly: an option a reader would otherwise pick, a
fault that resembles another, a design record naming the option it declined.

> so it is tested rather than remembered → so a broken install line fails CI

Keep: "sniffs the format from the file's content, not its name", "all-atom
distance, not C-beta", "missing sequence" against "no domain annotated".

## A which-ladder

Each relative clause relabels the one before it. Split into sentences.

> a different alignment, which is a new model, which React spells `key` → A new
> `msa`, `tree` or `gff` needs a new model, so change the component's `key`.

## Density and padding

Removing a trope often adds a clause for the mechanism, and the sentence grows.
Give each fact its own sentence and break the paragraph where the subject
changes. Match a document's length to its facts: no overview repeating the
headings, no closing summary. A report or PR description leads with what changed
or what was found.

## Em-dash asides

One in a paragraph is punctuation; three is a writer avoiding sentence
boundaries. A ` -- ` in a code comment is the same habit. Promote one to its own
sentence, demote one to a comma. Tutorials use none.

## Bug history in a comment

"used to", "the previous shape", "Found on" describe how the code got here, and
that belongs in the commit message. The comment states the constraint the code
satisfies, with the measurement if there is one.

> a reset() mid-download used to leave "Downloading file" and a Cancel button
> behind → reset() also clears the download status

## Teaser headings

A heading or figure title that withholds its subject to create interest. Name
the subject.

> The four columns nobody else has → PRRA insert
>
> SIFTS is the step worth naming. → The SIFTS lookup matters most here, because
> a PDB entry numbers residues its own way.

## A fragment standing in for a sentence

A caption with no verb, or a bullet with a dropped subject.

> Does not make n=1600 finish. → The change does not make n=1600 finish.

## A pronoun opening a paragraph

A reader arriving by deep link has no antecedent for "It", "This" or "That".
Name the subject.

## Stock sentences

A caution or framing sentence repeated from page to page ("scaffolding for
reading the alignment rather than a result", "an opaque blob") reads as
boilerplate on the second page. Say it once and link to it.

## Small tics

"reads straight off", "story", "shape" as a general noun, "counterpoint",
"flagship", "crisp", "actually", ALL-CAPS emphasis in comments, and circular
sentences ("a MultipleAlignment is an alignment").

## What not to flatten

- **The claim.** A rewrite that changes what a sentence asserts is worse however
  plain it reads.
- **The measurement.** Numbers, accessions, coordinates, file paths and the
  names of mechanisms are the content. A prose pass moves sentences around them
  and changes none of them.
- **A term the tools use.** `--cut_ga`, `SS_cons`, WUSS, `relativeTo`.
- **An established idiom.** "travels in the link" and "the row reads threonine"
  recur across every page on purpose.
- **Generated prose.** `packages/lib/apidocs/*.md` comes from the doc comments
  in `model.ts` via docgen, and the live-link block in `docs/user_guide.md` comes
  from `scripts/screenshots/genGuideLinks.mjs`. Fix the source.
