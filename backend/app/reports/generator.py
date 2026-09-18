"""
Report generation: PDF + QR code
"""
import os
import uuid
import qrcode
import io
from datetime import datetime
from typing import Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
from reportlab.lib.units import mm
from ..config import settings


def generate_qr_code(data: str, filename: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=8, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    path = os.path.join(settings.REPORTS_DIR, filename)
    img.save(path)
    return path


def generate_pdf_report(batch, onions, standard, verification_url: str) -> str:
    """Generate a professional PDF inspection report."""
    filename = f"report_{batch.batch_code}.pdf"
    path = os.path.join(settings.REPORTS_DIR, filename)

    doc = SimpleDocTemplate(path, pagesize=A4,
                             rightMargin=20*mm, leftMargin=20*mm,
                             topMargin=20*mm, bottomMargin=20*mm)
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle("title", parent=styles["Title"],
                                  fontSize=22, textColor=colors.HexColor("#1a3c5e"),
                                  spaceAfter=4)
    subtitle_style = ParagraphStyle("subtitle", parent=styles["Normal"],
                                     fontSize=10, textColor=colors.HexColor("#57606a"),
                                     spaceAfter=12)
    section_style = ParagraphStyle("section", parent=styles["Heading2"],
                                    fontSize=13, textColor=colors.HexColor("#1a3c5e"),
                                    spaceBefore=10, spaceAfter=4)
    label_style = ParagraphStyle("label", parent=styles["Normal"],
                                  fontSize=9, textColor=colors.HexColor("#57606a"))
    value_style = ParagraphStyle("value", parent=styles["Normal"],
                                  fontSize=11, textColor=colors.HexColor("#1f2328"))
    demo_style = ParagraphStyle("demo", parent=styles["Normal"],
                                 fontSize=9, textColor=colors.HexColor("#b45309"),
                                 backColor=colors.HexColor("#fef3c7"),
                                 borderPadding=4, spaceBefore=6)

    story = []

    # Header
    story.append(Paragraph("🧅 ONIONLENS 360", title_style))
    story.append(Paragraph("Digital Quality Inspection Report", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#3b82d4")))
    story.append(Spacer(1, 8*mm))

    if batch.is_demo:
        story.append(Paragraph("⚠ DEMO DATA — This report is generated from sample data. Not for commercial use.", demo_style))
        story.append(Spacer(1, 4*mm))

    # Batch meta
    story.append(Paragraph("Batch Information", section_style))
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    completed = batch.completed_at.strftime("%Y-%m-%d %H:%M:%S") if batch.completed_at else "In Progress"
    meta_data = [
        ["Batch ID", batch.batch_code],
        ["Inspection Date", completed],
        ["Inspection Mode", batch.inspection_mode.title()],
        ["Camera/Input Type", batch.camera_type or "Unknown"],
        ["Calibration", "Active (ArUco)" if batch.calibration_active else "Relative sizing only"],
        ["Standard", f"{standard.standard_name} {standard.standard_version}" if standard else "Default Demo Standard"],
        ["Status", batch.status.title()],
    ]
    t = Table(meta_data, colWidths=[55*mm, 110*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f7f8fa")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#57606a")),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#f7f8fa")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 6*mm))

    # Grade summary
    story.append(Paragraph("Grade Summary", section_style))
    grade_color = {"A": "#16a34a", "URS": "#ca8a04", "REJECT": "#dc2626"}.get(
        batch.final_grade or "REJECT", "#1f2328"
    )
    story.append(Paragraph(
        f"<font color='{grade_color}' size='20'><b>{batch.final_grade or 'N/A'}</b></font>",
        styles["Normal"]
    ))
    story.append(Spacer(1, 3*mm))

    grade_data = [
        ["Metric", "Value"],
        ["Total Onions Inspected", str(batch.total_onions)],
        ["Grade A %", f"{batch.grade_a_pct:.1f}%"],
        ["URS %", f"{batch.urs_pct:.1f}%"],
        ["Reject %", f"{batch.reject_pct:.1f}%"],
        ["Inspection Confidence", f"{batch.inspection_confidence:.1%}"],
        ["Batch Uniformity Score", f"{batch.uniformity_score:.1%}"],
    ]
    t2 = Table(grade_data, colWidths=[80*mm, 85*mm])
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a3c5e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f8fa")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ]))
    story.append(t2)
    story.append(Spacer(1, 6*mm))

    # Defect breakdown
    story.append(Paragraph("Defect Distribution", section_style))
    defect_data = [
        ["Category", "Count", "Percentage"],
        ["Healthy", str(batch.healthy_count), f"{batch.healthy_pct:.1f}%"],
        ["Damaged", str(batch.damaged_count), f"{batch.damaged_count/max(batch.total_onions,1)*100:.1f}%"],
        ["Rotten", str(batch.rotten_count), f"{batch.rotten_count/max(batch.total_onions,1)*100:.1f}%"],
        ["Sprouted", str(batch.sprouted_count), f"{batch.sprouted_count/max(batch.total_onions,1)*100:.1f}%"],
        ["Undersized", str(batch.undersized_count), f"{batch.undersized_count/max(batch.total_onions,1)*100:.1f}%"],
        ["Unknown", str(batch.unknown_count), f"{batch.unknown_count/max(batch.total_onions,1)*100:.1f}%"],
    ]
    t3 = Table(defect_data, colWidths=[60*mm, 40*mm, 65*mm])
    t3.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a3c5e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f8fa")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ]))
    story.append(t3)
    story.append(Spacer(1, 6*mm))

    # Model info
    story.append(Paragraph("Inspection Metadata", section_style))
    model_info = [
        ["AI/Model Version", "ONIONLENS CV v1.0 (Demo Inference Mode)" if batch.is_demo else "ONIONLENS CV v1.0"],
        ["Human Review Status", "Pending"],
        ["Verification URL", verification_url],
    ]
    t4 = Table(model_info, colWidths=[55*mm, 110*mm])
    t4.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f7f8fa")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#57606a")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t4)
    story.append(Spacer(1, 8*mm))

    # Footer
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb")))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(
        f"Generated by ONIONLENS 360 · {now} · DEMO STANDARD — Replace with official specification.",
        ParagraphStyle("footer", parent=styles["Normal"], fontSize=8,
                       textColor=colors.HexColor("#57606a"), alignment=1)
    ))

    doc.build(story)
    return path
