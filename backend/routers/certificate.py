
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
import uuid

from core.dependencies import with_auth, RequireRole
from database import get_db
from schemas.certificate import CertificateResponse
from services.file_upload import file_upload_service

router = APIRouter()


def get_certificates_collection():
    return get_db()["certificates"]


def _user_id(current_user: dict) -> str:
    return str(
        current_user.get("_id")
        or current_user.get("sub")
        or current_user.get("id")
        or ""
    )


def _object_id_query(value: str):
    if ObjectId.is_valid(value):
        return {"_id": ObjectId(value)}
    return {"id": value}


async def _delete_existing_certificate_file(
    file_path: Optional[str],
) -> None:
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


def _certificate_settings(settings: dict):
    prefix = (
        str(
            settings.get("prefix")
            or settings.get("certificatePrefix")
            or "PROEDU"
        ).strip().upper()
        or "PROEDU"
    )
    year = datetime.utcnow().year
    validation_id = f"{prefix}-{year}-{str(uuid.uuid4())[:8].upper()}"
    return validation_id


@router.post(
    "/",
    response_model=CertificateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def issue_certificate(
    user_id: str = Body(..., embed=True),
    team_id: str = Body(..., embed=True),
    hackathon_id: str = Body(..., embed=True),
    current_user: dict = Depends(RequireRole(["organizer", "admin"])),
):
    db = get_db()
    collection = get_certificates_collection()

    if not ObjectId.is_valid(team_id) or not ObjectId.is_valid(hackathon_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid team or hackathon ID.",
        )

    existing = await collection.find_one(
        {"userId": user_id, "hackathonId": hackathon_id}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate already issued",
        )

    team = await db["teams"].find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found for certificate issuance.",
        )

    if str(team.get("hackathonId", "")) != str(hackathon_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team does not belong to the requested hackathon.",
        )

    hackathon = await db["hackathons"].find_one(
        {"_id": ObjectId(hackathon_id)}
    )
    if not hackathon:
        hackathon = await db["hackathons"].find_one(
            {"id": hackathon_id}
        )

    if not hackathon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hackathon not found.",
        )

    event_status = str(hackathon.get("status", "")).strip().lower()
    if event_status not in {"results announced", "completed"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Certificates can only be issued after results are "
                "announced or the hackathon is completed."
            ),
        )

    submission = await db["submissions"].find_one(
        {"teamId": team_id, "hackathonId": hackathon_id}
    )
    if not submission:
        submission = await db["submissions"].find_one(
            {"teamId": team_id}
        )

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Certificate issuance requires a submission from this team.",
        )

    evaluation_query = {"teamId": team_id}
    if submission.get("_id"):
        evaluation_query = {
            "$or": [
                {"teamId": team_id},
                {"submissionId": str(submission["_id"])},
                {"submissionId": submission["_id"]},
            ]
        }

    evaluation = await db["evaluations"].find_one(evaluation_query)
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Certificate issuance requires an evaluation result.",
        )

    settings = await db["settings"].find_one(
        {"key": "global_config"}
    ) or {}
    validation_id = _certificate_settings(settings)

    cert_data = {
        "userId": user_id,
        "teamId": team_id,
        "hackathonId": hackathon_id,
        "certificateUrl": f"/api/certificates/view/{user_id}_{hackathon_id}",
        "validationId": validation_id,
        "issuedAt": datetime.utcnow(),
        "status": "Issued",
    }

    result = await collection.insert_one(cert_data)
    cert_data["_id"] = str(result.inserted_id)

    return CertificateResponse(**cert_data)


@router.get("/me", response_model=List[CertificateResponse])
@router.get("/my", response_model=List[CertificateResponse])
async def get_my_certificates(
    current_user: dict = Depends(with_auth),
):
    """Get all certificates belonging to the current user."""
    collection = get_certificates_collection()
    user_id = _user_id(current_user)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to identify the authenticated user.",
        )

    user_values = [user_id]
    if ObjectId.is_valid(user_id):
        user_values.append(ObjectId(user_id))

    cursor = collection.find(
        {"userId": {"$in": user_values}}
    ).sort("issuedAt", -1)

    certs = await cursor.to_list(100)

    for cert in certs:
        cert["_id"] = str(cert["_id"])

    return [CertificateResponse(**cert) for cert in certs]


