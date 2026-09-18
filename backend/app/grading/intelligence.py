"""
Intelligence Engine — OHI, PRS, and all derived scores/insights.
Pure deterministic formulas — no LLM calls.
"""
from typing import Dict, List, Optional


def compute_ohi(stats: Dict) -> float:
    """
    Onion Health Index (0–100)
    Weighted composite of health indicators.
    OHI = 0.50 * healthy_pct + 0.20 * (100 - rotten_pct) + 0.15 * (100 - damaged_pct)
          + 0.10 * (100 - sprouted_pct) + 0.05 * (100 - undersized_pct)
    """
    h = stats.get("healthy_pct", 0.0)
    r = stats.get("rotten_pct", 0.0)
    d = stats.get("damaged_pct", 0.0)
    s = stats.get("sprouted_pct", 0.0)
    u = stats.get("undersized_pct", 0.0)
    ohi = (0.50 * h + 0.20 * (100 - r) + 0.15 * (100 - d)
           + 0.10 * (100 - s) + 0.05 * (100 - u))
    return round(max(0.0, min(100.0, ohi)), 1)


def compute_prs(stats: Dict, uniformity_score: float = 0.0, inspection_confidence: float = 0.0) -> float:
    """
    Procurement Readiness Score (0–100)
    Combines grade %, uniformity and inspection confidence.
    """
    grade_a = stats.get("grade_a_pct", 0.0)
    urs = stats.get("urs_pct", 0.0)
    reject = stats.get("reject_pct", 0.0)
    # Weighted: Grade A matters most, URS adds partial value, reject penalises heavily
    quality_component = (grade_a * 1.0 + urs * 0.4 - reject * 1.5)
    quality_component = max(0.0, min(100.0, quality_component))
    # Uniformity boost
    unif_boost = uniformity_score * 10.0
    # Confidence boost
    conf_boost = inspection_confidence * 5.0
    prs = quality_component * 0.80 + unif_boost + conf_boost
    return round(max(0.0, min(100.0, prs)), 1)


def compute_defect_severity_index(stats: Dict) -> float:
    """
    Defect Severity Index (0–100) — weighted severity of defects.
    Rotten is most severe, damaged/sprouted medium, undersized light.
    """
    total = stats.get("total_onions", 1) or 1
    rotten = stats.get("rotten_count", 0)
    damaged = stats.get("damaged_count", 0)
    sprouted = stats.get("sprouted_count", 0)
    undersized = stats.get("undersized_count", 0)
    weighted = (rotten * 1.0 + damaged * 0.6 + sprouted * 0.5 + undersized * 0.3)
    dsi = (weighted / total) * 100
    return round(max(0.0, min(100.0, dsi)), 1)


def compute_batch_uniformity_score(stats: Dict, uniformity_raw: float) -> float:
    """Normalise raw uniformity (0–1) to 0–100 score."""
    return round(uniformity_raw * 100, 1)


def compute_ai_confidence_meter(inspection_confidence: float) -> Dict:
    """Return structured confidence metadata with tier label."""
    pct = round(inspection_confidence * 100, 1)
    if pct >= 85:
        tier = "High"
        color = "green"
    elif pct >= 60:
        tier = "Medium"
        color = "yellow"
    else:
        tier = "Low"
        color = "red"
    return {"value": pct, "tier": tier, "color": color}


def compute_procurement_acceptance_predictor(prs: float, ohi: float, final_grade: str) -> Dict:
    """Predict acceptance probability and recommendation."""
    if final_grade == "A" and prs >= 75:
        probability = min(95, 60 + prs * 0.4)
        recommendation = "ACCEPT"
        confidence_label = "High"
    elif final_grade == "URS" or (prs >= 50 and ohi >= 60):
        probability = min(70, 30 + prs * 0.5)
        recommendation = "CONDITIONAL"
        confidence_label = "Medium"
    else:
        probability = max(5, prs * 0.3)
        recommendation = "REJECT"
        confidence_label = "Low"
    return {
        "acceptance_probability": round(probability, 1),
        "recommendation": recommendation,
        "confidence_label": confidence_label,
    }


def build_defect_narrative(stats: Dict, batch_code: str) -> str:
    """Generate a human-readable quality narrative."""
    grade = stats.get("final_grade", "N/A")
    healthy_pct = stats.get("healthy_pct", 0)
    rotten_pct = stats.get("rotten_pct", 0)
    damaged_pct = stats.get("damaged_pct", 0)
    sprouted_pct = stats.get("sprouted_pct", 0)
    undersized_pct = stats.get("undersized_pct", 0)
    total = stats.get("total_onions", 0)

    lines = [f"Batch {batch_code}: {total} onions inspected."]

    if grade == "A":
        lines.append(f"{healthy_pct:.1f}% healthy — batch meets Grade A standards.")
    elif grade == "URS":
        lines.append(f"Batch meets Under Reviewed Standard ({healthy_pct:.1f}% healthy).")
    else:
        lines.append("Batch does not meet minimum acceptance criteria.")

    issues = []
    if rotten_pct > 2:
        issues.append(f"{rotten_pct:.1f}% rotten (critical)")
    if damaged_pct > 5:
        issues.append(f"{damaged_pct:.1f}% physically damaged")
    if sprouted_pct > 3:
        issues.append(f"{sprouted_pct:.1f}% sprouted (shelf-life risk)")
    if undersized_pct > 4:
        issues.append(f"{undersized_pct:.1f}% undersized")

    if issues:
        lines.append("Key issues: " + "; ".join(issues) + ".")
    else:
        lines.append("No significant quality issues detected.")

    return " ".join(lines)


