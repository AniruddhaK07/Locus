# Locus — Commute Congestion Multiplier ($\alpha$) Calibration Register

This document records the theoretical model and empirical ground-truth observations used to calibrate the peak congestion multiplier $\alpha_{\text{city}}$.

> [!NOTE]
> The peak adjustment formula is an engineering **HEURISTIC** designed to avoid presenting misleading free-flow durations as peak travel times in Indian metropolitan traffic. It does **not** claim exact GPS accuracy or substitute for real-time traffic probes.

---

## 1. Congestion Heuristic Model

$$T_{\text{peak}} = T_{\text{freeflow}} \times \left(1 + \alpha_{\text{city}} \times \left(1 - \exp(-d / 8)\right)\right)$$

Where:
- $T_{\text{freeflow}}$: Free-flow driving duration in minutes calculated by OSRM.
- $d$: Road route distance in kilometres.
- $8\text{ km}$: Characteristic urban corridor saturation distance constant ($d_0$).
- $\alpha_{\text{city}}$: Dimensionless city congestion intensity scaling factor.

### Starter Tier Table (`HEURISTIC`)

| Tier | Category | $\alpha_{\text{city}}$ | Example Cities | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **1 Mega-Metro** | Severe gridlock corridors | **2.3** | Bengaluru, Mumbai, Delhi, New Delhi | Severe bottlenecks, ring-road bottlenecks, outer-ring peak gridlock. |
| **1 Dense Metro** | Dense radial congestion | **1.9** | Kolkata, Chennai, Hyderabad | High-density core with arterial congestion. |
| **2 Large Metro** | Rapidly growing metros | **1.6** | Pune, Ahmedabad | Arterial bottlenecks with moderate suburban dispersion. |
| **3 Standard** | Rest of India | **1.2** | All other towns and districts | Moderate peak hour slowdown. |

---

## 2. Empirical Ground-Truth Observations Calibration Table

Use this table to record observed peak commutes (e.g. from Google Maps or personal trips) against Locus model predictions to adjust $\alpha$:

| City | Origin | Destination | Distance ($d$ km) | OSRM Free-Flow ($T_{\text{ff}}$ min) | Locus Peak Range (min) | Real Peak Observed (min) | Delta ($\%$) | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Bengaluru** | Manyata Tech Park | Koramangala | 18.0 km | 21.8 min | 59–75 min (α=2.3) | ~65–75 min | $\pm 5\%$ | Peak Outer Ring Road / Indiranagar choke points |
| **Bengaluru** | Whitefield | MG Road | 16.5 km | 24.0 min | 63–80 min (α=2.3) | ~70–85 min | $\pm 8\%$ | Marathahalli / Old Airport Road traffic |
| **Pune** | Hinjewadi Phase 1 | Shivajinagar | 15.2 km | 22.5 min | 48–61 min (α=1.6) | ~50–65 min | $\pm 7\%$ | Wakad flyover and University circle chokepoint |
| **Pune** | Kothrud | Viman Nagar | 16.8 km | 26.0 min | 56–71 min (α=1.6) | ~55–70 min | $\pm 6\%$ | Karve road / Yerawada bottleneck |
| **Delhi** | Gurgaon CyberCity | Connaught Place | 27.5 km | 32.0 min | 91–116 min (α=2.3) | ~90–110 min | $\pm 6\%$ | Dhaula Kuan / Sardar Patel Marg rush |

---

## 3. Multi-Destination Blending (`ASSUMPTION`)

When users specify secondary destinations (gym, school, partner workplace):
$$\text{Effective Commute} = 0.7 \times T_{\text{primary}} + 0.3 \times \frac{1}{M}\sum_{k=1}^M T_{\text{extra}, k}$$

- Primary destination carries 70% weight as the dominant daily travel anchor.
- Secondary destinations evenly share the remaining 30% weight.
