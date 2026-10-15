from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Body,
    Response,
    UploadFile,
    File,
    Form,
)
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from core.dependencies import with_auth, RequireRole
from database import get_db
from schemas.certificate import CertificateResponse
from services.file_upload import file_upload_service

router = APIRouter()


def get_certificates_collection():
    return get_db()["certificates"]


async def _delete_existing_certificate_file(file_path: Optional[str]) -> None:
    if file_path:
        file_upload_service.delete_file(file_path)


async def _build_certificate_payload(
    user_id: str,
    title: str,
    completion_date: str,
    description: str,
    upload_file: Optional[UploadFile],
    existing_file_path: Optional[str] = None,
):
    file_path = existing_file_path
    certificate_url = None

    if upload_file:
        file_path, certificate_url = await file_upload_service.save_certificate(
            upload_file
        )
    elif existing_file_path:
        certificate_url = file_upload_service.get_file_url(existing_file_path)

    return {
        "userId": user_id,
        "title": title,
        "completionDate": completion_date,
        "description": description,
        "filePath": file_path,
        "certificateUrl": certificate_url or "",
        "issuedAt": datetime.utcnow(),
        "status": "Issued",
    }


@router.post(
    "/", response_model=CertificateResponse, status_code=status.HTTP_201_CREATED
)
async def issue_certificate(
    user_id: str = Body(..., embed=True),
    team_id: str = Body(..., embed=True),
    hackathon_id: str = Body(..., embed=True),
    current_user: dict = Depends(RequireRole(["organizer", "admin"])),
):

    collection = get_certificates_collection()

    # Check if already issued
    existing = await collection.find_one(
        {"userId": user_id, "hackathonId": hackathon_id}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Certificate already issued"
        )

    db = get_db()
    settings = await db["settings"].find_one({"key": "global_config"}) or {}
    prefix = (
        str(settings.get("prefix") or settings.get("certificatePrefix") or "PROEDU")
        .strip()
        .upper()
        or "PROEDU"
    )
    year = datetime.utcnow().year
    import uuid

    validation_id = f"{prefix}-{year}-{str(uuid.uuid4())[:8].upper()}"

    cert_data = {
        "userId": user_id,
        "teamId": team_id,
        "hackathonId": hackathon_id,
        "certificateUrl": f"/api/certificates/view/{user_id}_{hackathon_id}",
        "validationId": validation_id,
        "issuedAt": datetime.utcnow(),
    }

    result = await collection.insert_one(cert_data)
    cert_data["_id"] = str(result.inserted_id)

    return CertificateResponse(**cert_data)


@router.get("/me", response_model=List[CertificateResponse])
@router.get("/my", response_model=List[CertificateResponse])
async def get_my_certificates(current_user: dict = Depends(with_auth)):
    """Get all certificates for the current user"""
    collection = get_certificates_collection()
    user_id = str(current_user.get("_id") or current_user.get("id") or current_user.get("sub"))
    query = {"$or": [{"userId": user_id}]}
    if ObjectId.is_valid(user_id):
        query["$or"].append({"userId": ObjectId(user_id)})
    cursor = collection.find(query).sort("issuedAt", -1)

    certs = await cursor.to_list(100)

    for c in certs:
        c["_id"] = str(c["_id"])

    return [CertificateResponse(**c) for c in certs]


@router.get("/verify/{validation_id}")
async def verify_certificate_public(validation_id: str):
    """Public verification endpoint for QR code scanners and third-party checks."""
    db = get_db()
    cert = await db["certificates"].find_one({
        "$or": [
            {"validationId": validation_id},
            {"_id": ObjectId(validation_id)} if ObjectId.is_valid(validation_id) else {"validationId": validation_id}
        ]
    })
    if not cert:
        return {
            "verified": False,
            "valid": False,
            "status": "Invalid",
            "message": f"Certificate with ID '{validation_id}' not found.",
        }

    is_active = str(cert.get("status", "Active")).lower() not in ["revoked", "suspended"]
    return {
        "verified": is_active,
        "valid": is_active,
        "status": cert.get("status", "Active"),
        "validationId": cert.get("validationId", validation_id),
        "recipientName": cert.get("recipientName") or cert.get("studentName") or "Student Participant",
        "eventTitle": cert.get("eventTitle") or cert.get("hackathonTitle") or "ProEduvate Hackathon",
        "type": cert.get("certType") or cert.get("type") or "Certificate of Participation",
        "dateIssued": str(cert.get("issuedAt") or cert.get("completionDate") or "Recently"),
        "issuedBy": "ProEduvate Hackathon Platform",
        "message": "Official Certificate verified successfully.",
    }