@router.get("/verify/{validation_id}")
async def verify_certificate_public(validation_id: str):
    """Public certificate verification endpoint."""
    db = get_db()

    cert = await db["certificates"].find_one(
        {"validationId": validation_id}
    )

    if not cert and ObjectId.is_valid(validation_id):
        cert = await db["certificates"].find_one(
            {"_id": ObjectId(validation_id)}
        )

    if not cert:
        return {
            "verified": False,
            "valid": False,
            "status": "Invalid",
            "message": f"Certificate with ID '{validation_id}' not found.",
        }

    cert_status = str(cert.get("status", "Issued"))
    is_active = cert_status.lower() not in {
        "revoked",
        "suspended",
        "invalid",
    }

    return {
        "verified": is_active,
        "valid": is_active,
        "status": cert_status,
        "validationId": cert.get("validationId", validation_id),
        "recipientName": (
            cert.get("recipientName")
            or cert.get("studentName")
            or "Student Participant"
        ),
        "eventTitle": (
            cert.get("eventTitle")
            or cert.get("hackathonTitle")
            or "ProEduvate Hackathon"
        ),
        "type": (
            cert.get("certType")
            or cert.get("certificateType")
            or cert.get("type")
            or "Certificate of Participation"
        ),
        "dateIssued": str(
            cert.get("issuedAt")
            or cert.get("completionDate")
            or "Recently"
        ),
        "issuedBy": "ProEduvate Hackathon Platform",
        "message": (
            "Official Certificate verified successfully."
            if is_active
            else "This certificate is no longer active."
        ),
    }


@router.get("/{certificate_id}/download")
async def download_certificate_file(certificate_id: str):
    """Download an uploaded certificate file or generated certificate SVG."""
    db = get_db()
    cert = None

    if ObjectId.is_valid(certificate_id):
        cert = await db["certificates"].find_one(
            {"_id": ObjectId(certificate_id)}
        )

    if not cert:
        cert = await db["certificates"].find_one(
            {"validationId": certificate_id}
        )

    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found",
        )

    file_path = cert.get("filePath")
    if file_path:
        full_path = (file_upload_service.base_dir / file_path).resolve()
        base_dir = file_upload_service.base_dir.resolve()

        if full_path.is_relative_to(base_dir) and full_path.is_file():
            media_type = (
                "application/pdf"
                if file_path.lower().endswith(".pdf")
                else "image/png"
            )
            extension = (
                ".pdf"
                if media_type == "application/pdf"
                else ".png"
            )
            return Response(
                content=full_path.read_bytes(),
                media_type=media_type,
                headers={
                    "Content-Disposition": (
                        f'attachment; filename="certificate_'
                        f'{certificate_id}{extension}"'
                    )
                },
            )

    recipient = str(cert.get("recipientName") or "Student")
    event = str(
        cert.get("eventTitle")
        or cert.get("hackathonTitle")
        or "ProEduvate Hackathon"
    )
    val_id = str(
        cert.get("validationId")
        or f"CERT-{certificate_id[-6:].upper()}"
    )

    # Escape text so stored values cannot inject SVG markup.
    from xml.sax.saxutils import escape

    recipient = escape(recipient)
    event = escape(event)
    val_id = escape(val_id)

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
        headers={
            "Content-Disposition": (
                f'attachment; filename="certificate_{certificate_id}.svg"'
            )
        },
    )


@router.get("/{certificate_id}", response_model=CertificateResponse)
async def get_certificate(certificate_id: str):
    """Get certificate details by MongoDB ID or validation ID."""
    collection = get_certificates_collection()
    cert = None

    if ObjectId.is_valid(certificate_id):
        cert = await collection.find_one(
            {"_id": ObjectId(certificate_id)}
        )

    if not cert:
        cert = await collection.find_one(
            {"validationId": certificate_id}
        )

    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found",
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
    user_id = _user_id(current_user)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to identify the authenticated user.",
        )

    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title is required",
        )

    collection = get_certificates_collection()
    existing = await collection.find_one(
        {"userId": user_id, "title": title}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate with this title already exists",
        )

    payload = await _build_certificate_payload(
        user_id=user_id,
        title=title,
        completion_date=completion_date,
        description=description,
        upload_file=file,
    )

    result = await collection.insert_one(payload)
    payload["_id"] = str(result.inserted_id)
    return CertificateResponse(**payload)