def build_sorting_advisor(stats: Dict) -> List[Dict]:
    """Return a prioritised list of sorting/action recommendations."""
    advice = []
    rotten_pct = stats.get("rotten_pct", 0)
    damaged_pct = stats.get("damaged_pct", 0)
    sprouted_pct = stats.get("sprouted_pct", 0)
    undersized_pct = stats.get("undersized_pct", 0)

    if rotten_pct > 2:
        advice.append({
            "priority": "Critical",
            "action": "Segregate rotten onions immediately",
            "reason": f"{rotten_pct:.1f}% rot detected — risk of cross-contamination",
            "color": "red",
        })
    if sprouted_pct > 3:
        advice.append({
            "priority": "High",
            "action": "Fast-track sprouted onions to processing",
            "reason": f"{sprouted_pct:.1f}% sprouted — reduced shelf life",
            "color": "orange",
        })
    if damaged_pct > 5:
        advice.append({
            "priority": "Medium",
            "action": "Route damaged onions to lower-grade channel",
            "reason": f"{damaged_pct:.1f}% physical damage",
            "color": "yellow",
        })
    if undersized_pct > 4:
        advice.append({
            "priority": "Low",
            "action": "Separate undersized — consider industrial processing",
            "reason": f"{undersized_pct:.1f}% below minimum size",
            "color": "purple",
        })
    if not advice:
        advice.append({
            "priority": "None",
            "action": "Standard processing — no immediate sorting required",
            "reason": "All metrics within acceptable limits",
            "color": "green",
        })
    return advice


def build_smart_rejection_analyzer(stats: Dict) -> Dict:
    """Analyse rejection causes and estimate losses."""
    total = stats.get("total_onions", 1) or 1
    reject_count = stats.get("reject_count", 0)
    rotten = stats.get("rotten_count", 0)
    damaged = stats.get("damaged_count", 0)
    sprouted = stats.get("sprouted_count", 0)
    undersized = stats.get("undersized_count", 0)

    causes = []
    if rotten:
        causes.append({"cause": "Rot/Disease", "count": rotten, "pct": round(rotten / total * 100, 1), "severity": "Critical"})
    if sprouted:
        causes.append({"cause": "Sprouting", "count": sprouted, "pct": round(sprouted / total * 100, 1), "severity": "High"})
    if damaged:
        causes.append({"cause": "Physical Damage", "count": damaged, "pct": round(damaged / total * 100, 1), "severity": "Medium"})
    if undersized:
        causes.append({"cause": "Undersized", "count": undersized, "pct": round(undersized / total * 100, 1), "severity": "Low"})

    total_defective = rotten + damaged + sprouted + undersized
    prevention_tips = []
    if rotten > 0:
        prevention_tips.append("Improve cold-chain storage conditions to reduce rot")
    if sprouted > 0:
        prevention_tips.append("Reduce storage temperature to slow sprouting")
    if damaged > 0:
        prevention_tips.append("Review handling/transport procedures to reduce physical damage")
    if undersized > 0:
        prevention_tips.append("Adjust harvest timing for larger bulb development")

    return {
        "total_rejected": total_defective,
        "rejection_pct": round(total_defective / total * 100, 1),
        "causes": causes,
        "prevention_tips": prevention_tips,
    }


def build_profit_maximizer(stats: Dict, price_per_kg_grade_a: float = 20.0,
                            price_per_kg_urs: float = 12.0, weight_per_onion_kg: float = 0.12) -> Dict:
    """Estimate revenue potential based on quality distribution."""
    total = stats.get("total_onions", 0)
    grade_a_count = stats.get("healthy_count", 0)
    urs_count = stats.get("damaged_count", 0) + stats.get("sprouted_count", 0) + stats.get("unknown_count", 0)
    reject_count = stats.get("rotten_count", 0) + stats.get("undersized_count", 0)

    rev_grade_a = grade_a_count * weight_per_onion_kg * price_per_kg_grade_a
    rev_urs = urs_count * weight_per_onion_kg * price_per_kg_urs
    rev_total = rev_grade_a + rev_urs

    # Potential if all Grade A
    potential_max = total * weight_per_onion_kg * price_per_kg_grade_a

    opportunity = potential_max - rev_total

    return {
        "revenue_estimate": round(rev_total, 2),
        "revenue_grade_a": round(rev_grade_a, 2),
        "revenue_urs": round(rev_urs, 2),
        "revenue_lost_to_rejects": round(reject_count * weight_per_onion_kg * price_per_kg_grade_a, 2),
        "max_potential_revenue": round(potential_max, 2),
        "improvement_opportunity": round(opportunity, 2),
        "utilisation_pct": round(rev_total / potential_max * 100, 1) if potential_max > 0 else 0,
        "price_per_kg_grade_a": price_per_kg_grade_a,
        "price_per_kg_urs": price_per_kg_urs,
        "currency": "INR",
    }