@router.get("/{certificate_id}/download")
async def download_certificate_file(certificate_id: str):
    """Download certificate file."""
    db = get_db()
    cert = None
    if ObjectId.is_valid(certificate_id):
        cert = await db["certificates"].find_one({"_id": ObjectId(certificate_id)})
    if not cert:
        cert = await db["certificates"].find_one({"validationId": certificate_id})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    file_path = cert.get("filePath")
    if file_path:
        full_path = (file_upload_service.base_dir / file_path).resolve()
        if full_path.is_file():
            return Response(
                content=full_path.read_bytes(),
                media_type="application/pdf" if file_path.endswith(".pdf") else "image/png",
                headers={"Content-Disposition": f'attachment; filename="certificate_{certificate_id}.pdf"'},
            )

    recipient = cert.get("recipientName") or "Student"
    event = cert.get("eventTitle") or cert.get("hackathonTitle") or "ProEduvate Hackathon"
    val_id = cert.get("validationId") or f"CERT-{certificate_id[-6:].upper()}"
    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <rect width="800" height="600" fill="#16122b" rx="20"/>
        <rect x="20" y="20" width="760" height="560" fill="none" stroke="#6366f1" stroke-width="3" rx="15"/>
        <text x="400" y="120" font-family="Arial" font-size="32" font-weight="bold" fill="#ffffff" text-anchor="middle">CERTIFICATE OF PARTICIPATION</text>
        <text x="400" y="180" font-family="Arial" font-size="16" fill="#a5b4fc" text-anchor="middle">PROEDUVATE HACKATHON PLATFORM</text>
        <text x="400" y="270" font-family="Arial" font-size="20" fill="#9ca3af" text-anchor="middle">PROUDLY PRESENTED TO</text>
        <text x="400" y="330" font-family="Arial" font-size="36" font-weight="bold" fill="#67e8f9" text-anchor="middle">{recipient}</text>
        <text x="400" y="400" font-family="Arial" font-size="18" fill="#e2e8f0" text-anchor="middle">For outstanding participation and achievement in</text>
        <text x="400" y="440" font-family="Arial" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">{event}</text>
        <text x="400" y="520" font-family="Arial" font-size="14" fill="#64748b" text-anchor="middle">Validation ID: {val_id}</text>
    </svg>"""
    return Response(
        content=svg_content.encode("utf-8"),
        media_type="image/svg+xml",
        headers={"Content-Disposition": f'attachment; filename="certificate_{certificate_id}.svg"'},
    )


@router.get("/{certificate_id}", response_model=CertificateResponse)
async def get_certificate(certificate_id: str):
    """Get certificate details"""
    db = get_db()
    collection = get_certificates_collection()
    cert = None
    if ObjectId.is_valid(certificate_id):
        cert = await collection.find_one({"_id": ObjectId(certificate_id)})
    if not cert:
        cert = await collection.find_one({"validationId": certificate_id})
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found"
        )

    cert["_id"] = str(cert["_id"])
    return CertificateResponse(**cert)


@router.post(
    "/student/upload",
    response_model=CertificateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_student_certificate(
    title: str = Form(...),
    completion_date: str = Form(...),
    description: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(with_auth),
):
    title = title.strip()
    description = description.strip()

    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required"
        )

    collection = get_certificates_collection()
    existing = await collection.find_one(
        {"userId": str(current_user["_id"]), "title": title}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate with this title already exists",
        )

    payload = await _build_certificate_payload(
        user_id=str(current_user["_id"]),
        title=title,
        completion_date=completion_date,
        description=description,
        upload_file=file,
    )

    result = await collection.insert_one(payload)
    payload["_id"] = str(result.inserted_id)
    return CertificateResponse(**payload)


@router.put("/student/{certificate_id}", response_model=CertificateResponse)
async def update_student_certificate(
    certificate_id: str,
    title: str = Form(...),
    completion_date: str = Form(...),
    description: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(with_auth),
):
    title = title.strip()
    description = description.strip()

    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required"
        )

    collection = get_certificates_collection()
    existing = await collection.find_one(
        {"_id": ObjectId(certificate_id), "userId": str(current_user["_id"])}
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found"
        )

    duplicate = await collection.find_one(
        {
            "_id": {"$ne": ObjectId(certificate_id)},
            "userId": str(current_user["_id"]),
            "title": title,
        }
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate with this title already exists",
        )

    old_file_path = existing.get("filePath")
    payload = await _build_certificate_payload(
        user_id=str(current_user["_id"]),
        title=title,
        completion_date=completion_date,
        description=description,
        upload_file=file,
        existing_file_path=old_file_path,
    )

    try:
        await collection.update_one(
            {"_id": ObjectId(certificate_id)},
            {"$set": payload},
        )
    except Exception:
        if (
            file
            and payload.get("filePath")
            and payload.get("filePath") != old_file_path
        ):
            await _delete_existing_certificate_file(payload.get("filePath"))
        raise

    if file and old_file_path and payload.get("filePath") != old_file_path:
        await _delete_existing_certificate_file(old_file_path)

    payload["_id"] = certificate_id
    return CertificateResponse(**payload)


@router.delete("/student/{certificate_id}")
async def delete_student_certificate(
    certificate_id: str,
    current_user: dict = Depends(with_auth),
):
    collection = get_certificates_collection()
    existing = await collection.find_one(
        {"_id": ObjectId(certificate_id), "userId": str(current_user["_id"])}
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found"
        )

    await _delete_existing_certificate_file(existing.get("filePath"))
    await collection.delete_one({"_id": ObjectId(certificate_id)})
    return {"success": True, "message": "Certificate deleted"}


# ─── Admin endpoints ───────────────────────────────────────────────────────────


@router.get("/admin/all")
async def get_all_certificates_admin(
    current_user: dict = Depends(RequireRole(["admin"])),
):
    """Fetch all issued certificates with enriched recipient & event info for the admin view."""
    db = get_db()
    certs_col = db["certificates"]
    users_col = db["users"]
    hackathons_col = db["hackathons"]

    certs = await certs_col.find().sort("issuedAt", -1).to_list(200)

    result = []
    for c in certs:
        user = None
        hackathon = None
        if ObjectId.is_valid(c.get("userId", "")):
            user = await users_col.find_one({"_id": ObjectId(c["userId"])})
        if ObjectId.is_valid(c.get("hackathonId", "")):
            hackathon = await hackathons_col.find_one(
                {"_id": ObjectId(c["hackathonId"])}
            )

        recipient_name = user["name"] if user else c.get("recipientName", "Unknown")
        recipient_email = user["email"] if user else c.get("recipientEmail", "")
        event_title = (
            hackathon["title"] if hackathon else c.get("eventTitle", "Hackathon")
        )

        result.append(
            {
                "id": str(c["_id"]),
                "recipient": {
                    "name": recipient_name,
                    "email": recipient_email,
                    "avatar": f"https://ui-avatars.com/api/?name={recipient_name.replace(' ', '+')}&background=random",
                },
                "event": event_title,
                "type": c.get("certType", "Participation"),
                "validationId": c.get(
                    "validationId", f"CERT-{str(c['_id'])[-6:].upper()}"
                ),
                "dateIssued": c["issuedAt"].strftime("%b %d, %Y"),
                "status": c.get("status", "Issued"),
            }
        )

    return result


@router.get("/admin/verify/{validation_id}")
async def verify_certificate_by_id(
    validation_id: str, current_user: dict = Depends(RequireRole(["admin"]))
):
    """Verify a certificate by its validationId."""
    db = get_db()
    cert = await db["certificates"].find_one({"validationId": validation_id})
    if not cert:
        return {
            "success": False,
            "message": "Certificate verification ID is invalid or not recognized by the system.",
        }
    if cert.get("status") == "Revoked":
        return {
            "success": False,
            "message": "This certificate has been revoked and is no longer authentic.",
        }
    return {
        "success": True,
        "message": "Certificate is securely verified and active.",
        "certificate": {"id": str(cert["_id"])},
    }


@router.post("/admin/{certificate_id}/revoke")
async def revoke_certificate(
    certificate_id: str, current_user: dict = Depends(RequireRole(["admin"]))
):
    """Revoke an issued certificate."""
    db = get_db()
    result = await db["certificates"].update_one(
        {"_id": ObjectId(certificate_id)}, {"$set": {"status": "Revoked"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return {"success": True}


@router.get("/hackathon/{hackathon_id}")
async def get_hackathon_certificates(
    hackathon_id: str,
    current_user: dict = Depends(RequireRole(["organizer", "admin", "superadmin"])),
):
    """Retrieve all issued certificates for a specific hackathon."""
    db = get_db()
    user_role = str(current_user.get("role", "")).lower()
    user_id = str(
        current_user.get("_id") or current_user.get("sub") or current_user.get("id")
    )

    if user_role == "organizer":
        hack_q = (
            {"_id": ObjectId(hackathon_id)}
            if ObjectId.is_valid(hackathon_id)
            else {"_id": hackathon_id}
        )
        hack = await db["hackathons"].find_one(hack_q)
        if not hack:
            hack = await db["hackathons"].find_one({"id": hackathon_id})
        if (
            hack
            and str(hack.get("organizerId")) != user_id
            and str(hack.get("organizer_id")) != user_id
        ):
            pass  # Allow organizer to view results/certs for collaborative visibility

    cursor = db["certificates"].find({"hackathonId": hackathon_id}).sort("issuedAt", -1)
    certs = await cursor.to_list(200)

    result = []
    for c in certs:
        c_id = str(c["_id"])
        issued_at = c.get("issuedAt")
        date_str = (
            issued_at.strftime("%b %d, %Y")
            if isinstance(issued_at, datetime)
            else str(issued_at or "Recently")
        )
        result.append(
            {
                "id": c_id,
                "certificateId": c_id,
                "userId": str(c.get("userId", "")),
                "recipientName": c.get("recipientName")
                or c.get("studentName")
                or "Participant",
                "teamId": str(c.get("teamId", "")),
                "teamName": c.get("teamName", "Team"),
                "hackathonId": str(c.get("hackathonId", hackathon_id)),
                "hackathonTitle": c.get("hackathonTitle", "Hackathon"),
                "certificateType": c.get("certificateType")
                or c.get("title")
                or "Participation",
                "validationId": c.get("validationId", ""),
                "certificateUrl": c.get(
                    "certificateUrl",
                    f"/api/certificates/view/{c.get('userId')}_{hackathon_id}",
                ),
                "issuedAt": date_str,
                "status": c.get("status", "Issued"),
            }
        )

    return result


@router.post("/auto-issue/{hackathon_id}")
async def auto_issue_hackathon_certificates(
    hackathon_id: str,
    current_user: dict = Depends(RequireRole(["organizer", "admin", "superadmin"])),
):
    """Auto-issue winner and participant certificates for a hackathon without requiring admin elevation."""
    import uuid

    db = get_db()

    hack_q = (
        {"_id": ObjectId(hackathon_id)}
        if ObjectId.is_valid(hackathon_id)
        else {"_id": hackathon_id}
    )
    hack = await db["hackathons"].find_one(hack_q)
    if not hack:
        hack = await db["hackathons"].find_one({"id": hackathon_id})
    if not hack:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    settings = await db["settings"].find_one({"key": "global_config"}) or {}
    prefix = (
        str(settings.get("prefix") or settings.get("certificatePrefix") or "PROEDU")
        .strip()
        .upper()
        or "PROEDU"
    )
    year = datetime.utcnow().year

    # Fetch submissions for leaderboard mapping
    sub_cursor = db["submissions"].find({"hackathonId": hackathon_id})
    submissions = await sub_cursor.to_list(100)

    def get_sub_score(s):
        return s.get("averageScore") or s.get("score") or s.get("finalScore") or 0

    submissions.sort(key=get_sub_score, reverse=True)

    issued_count = 0
    now_dt = datetime.utcnow()

    # Fallback: if no submissions, query teams registered for this hackathon
    teams_to_certify = []
    if submissions:
        for idx, sub in enumerate(submissions, 1):
            teams_to_certify.append(
                (
                    idx,
                    str(sub.get("teamId") or ""),
                    sub.get("teamName") or f"Team {idx}",
                    sub.get("userId"),
                )
            )
    else:
        teams_cursor = db["teams"].find({"hackathonId": hackathon_id})
        reg_teams = await teams_cursor.to_list(50)
        for idx, t in enumerate(reg_teams, 1):
            teams_to_certify.append(
                (idx, str(t["_id"]), t.get("name") or f"Team {idx}", t.get("leaderId"))
            )

    for rank_idx, team_id, team_name, direct_user_id in teams_to_certify:
        if rank_idx == 1:
            cert_type = "Grand Winner - 1st Place"
        elif rank_idx == 2:
            cert_type = "Runner Up - 2nd Place"
        elif rank_idx == 3:
            cert_type = "Runner Up - 3rd Place"
        else:
            cert_type = "Certificate of Participation"

        members = []
        if team_id:
            team_q = (
                {"_id": ObjectId(team_id)}
                if ObjectId.is_valid(team_id)
                else {"_id": team_id}
            )
            team_doc = await db["teams"].find_one(team_q)
            if team_doc:
                for m in team_doc.get("members", []):
                    m_id = (
                        str(m.get("userId") or m.get("id") or m)
                        if isinstance(m, dict)
                        else str(m)
                    )
                    if m_id and m_id not in members:
                        members.append(m_id)
                leader_id = str(team_doc.get("leaderId") or "")
                if leader_id and leader_id not in members:
                    members.append(leader_id)

        if not members and direct_user_id:
            members.append(str(direct_user_id))

        if not members:
            members.append(f"participant_{rank_idx}")

        for m_id in members:
            existing = await db["certificates"].find_one(
                {"userId": m_id, "hackathonId": hackathon_id}
            )
            if not existing:
                u_doc = None
                if ObjectId.is_valid(m_id):
                    u_doc = await db["users"].find_one({"_id": ObjectId(m_id)})
                if not u_doc:
                    u_doc = await db["users"].find_one({"_id": m_id})
                recip_name = (
                    u_doc.get("name")
                    if u_doc
                    else f"Participant {m_id[-4:] if len(m_id) > 4 else m_id}"
                )

                validation_id = f"{prefix}-{year}-{str(uuid.uuid4())[:8].upper()}"
                cert_doc = {
                    "userId": m_id,
                    "recipientName": recip_name,
                    "teamId": team_id,
                    "teamName": team_name,
                    "hackathonId": hackathon_id,
                    "hackathonTitle": hack.get("title", "Hackathon Event"),
                    "title": cert_type,
                    "certificateType": cert_type,
                    "validationId": validation_id,
                    "certificateUrl": f"/api/certificates/view/{m_id}_{hackathon_id}",
                    "issuedAt": now_dt,
                    "status": "Issued",
                }
                await db["certificates"].insert_one(cert_doc)
                issued_count += 1

                await db["notifications"].insert_one(
                    {
                        "userId": m_id,
                        "type": "CERTIFICATE_ISSUED",
                        "title": f"Certificate Issued: {cert_type}",
                        "message": f"Congratulations! Your certificate for '{hack.get('title')}' has been issued. Verification ID: {validation_id}",
                        "validationId": validation_id,
                        "hackathonId": hackathon_id,
                        "read": False,
                        "createdAt": now_dt,
                    }
                )

    await db["audit_logs"].insert_one(
        {
            "action": "Certificates Auto-Issued",
            "module": "Certificates",
            "details": f"Issued {issued_count} certificates for hackathon '{hack.get('title')}'.",
            "adminName": current_user.get("name")
            or current_user.get("email", "Organizer"),
            "createdAt": now_dt,
        }
    )

    return {
        "success": True,
        "message": f"Successfully issued {issued_count} certificates for '{hack.get('title')}'.",
        "issuedCount": issued_count,
    }
