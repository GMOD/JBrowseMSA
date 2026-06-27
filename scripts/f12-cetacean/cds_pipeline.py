#!/usr/bin/env python3
"""Build a frame-correct CDS alignment for F12 from the cactus241 bigMaf:
stitch each coding-exon window (trimmed to exact ref coords so frame is kept),
concatenate, reverse-complement to coding (minus-strand) orientation, then
translate in the human frame to look for premature stops / frameshifts in the
aquatic lineages — i.e. verify the pseudogenization story."""
import subprocess, sys, collections

BIGMAF = "http://hgdownload.soe.ucsc.edu/goldenPath/hg38/cactus241way/cactus241way.bigMaf"
CHROM = "chr5"
# coding-exon segments (exon ∩ CDS), genomic ascending order
CDS = [
    (177402291,177402459),(177402549,177402698),(177403253,177403397),
    (177403480,177403617),(177403858,177404090),(177404195,177404413),
    (177404498,177404664),(177404809,177404914),(177405053,177405185),
    (177405322,177405433),(177405734,177405805),(177405961,177406061),
    (177409045,177409103),(177409470,177409527),
]
SPECIES = [
    ("hg38","human"),("Hippopotamus_amphibius","hippo"),
    ("Balaenoptera_acutorostrata","minke_whale"),("Tursiops_truncatus","dolphin"),
    ("Delphinapterus_leucas","beluga"),("Neophocaena_asiaeorientalis","porpoise"),
    ("Trichechus_manatus","manatee"),("Enhydra_lutris","sea_otter"),
    ("Leptonychotes_weddellii","Weddell_seal"),("Bos_taurus","cow"),
    ("Sus_scrofa","pig"),("Vicugna_pacos","alpaca"),("Camelus_dromedarius","camel"),
    ("Equus_caballus","horse"),("Canis_lupus_familiaris","dog"),
    ("Loxodonta_africana","elephant"),("Mus_musculus","mouse"),
]
ids=[s[0] for s in SPECIES]; label=dict(SPECIES)

def stitch_window(s,e):
    raw=subprocess.run(["bigBedToBed",BIGMAF,"stdout",f"-chrom={CHROM}",
        f"-start={s}",f"-end={e}"],capture_output=True,text=True,check=True).stdout
    blocks=[]
    for line in raw.splitlines():
        p=line.split("\t")
        if len(p)<4: continue
        rows={}; ref_text=None; ref_start=None
        for tok in p[3].split(";"):
            tok=tok.strip()
            if not tok.startswith("s "): continue
            f=tok.split()
            if len(f)<7: continue
            sp=f[1].split(".")[0]; rows[sp]=f[6]
            if sp=="hg38": ref_text=f[6]; ref_start=int(f[2])
        if ref_text is None: continue
        # which columns fall inside [s,e) by ref coordinate (keep ref-gap cols
        # whose upcoming ref base is in-window so insertions are retained)
        keep=[]; refpos=ref_start
        for col,ch in enumerate(ref_text):
            coord=refpos
            if s<=coord<e: keep.append(col)
            if ch!='-': refpos+=1
        if not keep: continue
        L=len(ref_text)
        trimmed={sp:''.join(rows.get(sp,'-'*L)[c] for c in keep) for sp in ids}
        blocks.append((ref_start,trimmed,len(keep)))
    blocks.sort(key=lambda b:b[0])
    cat=collections.OrderedDict((i,[]) for i in ids)
    for _,tr,bl in blocks:
        for i in ids: cat[i].append(tr.get(i,'-'*bl))
    return {i:''.join(cat[i]) for i in ids}

# concatenate all CDS windows
full={i:'' for i in ids}
for (s,e) in CDS:
    w=stitch_window(s,e)
    for i in ids: full[i]+=w[i]

comp=str.maketrans("ACGTacgtNn-","TGCAtgcaNn-")
def revcomp(x): return x.translate(comp)[::-1]
coding={i:revcomp(full[i].upper()) for i in ids}
L=len(coding["hg38"])
print(f"CDS aln cols={L} (human ungapped={L-coding['hg38'].count('-')})",file=sys.stderr)

CODON={}
b="TTT TTC TTA TTG CTT CTC CTA CTG ATT ATC ATA ATG GTT GTC GTA GTG TCT TCC TCA TCG CCT CCC CCA CCG ACT ACC ACA ACG GCT GCC GCA GCG TAT TAC TAA TAG CAT CAC CAA CAG AAT AAC AAA AAG GAT GAC GAA GAG TGT TGC TGA TGG CGT CGC CGA CGG AGT AGC AGA AGG GGT GGC GGA GGG".split()
a="F F L L L L L L I I I M V V V V S S S S P P P P T T T T A A A A Y Y * * H H Q Q N N K K D D E E C C * W R R R R S S R R G G G G".split()
for k,v in zip(b,a): CODON[k]=v

# human frame: columns where human is non-gap, grouped into codons
hcols=[c for c in range(L) if coding["hg38"][c]!='-']
print("name           premStops frameshiftIndels  firstStopCodon",file=sys.stderr)
for i in ids:
    seq=coding[i]
    prot=[]
    for j in range(0,len(hcols)-2,3):
        cod=''.join(seq[hcols[j+k]] for k in range(3))
        prot.append(CODON.get(cod,'-' if cod=='---' else 'X'))
    p=''.join(prot)
    ncodons=len(p)
    # premature stop = '*' before the last codon
    stops=[k for k,aa in enumerate(p[:-1]) if aa=='*']
    # frameshift indels: gaps in this species vs human-frame not multiple of 3
    # (rough: count run-lengths of '-' in this row over human-nongap cols)
    row=''.join(seq[c] for c in hcols)
    fs=0; run=0
    for ch in row+'X':
        if ch=='-': run+=1
        else:
            if run and run%3!=0: fs+=1
            run=0
    print(f"{label[i]:14} {len(stops):9d} {fs:16d}  {stops[0] if stops else '-'}",file=sys.stderr)

# write coding-orientation FASTA
with open("f12_cds.afa","w") as fh:
    for i in ids:
        if set(coding[i])-set('-N'): fh.write(f">{label[i]}\n{coding[i]}\n")
print("wrote f12_cds.afa",file=sys.stderr)