def build_quality_improvement_simulator(stats: Dict) -> List[Dict]:
    """
    Simulate how improving defect rates would affect grade/revenue.
    Returns scenarios as a list of dicts.
    """
    scenarios = []
    total = stats.get("total_onions", 1) or 1
    base_grade_a_pct = stats.get("grade_a_pct", 0)

    # Scenario 1: reduce rot by 50%
    rotten_reduction = stats.get("rotten_count", 0) * 0.5
    improved_healthy = stats.get("healthy_count", 0) + rotten_reduction
    sim_grade_a = round(improved_healthy / total * 100, 1)
    scenarios.append({
        "name": "Reduce Rot by 50%",
        "action": "Improve cold storage (2–4°C, 65–70% RH)",
        "base_grade_a": base_grade_a_pct,
        "simulated_grade_a": min(100.0, sim_grade_a),
        "gain": round(min(100.0, sim_grade_a) - base_grade_a_pct, 1),
    })

    # Scenario 2: eliminate sprouting
    sprouted = stats.get("sprouted_count", 0)
    sim_grade_a2 = round((stats.get("healthy_count", 0) + sprouted * 0.7) / total * 100, 1)
    scenarios.append({
        "name": "Reduce Sprouting by 70%",
        "action": "Apply CIPC inhibitor treatment at harvest",
        "base_grade_a": base_grade_a_pct,
        "simulated_grade_a": min(100.0, sim_grade_a2),
        "gain": round(min(100.0, sim_grade_a2) - base_grade_a_pct, 1),
    })

    # Scenario 3: reduce physical damage
    damaged = stats.get("damaged_count", 0)
    sim_grade_a3 = round((stats.get("healthy_count", 0) + damaged * 0.6) / total * 100, 1)
    scenarios.append({
        "name": "Reduce Handling Damage by 60%",
        "action": "Padded conveyor belts + drop-height limiters",
        "base_grade_a": base_grade_a_pct,
        "simulated_grade_a": min(100.0, sim_grade_a3),
        "gain": round(min(100.0, sim_grade_a3) - base_grade_a_pct, 1),
    })

    return scenarios


def build_dynamic_thresholds(stats: Dict, standard_defect_limits: Optional[Dict] = None) -> Dict:
    """
    Compare batch metrics against standard thresholds and flag exceedances.
    """
    limits = standard_defect_limits or {
        "damaged_pct": 5.0, "rotten_pct": 2.0,
        "sprouted_pct": 3.0, "undersized_pct": 4.0,
    }
    flags = {}
    for key, limit in limits.items():
        actual = stats.get(key, 0.0)
        flags[key] = {
            "actual": round(actual, 1),
            "limit": limit,
            "exceeded": actual > limit,
            "margin": round(limit - actual, 1),
        }
    return flags


def compute_all_intelligence(
    stats: Dict,
    batch_code: str,
    uniformity_score: float = 0.0,
    inspection_confidence: float = 0.0,
    standard_defect_limits: Optional[Dict] = None,
) -> Dict:
    """Compute the full intelligence suite for a completed batch."""
    ohi = compute_ohi(stats)
    prs = compute_prs(stats, uniformity_score, inspection_confidence)
    dsi = compute_defect_severity_index(stats)
    uniformity_norm = compute_batch_uniformity_score(stats, uniformity_score)
    confidence_meter = compute_ai_confidence_meter(inspection_confidence)
    acceptance = compute_procurement_acceptance_predictor(prs, ohi, stats.get("final_grade", "REJECT"))
    narrative = build_defect_narrative(stats, batch_code)
    sorting = build_sorting_advisor(stats)
    rejection = build_smart_rejection_analyzer(stats)
    profit = build_profit_maximizer(stats)
    simulator = build_quality_improvement_simulator(stats)
    thresholds = build_dynamic_thresholds(stats, standard_defect_limits)

    return {
        "ohi": ohi,
        "prs": prs,
        "defect_severity_index": dsi,
        "batch_uniformity_score": uniformity_norm,
        "ai_confidence_meter": confidence_meter,
        "procurement_acceptance": acceptance,
        "defect_narrative": narrative,
        "sorting_advisor": sorting,
        "smart_rejection_analyzer": rejection,
        "profit_maximizer": profit,
        "quality_improvement_simulator": simulator,
        "dynamic_thresholds": thresholds,
    }
