from fastapi import APIRouter, Depends, HTTPException, status, Body, Response
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from core.dependencies import with_auth, RequireRole
from database import get_db
from schemas.certificate import CertificateResponse

router = APIRouter()


def get_certificates_collection():
    return get_db()["certificates"]


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
    db = get_db()

    # Check if already issued
    existing = await collection.find_one(
        {"userId": user_id, "hackathonId": hackathon_id}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Certificate already issued"
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

    hackathon = await db["hackathons"].find_one({"_id": ObjectId(hackathon_id)})
    if hackathon and str(hackathon.get("status", "")).lower() not in {
        "results announced",
        "completed",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Certificates can only be issued after the hackathon results are announced or completed.",
        )

    submission = await db["submissions"].find_one({"teamId": team_id})
    evaluations = await db["evaluations"].find_one({"teamId": team_id})
    if not submission or not evaluations:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Certificate issuance requires a valid submission and evaluation result for the team.",
        )

    cert_data = {
        "userId": user_id,
        "teamId": team_id,
        "hackathonId": hackathon_id,
        "certificateUrl": f"/api/certificates/view/{user_id}_{hackathon_id}",
        "issuedAt": datetime.utcnow(),
    }

    result = await collection.insert_one(cert_data)
    cert_data["_id"] = str(result.inserted_id)

    return CertificateResponse(**cert_data)


@router.get("/me", response_model=List[CertificateResponse])
async def get_my_certificates(current_user: dict = Depends(with_auth)):
    """Get all certificates for the current user"""
    collection = get_certificates_collection()
    cursor = collection.find({"userId": str(current_user["_id"])}).sort("issuedAt", -1)

    certs = await cursor.to_list(100)

    for c in certs:
        c["_id"] = str(c["_id"])

    return [CertificateResponse(**c) for c in certs]


@router.get("/{certificate_id}", response_model=CertificateResponse)
async def get_certificate(certificate_id: str):
    """Get certificate details"""
    collection = get_certificates_collection()
    cert = await collection.find_one({"_id": ObjectId(certificate_id)})
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found"
        )

    cert["_id"] = str(cert["_id"])
    return CertificateResponse(**cert)


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

    # Auto-seed if collection is empty
    if not certs:
        seed = [
            {
                "userId": "seed_u1",
                "teamId": "seed_t1",
                "hackathonId": "seed_h1",
                "certificateUrl": "#",
                "validationId": "CERT-SEED-001",
                "issuedAt": datetime.utcnow(),
                "status": "Issued",
                "recipientName": "Alex Johnson",
                "recipientEmail": "alex@example.com",
                "eventTitle": "Global AI Summit 2024",
                "certType": "Winner",
            }
        ]
        await certs_col.insert_many(seed)
        certs = await certs_col.find().to_list(200)

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