@router.put(
    "/student/{certificate_id}",
    response_model=CertificateResponse,
)
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
    user_id = _user_id(current_user)

    if not ObjectId.is_valid(certificate_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid certificate ID",
        )

    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title is required",
        )

    collection = get_certificates_collection()
    cert_object_id = ObjectId(certificate_id)

    existing = await collection.find_one(
        {"_id": cert_object_id, "userId": user_id}
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found",
        )

    duplicate = await collection.find_one(
        {
            "_id": {"$ne": cert_object_id},
            "userId": user_id,
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
        user_id=user_id,
        title=title,
        completion_date=completion_date,
        description=description,
        upload_file=file,
        existing_file_path=old_file_path,
    )

    try:
        await collection.update_one(
            {"_id": cert_object_id, "userId": user_id},
            {"$set": payload},
        )
    except Exception:
        if (
            file
            and payload.get("filePath")
            and payload.get("filePath") != old_file_path
        ):
            await _delete_existing_certificate_file(
                payload.get("filePath")
            )
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
    if not ObjectId.is_valid(certificate_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid certificate ID",
        )

    user_id = _user_id(current_user)
    cert_object_id = ObjectId(certificate_id)
    collection = get_certificates_collection()

    existing = await collection.find_one(
        {"_id": cert_object_id, "userId": user_id}
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found",
        )

    await _delete_existing_certificate_file(existing.get("filePath"))
    await collection.delete_one(
        {"_id": cert_object_id, "userId": user_id}
    )
    return {"success": True, "message": "Certificate deleted"}


# ─── Admin endpoints ──────────────────────────────────────────────────────────


@router.get("/admin/all")
async def get_all_certificates_admin(
    current_user: dict = Depends(RequireRole(["admin"])),
):
    """Fetch existing issued certificates for the admin view.

    This endpoint deliberately does not seed demo records when the
    certificates collection is empty.
    """
    db = get_db()
    certs_col = db["certificates"]
    users_col = db["users"]
    hackathons_col = db["hackathons"]

    certs = await certs_col.find().sort("issuedAt", -1).to_list(200)

    result = []
    for cert in certs:
        user = None
        hackathon = None

        user_id = str(cert.get("userId", ""))
        hackathon_id = str(cert.get("hackathonId", ""))

        if ObjectId.is_valid(user_id):
            user = await users_col.find_one(
                {"_id": ObjectId(user_id)}
            )
        if not user and user_id:
            user = await users_col.find_one({"_id": user_id})

        if ObjectId.is_valid(hackathon_id):
            hackathon = await hackathons_col.find_one(
                {"_id": ObjectId(hackathon_id)}
            )
        if not hackathon and hackathon_id:
            hackathon = await hackathons_col.find_one(
                {"id": hackathon_id}
            )

        recipient_name = (
            (user.get("name") or user.get("fullName"))
            if user
            else cert.get("recipientName", "Unknown")
        )
        recipient_email = (
            user.get("email", "")
            if user
            else cert.get("recipientEmail", "")
        )
        event_title = (
            hackathon.get("title", "Hackathon")
            if hackathon
            else cert.get("eventTitle")
            or cert.get("hackathonTitle", "Hackathon")
        )

        issued_at = cert.get("issuedAt")
        date_issued = (
            issued_at.strftime("%b %d, %Y")
            if isinstance(issued_at, datetime)
            else str(issued_at or "Recently")
        )

        result.append(
            {
                "id": str(cert["_id"]),
                "recipient": {
                    "name": recipient_name,
                    "email": recipient_email,
                    "avatar": (
                        "https://ui-avatars.com/api/?name="
                        f"{str(recipient_name).replace(' ', '+')}"
                    ),
                },
                "event": event_title,
                "type": (
                    cert.get("certType")
                    or cert.get("certificateType")
                    or cert.get("title")
                    or "Participation"
                ),
                "validationId": cert.get(
                    "validationId",
                    f"CERT-{str(cert['_id'])[-6:].upper()}",
                ),
                "dateIssued": date_issued,
                "status": cert.get("status", "Issued"),
            }
        )

    return result


@router.get("/admin/verify/{validation_id}")
async def verify_certificate_by_id(
    validation_id: str,
    current_user: dict = Depends(RequireRole(["admin"])),
):
    """Admin verification by validation ID."""
    db = get_db()
    cert = await db["certificates"].find_one(
        {"validationId": validation_id}
    )

    if not cert:
        return {
            "success": False,
            "message": (
                "Certificate verification ID is invalid or not "
                "recognized by the system."
            ),
        }

    if str(cert.get("status", "")).lower() in {
        "revoked",
        "suspended",
        "invalid",
    }:
        return {
            "success": False,
            "message": (
                "This certificate is no longer active or authentic."
            ),
        }

    return {
        "success": True,
        "message": "Certificate is securely verified and active.",
        "certificate": {"id": str(cert["_id"])},
    }


@router.post("/admin/{certificate_id}/revoke")
async def revoke_certificate(
    certificate_id: str,
    current_user: dict = Depends(RequireRole(["admin"])),
):
    """Revoke an issued certificate."""
    if not ObjectId.is_valid(certificate_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid certificate ID",
        )

    db = get_db()
    result = await db["certificates"].update_one(
        {"_id": ObjectId(certificate_id)},
        {"$set": {"status": "Revoked"}},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found",
        )

    return {"success": True}


@router.get("/hackathon/{hackathon_id}")
async def get_hackathon_certificates(
    hackathon_id: str,
    current_user: dict = Depends(
        RequireRole(["organizer", "admin", "superadmin"])
    ),
):
    """Retrieve issued certificates for a specific hackathon."""
    db = get_db()
    user_role = str(current_user.get("role", "")).lower()
    user_id = _user_id(current_user)

    hack = await db["hackathons"].find_one(
        _object_id_query(hackathon_id)
    )

    if not hack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hackathon not found",
        )

    if user_role == "organizer":
        owner_id = str(
            hack.get("organizerId")
            or hack.get("organizer_id")
            or ""
        )
        if owner_id and owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot access this hackathon's certificates.",
            )

    certs = await db["certificates"].find(
        {"hackathonId": hackathon_id}
    ).sort("issuedAt", -1).to_list(200)

    result = []
    for cert in certs:
        issued_at = cert.get("issuedAt")
        date_str = (
            issued_at.strftime("%b %d, %Y")
            if isinstance(issued_at, datetime)
            else str(issued_at or "Recently")
        )

        result.append(
            {
                "id": str(cert["_id"]),
                "certificateId": str(cert["_id"]),
                "userId": str(cert.get("userId", "")),
                "recipientName": (
                    cert.get("recipientName")
                    or cert.get("studentName")
                    or "Participant"
                ),
                "teamId": str(cert.get("teamId", "")),
                "teamName": cert.get("teamName", "Team"),
                "hackathonId": str(
                    cert.get("hackathonId", hackathon_id)
                ),
                "hackathonTitle": (
                    cert.get("hackathonTitle")
                    or hack.get("title")
                    or "Hackathon"
                ),
                "certificateType": (
                    cert.get("certificateType")
                    or cert.get("certType")
                    or cert.get("title")
                    or "Participation"
                ),
                "validationId": cert.get("validationId", ""),
                "certificateUrl": cert.get(
                    "certificateUrl",
                    f"/api/certificates/view/{cert.get('userId')}_{hackathon_id}",
                ),
                "issuedAt": date_str,
                "status": cert.get("status", "Issued"),
            }
        )

    return result


