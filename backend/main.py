from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from datetime import datetime
import asyncio
import os
from pathlib import Path
from core.config import settings
from database import MongoDB
from routers import indexRoutes

# Get absolute path for uploads directory
BASE_DIR = Path(__file__).parent.resolve()
UPLOADS_DIR = BASE_DIR / "uploads"

# Create uploads directory if it doesn't exist
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
print(f"[Uploads] Directory: {UPLOADS_DIR}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await MongoDB.connect()
    except Exception as exc:
        print(f"[DB] MongoDB connection unavailable at startup: {exc}")
    reminder_task = None
    if MongoDB.db is not None:
        try:
            from services.mentor_dashboard_service import MentorDashboardService

            async def meeting_reminder_loop():
                while True:
                    try:
                        await MentorDashboardService.send_due_meeting_reminders()
                    except Exception as exc:
                        print(f"Meeting reminder worker error: {exc}")
                    await asyncio.sleep(60)

            reminder_task = asyncio.create_task(meeting_reminder_loop())
        except Exception as e:
            print(f"[Mentor Worker] Initializer note: {e}")

        try:
            # Clean up auto-injected mock team memberships so real student accounts only see their own real teams
            mock_team_ids = [
                "65e070000000000000000001",
                "65e070000000000000000002",
                "65e070000000000000000003",
            ]
            del_result = await MongoDB.db["teamMembers"].delete_many({
                "teamId": {"$in": mock_team_ids}
            })
            if del_result.deleted_count > 0:
                print(f"[Cleanup] Cleared {del_result.deleted_count} mock team memberships so students only see real teams.")
        except Exception as cleanup_err:
            print(f"[Cleanup notice]: {cleanup_err}")

        try:
            from seed_organizer_portal_data import seed_organizer_data_direct
            await seed_organizer_data_direct(MongoDB.db)
            print("[Auto-Seeder] Organizer portal workflow data verified/initialized on startup.")
        except Exception as seeder_err:
            print(f"[Auto-Seeder notice]: {seeder_err}")

        try:
            from bson import ObjectId
            from core.security import get_password_hash
            ananya_id = "6a70c0656425dafef71c73c1"

            # 1. Revert teams where Ananya was auto-assigned without an approved request
            await MongoDB.db["teams"].update_many(
                {
                    "mentorId": {"$in": [ananya_id, ObjectId(ananya_id)]},
                    "mentorRequestStatus": {"$ne": "approved"}
                },
                {
                    "$unset": {
                        "mentorId": "",
                        "mentorName": "",
                        "mentorAssignedAt": "",
                        "mentorAssignedBy": ""
                    },
                    "$set": {
                        "mentorRequestStatus": "pending",
                        "pendingMentorId": ananya_id,
                        "pendingMentorName": "Ananya Rao"
                    }
                }
            )

            # Clean up any leftover seeded mock applications and memberships for non-demo students
            try:
                demo_student_emails = [
                    "msailesh@gmail.com",
                    "sailesh.m@vitstudent.ac.in",
                    "sarath.g@abccollege.edu",
                    "gsgssarath2005@gmail.com",
                ]
                non_demo_students = await MongoDB.db["users"].find({
                    "role": {"$in": ["student", "Student", "STUDENT"]},
                    "email": {"$nin": demo_student_emails}
                }).to_list(300)

                mock_hackathons = [
                    "65e060000000000000000001",
                    "65e060000000000000000002",
                    "65e060000000000000000003",
                    ObjectId("65e060000000000000000001"),
                    ObjectId("65e060000000000000000002"),
                    ObjectId("65e060000000000000000003"),
                ]
                mock_team_ids = [
                    "65e070000000000000000001",
                    "65e070000000000000000002",
                    "65e070000000000000000003",
                    ObjectId("65e070000000000000000001"),
                    ObjectId("65e070000000000000000002"),
                    ObjectId("65e070000000000000000003"),
                ]
                mock_motivations = [
                    "Developing secure zero-knowledge transaction validator.",
                    "Implementing quantized computer vision models for low-power edge medical devices.",
                    "Building real-time smart grid power monitoring dashboard.",
                ]
                mock_teams = ["FinTech Velocity", "HealthAI NeuralCare", "EcoGrid Solvers"]

                for student in non_demo_students:
                    s_id = str(student["_id"])
                    s_email = student.get("email")
                    u_queries = [{"userId": s_id}]
                    if ObjectId.is_valid(s_id):
                        u_queries.append({"userId": ObjectId(s_id)})
                    if s_email:
                        u_queries.append({"userEmail": s_email})
                        u_queries.append({"email": s_email})

                    await MongoDB.db["applications"].delete_many({
                        "$and": [
                            {"$or": u_queries},
                            {
                                "$or": [
                                    {"motivation": {"$in": mock_motivations}},
                                    {"teamName": {"$in": mock_teams}},
                                    {"hackathonId": {"$in": mock_hackathons}},
                                ]
                            }
                        ]
                    })
                    await MongoDB.db["teamMembers"].delete_many({
                        "$and": [
                            {"$or": u_queries},
                            {"teamId": {"$in": mock_team_ids}}
                        ]
                    })
                    await MongoDB.db["certificates"].delete_many({
                        "$and": [
                            {"$or": [{"userId": s_id}, {"recipientEmail": s_email}, {"email": s_email}]},
                            {
                                "$or": [
                                    {"validationId": {"$regex": "^CERT-PRO-2026-(FT|HC)"}},
                                    {"eventTitle": {"$in": ["Global AI Pioneer Hackathon 2025", "National Cloud & Microservices Summit"]}}
                                ]
                            }
                        ]
                    })
                    await MongoDB.db["submissions"].delete_many({
                        "$and": [
                            {"$or": [{"userId": s_id}, {"teamId": {"$in": mock_team_ids}}]},
                            {"project": {"$in": ["NeuralPay - Real-Time Fraud Shield", "MedVision Edge AI"]}}
                        ]
                    })
            except Exception as startup_clean_err:
                print(f"[Lifespan Cleanup Notice]: {startup_clean_err}")

            # 2. Find or ensure student user Aadhi
            aadhi_user = await MongoDB.db["users"].find_one({
                "$or": [
                    {"email": {"$regex": "aadhi", "$options": "i"}},
                    {"name": {"$regex": "^aadhi$", "$options": "i"}}
                ]
            })
            if not aadhi_user:
                aadhi_doc = {
                    "name": "Aadhi",
                    "email": "aadhi@student.edu",
                    "password": get_password_hash("Password@123"),
                    "role": "student",
                    "is_active": True,
                    "createdAt": datetime.utcnow(),
                    "updatedAt": datetime.utcnow()
                }
                res = await MongoDB.db["users"].insert_one(aadhi_doc)
                aadhi_user = aadhi_doc
                aadhi_user["_id"] = res.inserted_id

            aadhi_id_str = str(aadhi_user["_id"])

            # 3. Find or ensure Aadhi's team
            aadhi_team = await MongoDB.db["teams"].find_one({
                "$or": [
                    {"leaderId": aadhi_id_str},
                    {"leaderId": aadhi_user["_id"]},
                    {"teamName": {"$regex": "aadhi", "$options": "i"}}
                ]
            })
            if not aadhi_team:
                team_doc = {
                    "teamName": "Aadhi Innovators",
                    "hackathonId": "65e050000000000000000001",
                    "domain": "AI & Cloud Systems",
                    "description": "Building high-performance scalable systems with edge microgrid telemetry.",
                    "leaderId": aadhi_id_str,
                    "leaderName": aadhi_user.get("name", "Aadhi"),
                    "status": "Active",
                    "mentorRequestStatus": "pending",
                    "pendingMentorId": ananya_id,
                    "pendingMentorName": "Ananya Rao",
                    "mentorRequestedAt": datetime.utcnow(),
                    "teamSize": 3,
                    "maxSize": 4,
                    "createdAt": datetime.utcnow(),
                    "updatedAt": datetime.utcnow(),
                }
                t_res = await MongoDB.db["teams"].insert_one(team_doc)
                aadhi_team = team_doc
                aadhi_team["_id"] = t_res.inserted_id
            else:
                await MongoDB.db["teams"].update_one(
                    {"_id": aadhi_team["_id"]},
                    {
                        "$unset": {
                            "mentorId": "",
                            "mentorName": "",
                            "mentorAssignedAt": "",
                            "mentorAssignedBy": ""
                        },
                        "$set": {
                            "mentorRequestStatus": "pending",
                            "pendingMentorId": ananya_id,
                            "pendingMentorName": "Ananya Rao",
                            "mentorRequestedAt": datetime.utcnow(),
                        }
                    }
                )

            team_id_str = str(aadhi_team["_id"])

            # Ensure leadership in teamMembers
            await MongoDB.db["teamMembers"].update_one(
                {"teamId": team_id_str, "userId": aadhi_id_str},
                {
                    "$set": {
                        "teamId": team_id_str,
                        "userId": aadhi_id_str,
                        "role": "leader",
                        "name": aadhi_user.get("name", "Aadhi"),
                        "email": aadhi_user.get("email"),
                        "joinedAt": datetime.utcnow(),
                    }
                },
                upsert=True
            )

            # 4. Upsert pending mentorRequest for Ananya
            await MongoDB.db["mentorRequests"].update_one(
                {"teamId": team_id_str, "mentorId": ananya_id},
                {
                    "$set": {
                        "teamId": team_id_str,
                        "teamName": aadhi_team.get("teamName", "Aadhi Innovators"),
                        "mentorId": ananya_id,
                        "mentorName": "Ananya Rao",
                        "leaderId": aadhi_id_str,
                        "leaderName": aadhi_user.get("name", "Aadhi"),
                        "focusArea": "Full-Stack Architecture & Cloud Deployment",
                        "message": "Requesting mentorship from Ananya Rao to review our project architecture, cloud pipeline, and code scalability.",
                        "description": "Building high-performance scalable systems with edge microgrid telemetry.",
                        "domain": "AI & Cloud Systems",
                        "memberCount": 3,
                        "requiredSkills": ["React", "FastAPI", "MongoDB", "Cloud"],
                        "preferredTimeWindow": "Weekdays (Evenings)",
                        "status": "pending",
                        "createdAt": datetime.utcnow(),
                        "updatedAt": datetime.utcnow(),
                    }
                },
                upsert=True
            )

            # 5. Add notification to Ananya inbox
            await MongoDB.db["inbox"].update_one(
                {"userId": ananya_id, "teamId": team_id_str, "type": "mentor_request"},
                {
                    "$set": {
                        "userId": ananya_id,
                        "teamId": team_id_str,
                        "type": "mentor_request",
                        "title": "New Mentorship Request from Aadhi",
                        "message": f"Team '{aadhi_team.get('teamName')}' has requested your mentorship. Review and accept in your Mentorship Requests section.",
                        "createdAt": datetime.utcnow(),
                        "read": False,
                    }
                },
                upsert=True
            )
            print("[Mentor Revert] Aadhi request to Ananya Rao reverted to pending state.")
        except Exception as mentor_revert_err:
            print(f"[Mentor Revert notice]: {mentor_revert_err}")
    yield
    if reminder_task:
        reminder_task.cancel()
        try:
            await reminder_task
        except asyncio.CancelledError:
            pass
    # Shutdown
    if MongoDB.client is not None:
        await MongoDB.disconnect()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    contact={
        "name": "ProEduvate Team",
        "email": "support@proeduvate.com",
    },
    license_info={
        "name": "Proprietary",
        "url": "https://proeduvate.com/license",
    },
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Total-Count"],
)

