"""
Standards / Grading Engine
Separates AI observations from grading logic.
Thresholds are configurable per Standard record.
"""
from typing import List, Dict, Optional


DEMO_STANDARD = {
    "standard_name": "DEMO Procurement Standard",
    "standard_version": "v1.0-DEMO",
    "description": "DEMO STANDARD — Replace with official procurement specification.",
    "is_demo": True,
    "defect_limits": {
        "damaged_pct": 5.0,
        "rotten_pct": 2.0,
        "sprouted_pct": 3.0,
        "undersized_pct": 4.0,
        "unknown_pct": 5.0,
    },
    "size_limits": {
        "min_size": "small",
        "preferred_sizes": ["medium", "large"],
    },
    "grade_rules": [
        {
            "grade": "A",
            "label": "Grade A",
            "min_healthy_pct": 90.0,
            "max_defect_pct": 5.0,
            "max_rotten_pct": 1.0,
            "description": "Premium quality — minimal defects, uniform sizing.",
        },
        {
            "grade": "URS",
            "label": "Under Reviewed Standard",
            "min_healthy_pct": 75.0,
            "max_defect_pct": 15.0,
            "max_rotten_pct": 5.0,
            "description": "Acceptable quality — some defects present.",
        },
        {
            "grade": "REJECT",
            "label": "Reject",
            "min_healthy_pct": 0.0,
            "max_defect_pct": 100.0,
            "max_rotten_pct": 100.0,
            "description": "Below minimum standard — not accepted.",
        },
    ],
}


def apply_grade_rules(stats: Dict, grade_rules: List[Dict]) -> Dict:
    """Apply grade rules top-down. First matching rule wins."""
    healthy_pct = stats.get("healthy_pct", 0.0)
    defect_pct = stats.get("defective_pct", 0.0)
    rotten_pct = stats.get("rotten_pct", 0.0)

    for rule in grade_rules:
        if (
            healthy_pct >= rule.get("min_healthy_pct", 0.0)
            and defect_pct <= rule.get("max_defect_pct", 100.0)
            and rotten_pct <= rule.get("max_rotten_pct", 100.0)
        ):
            return {
                "final_grade": rule["grade"],
                "grade_label": rule.get("label", rule["grade"]),
                "rule_matched": rule,
            }
    # Fallback
    return {
        "final_grade": "REJECT",
        "grade_label": "Reject",
        "rule_matched": grade_rules[-1] if grade_rules else {},
    }


def compute_batch_stats(onions: List[Dict], grade_rules: List[Dict]) -> Dict:
    """
    Given a list of onion detection dicts, compute batch-level statistics
    and apply grading rules.
    """
    total = len(onions)
    if total == 0:
        return {
            "total_onions": 0,
            "healthy_count": 0, "damaged_count": 0, "rotten_count": 0,
            "sprouted_count": 0, "undersized_count": 0, "unknown_count": 0,
            "reject_count": 0,
            "healthy_pct": 0.0, "defective_pct": 0.0,
            "grade_a_pct": 0.0, "urs_pct": 0.0, "reject_pct": 0.0,
            "final_grade": "REJECT",
            "uniformity_score": 0.0,
            "inspection_confidence": 0.0,
        }

    counts = {"healthy": 0, "damaged": 0, "rotten": 0, "sprouted": 0, "undersized": 0, "unknown": 0}
    for o in onions:
        cls = o.get("defect_class", "unknown").lower()
        if cls in counts:
            counts[cls] += 1
        else:
            counts["unknown"] += 1

    healthy_pct = counts["healthy"] / total * 100
    damaged_pct = counts["damaged"] / total * 100
    rotten_pct = counts["rotten"] / total * 100
    sprouted_pct = counts["sprouted"] / total * 100
    undersized_pct = counts["undersized"] / total * 100
    unknown_pct = counts["unknown"] / total * 100

    defective_pct = (counts["damaged"] + counts["rotten"] +
                     counts["sprouted"] + counts["undersized"]) / total * 100

    stats = {
        "total_onions": total,
        "healthy_count": counts["healthy"],
        "damaged_count": counts["damaged"],
        "rotten_count": counts["rotten"],
        "sprouted_count": counts["sprouted"],
        "undersized_count": counts["undersized"],
        "unknown_count": counts["unknown"],
        "reject_count": counts["rotten"] + counts["undersized"],
        "healthy_pct": round(healthy_pct, 2),
        "damaged_pct": round(damaged_pct, 2),
        "rotten_pct": round(rotten_pct, 2),
        "sprouted_pct": round(sprouted_pct, 2),
        "undersized_pct": round(undersized_pct, 2),
        "unknown_pct": round(unknown_pct, 2),
        "defective_pct": round(defective_pct, 2),
    }

    grade_result = apply_grade_rules(stats, grade_rules)
    stats.update(grade_result)

    # Grade A = healthy + acceptable defect
    # For simplicity: healthy → grade A, damaged/sprouted → URS, rotten/undersized → reject
    grade_a_count = counts["healthy"]
    urs_count = counts["damaged"] + counts["sprouted"] + counts["unknown"]
    reject_count = counts["rotten"] + counts["undersized"]

    stats["grade_a_pct"] = round(grade_a_count / total * 100, 2)
    stats["urs_pct"] = round(urs_count / total * 100, 2)
    stats["reject_pct"] = round(reject_count / total * 100, 2)

    # Uniformity: based on size consistency
    sizes = [o.get("size_category", "medium") for o in onions]
    if sizes:
        size_mode = max(set(sizes), key=sizes.count)
        uniformity = sizes.count(size_mode) / len(sizes)
        # Also factor in confidence consistency
        confidences = [o.get("inspection_confidence", 0.8) for o in onions]
        avg_conf = sum(confidences) / len(confidences)
        uniformity_score = round((uniformity * 0.6 + avg_conf * 0.4), 3)
    else:
        uniformity_score = 0.0

    stats["uniformity_score"] = uniformity_score

    # Batch inspection confidence = average of individual onion inspection confidences
    if onions:
        stats["inspection_confidence"] = round(
            sum(o.get("inspection_confidence", 0.8) for o in onions) / len(onions), 3
        )
    else:
        stats["inspection_confidence"] = 0.0

    return stats