@router.post("/auto-issue/{hackathon_id}")
async def auto_issue_hackathon_certificates(
    hackathon_id: str,
    current_user: dict = Depends(
        RequireRole(["organizer", "admin", "superadmin"])
    ),
):
    """Issue certificates to real participants using submissions or teams."""
    db = get_db()

    hack = await db["hackathons"].find_one(
        _object_id_query(hackathon_id)
    )
    if not hack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hackathon not found",
        )

    event_status = str(hack.get("status", "")).strip().lower()
    if event_status not in {"results announced", "completed"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Certificates can only be issued after results are "
                "announced or the hackathon is completed."
            ),
        )

    settings = await db["settings"].find_one(
        {"key": "global_config"}
    ) or {}
    prefix = (
        str(
            settings.get("prefix")
            or settings.get("certificatePrefix")
            or "PROEDU"
        ).strip().upper()
        or "PROEDU"
    )
    year = datetime.utcnow().year

    submissions = await db["submissions"].find(
        {"hackathonId": hackathon_id}
    ).to_list(100)

    def get_sub_score(submission):
        return (
            submission.get("averageScore")
            or submission.get("score")
            or submission.get("finalScore")
            or 0
        )

    submissions.sort(key=get_sub_score, reverse=True)

    teams_to_certify = []
    if submissions:
        for index, submission in enumerate(submissions, 1):
            team_id = str(submission.get("teamId") or "")
            if team_id:
                teams_to_certify.append(
                    (
                        index,
                        team_id,
                        submission.get("teamName") or f"Team {index}",
                        submission.get("userId"),
                    )
                )
    else:
        teams = await db["teams"].find(
            {"hackathonId": hackathon_id}
        ).to_list(50)

        for index, team in enumerate(teams, 1):
            teams_to_certify.append(
                (
                    index,
                    str(team["_id"]),
                    team.get("teamName") or team.get("name") or f"Team {index}",
                    team.get("leaderId"),
                )
            )

    issued_count = 0
    now_dt = datetime.utcnow()

    for rank, team_id, team_name, direct_user_id in teams_to_certify:
        if rank == 1:
            cert_type = "Grand Winner - 1st Place"
        elif rank == 2:
            cert_type = "Runner Up - 2nd Place"
        elif rank == 3:
            cert_type = "Runner Up - 3rd Place"
        else:
            cert_type = "Certificate of Participation"

        team_query = _object_id_query(team_id)
        team_doc = await db["teams"].find_one(team_query)

        members = []
        if team_doc:
            for member in team_doc.get("members", []):
                if isinstance(member, dict):
                    member_id = str(
                        member.get("userId")
                        or member.get("id")
                        or ""
                    )
                else:
                    member_id = str(member)

                if member_id and member_id not in members:
                    members.append(member_id)

            leader_id = str(team_doc.get("leaderId") or "")
            if leader_id and leader_id not in members:
                members.append(leader_id)

        # Support existing teamMembers collection without inventing IDs.
        if not members:
            team_members = await db["teamMembers"].find(
                {"teamId": team_id}
            ).to_list(100)

            for member in team_members:
                member_id = str(member.get("userId") or "")
                if member_id and member_id not in members:
                    members.append(member_id)

        if not members and direct_user_id:
            members.append(str(direct_user_id))

        for member_id in members:
            existing = await db["certificates"].find_one(
                {
                    "userId": member_id,
                    "hackathonId": hackathon_id,
                }
            )
            if existing:
                continue

            user_doc = None
            if ObjectId.is_valid(member_id):
                user_doc = await db["users"].find_one(
                    {"_id": ObjectId(member_id)}
                )
            if not user_doc:
                user_doc = await db["users"].find_one(
                    {"_id": member_id}
                )

            recipient_name = (
                user_doc.get("name")
                or user_doc.get("fullName")
                if user_doc
                else "Participant"
            )

            validation_id = (
                f"{prefix}-{year}-{str(uuid.uuid4())[:8].upper()}"
            )
            cert_doc = {
                "userId": member_id,
                "recipientName": recipient_name,
                "teamId": team_id,
                "teamName": team_name,
                "hackathonId": hackathon_id,
                "hackathonTitle": hack.get("title", "Hackathon"),
                "title": cert_type,
                "certificateType": cert_type,
                "certType": cert_type,
                "validationId": validation_id,
                "certificateUrl": (
                    f"/api/certificates/view/{member_id}_{hackathon_id}"
                ),
                "issuedAt": now_dt,
                "status": "Issued",
            }

            await db["certificates"].insert_one(cert_doc)
            issued_count += 1

            await db["notifications"].insert_one(
                {
                    "userId": member_id,
                    "type": "CERTIFICATE_ISSUED",
                    "title": f"Certificate Issued: {cert_type}",
                    "message": (
                        f"Your certificate for '{hack.get('title')}' "
                        f"has been issued. Verification ID: {validation_id}"
                    ),
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
            "details": (
                f"Issued {issued_count} certificates for hackathon "
                f"'{hack.get('title')}'."
            ),
            "adminName": (
                current_user.get("name")
                or current_user.get("email")
                or "Organizer"
            ),
            "createdAt": now_dt,
        }
    )

    return {
        "success": True,
        "message": (
            f"Successfully issued {issued_count} certificates for "
            f"'{hack.get('title')}'."
        ),
        "issuedCount": issued_count,
    }