# Serve static files (uploads)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.include_router(indexRoutes.router, prefix="/api")


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    return {"message": "Welcome to ProEduvate Hackathon Platform"}


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "dependencies": {},
    }

    # Check MongoDB connection
    if MongoDB.db is not None:
        try:
            await MongoDB.get_db().command("ping")
            health_status["dependencies"]["mongodb"] = "connected"
        except Exception as e:
            health_status["dependencies"]["mongodb"] = "disconnected"
            health_status["status"] = "degraded"
            health_status["mongodb_error"] = str(e)
    else:
        health_status["dependencies"]["mongodb"] = "not-configured"
        health_status["status"] = "degraded"

    # Check uploads directory
    if UPLOADS_DIR.exists():
        health_status["dependencies"]["uploads_dir"] = "available"
    else:
        health_status["dependencies"]["uploads_dir"] = "missing"
        health_status["status"] = "degraded"

    return health_status


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """
    Handle HTTP exceptions with consistent error format
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.url.path,
            }
        },
        headers=exc.headers if hasattr(exc, "headers") else None,
    )


@app.exception_handler(500)
async def internal_server_error_handler(request, exc):
    """
    Handle internal server errors
    """
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": 500,
                "message": "Internal server error",
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.url.path,
                "detail": str(exc) if settings.DEBUG else "Contact support for details",
            }
        },
    )


if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 60)
    print("[STARTING] PROEDUVATE HACKATHON PLATFORM")
    print("=" * 60)
    print(f"App: {settings.APP_NAME}")
    print(f"Host: {settings.BACKEND_URL}")
    print(f"Docs: http://{settings.BACKEND_URL}/docs")
    print("=" * 60)

    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
