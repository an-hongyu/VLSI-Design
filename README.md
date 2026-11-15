# VLSI Design

An open, interactive textbook on CMOS circuits and integrated-circuit design.

**Author:** Hongyu An  
**Status:** Chapter 1 is complete; subsequent chapters are planned.  
**Independence:** This book is separate from *Introduction to Neuromorphic Embodied AI*. No files from that repository are modified or used at runtime.

## Open the textbook

- Local preview: open [`index.html`](index.html) in a modern browser.
- Chapter 1: [`chapters/01-cmos-inverter.html`](chapters/01-cmos-inverter.html).
- Standalone interactive lab: [`labs/cmos-inverter.html`](labs/cmos-inverter.html).

All pages and graphics use local resources. The interactive lab requires no package installation, Python service, or external JavaScript CDN.

## Completed chapter

**Chapter 1 — CMOS Inverter:**

1. Pull-up and pull-down network operation
2. Voltage-transfer characteristic (VTC) and noise margins
3. Beta ratio and NMOS/PMOS transistor sizing
4. Numerical design example with directly substituted parameters
5. Mismatched strengths and switching-point shifts
6. Embedded interactive lab (separate input and output waveforms)
7. Introductory timing and dynamic-power concepts
8. Practice questions

The lab controls transistor geometry and other device parameters; it **does not** expose frequency or load-capacitance controls. The output is **open-circuit** in the sense of *no external output load*. It is a quasi-static idealized MOSFET model with finite channel-length modulation to make the VTC continuous; it does not simulate physical transient delays or claim zero parasitic capacitance.

## Book structure

```text
VLSI-Design/
├── index.html
├── chapters/
│   └── 01-cmos-inverter.html
├── labs/
│   └── cmos-inverter.html
├── assets/
│   └── book.css
├── .github/
│   └── workflows/
│       └── deploy.yml
├── tests/
│   └── test_book.py
├── AGENTS.md
├── CITATION.cff
├── LICENSE-TEXT.md
└── README.md
```

## Publish this as a separate GitHub repository

1. Create a **new public repository** named `VLSI-Design` in the `an-hongyu` GitHub account (do not select the existing Neuromorphic Embodied AI repository).
2. Upload the **contents** of this project directory to the new repository's `main` branch, preserving hidden `.github/` and `.nojekyll` files.
3. Under **Settings → Pages → Build and deployment**, select **GitHub Actions**.
4. The included `.github/workflows/deploy.yml` publishes the static textbook after a push to `main`.
5. The expected Pages address, once successfully deployed, is `https://an-hongyu.github.io/VLSI-Design/`.

This folder alone does not mean the GitHub repository or Pages deployment exists yet. Confirm deployment in GitHub **Actions** and then visit the Pages address.

## Local checks

```bash
python tests/test_book.py
python -m http.server 8000
```

Then open `http://localhost:8000/`.

## Roadmap

Chapter 2 — CMOS logic gates; Chapter 3 — Propagation delay and timing; Chapter 4 — Dynamic power; Chapter 5 — Sequential circuits; Chapter 6 — Physical design. These future chapters are **planned**, not implemented.

## Scientific caution

Numerical parameters are pedagogical examples and are not a calibrated PDK. The beta-ratio switching-threshold calculation uses a long-channel square-law approximation and assumes symmetric threshold voltage magnitudes. Noise margins require identifying VIL and VIH from the VTC; VM is not a substitute for those quantities.

## Attribution

Author: Hongyu An. See `CITATION.cff`. Draft textbook text may be reused under the CC BY 4.0 terms in `LICENSE-TEXT.md`; original code and interactive demonstrations under the MIT terms in `LICENSE-CODE.md`.

## Chapter 1 reference sources and illustrations
The CMOS Inverter chapter is based on textbook concepts from D. A. Neamen, *Microelectronics: Circuit Analysis and Design*, 4th ed., §16.3; R. J. Baker, *CMOS: Circuit Design, Layout, and Simulation*, 3rd ed., Ch. 11; and N. H. E. Weste and D. M. Harris, *CMOS VLSI Design: A Circuits and Systems Perspective*, 4th ed., §2.5. Five original SVG diagrams explain circuit operation, five operating regions, VTC, noise margins, and beta-ratio effects. No scanned copyrighted textbook figures or chapters are published.

The live experiment is embedded directly on both the [homepage](https://an-hongyu.github.io/VLSI-Design/#live-lab) and [Chapter 1](https://an-hongyu.github.io/VLSI-Design/chapters/01-cmos-inverter.html#lab), in addition to its [standalone lab page](https://an-hongyu.github.io/VLSI-Design/labs/cmos-inverter.html).
