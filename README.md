# VLSI Design
An independent interactive textbook by **Hongyu An**.
**Chapter 1 — CMOS Inverter:** pull-up/pull-down networks, VTC and noise margins, NMOS/PMOS sizing, worked 1.8 V example, mismatch, practice exercises and interactive experiment.

## Read online
- Book: https://an-hongyu.github.io/VLSI-Design/
- CMOS Inverter chapter: https://an-hongyu.github.io/VLSI-Design/chapters/01-cmos-inverter.html
- Interactive lab: https://an-hongyu.github.io/VLSI-Design/labs/cmos-inverter.html

The lab displays input and output waveforms in separate panels; no frequency/capacitance controls. "Open circuit" means no **external** output load, not zero intrinsic capacitance. The DC quasi-static model is educational and does not compute propagation delay.

## Publish
GitHub Pages deployment is automated via `.github/workflows/deploy.yml` on each push to `main`. If Pages has not yet been enabled in repository settings, select **Settings → Pages → Build and deployment → GitHub Actions**. Workflow history: https://github.com/an-hongyu/VLSI-Design/actions

## Local validation
`python tests/test_book.py`. You can serve locally using `python -m http.server 8000` and open `http://localhost:8000`.

This repository is fully separate from *Introduction to Neuromorphic Embodied AI*. Model parameters are illustrative, not PDK-calibrated silicon measurements.
